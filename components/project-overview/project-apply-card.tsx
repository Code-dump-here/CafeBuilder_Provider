"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  CalendarClock,
  Send,
  Sparkles,
  CheckCircle,
  Clock,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { projectActionToast } from "./project-action-toast";
import { ApplyDialog } from "./apply-dialog";
import { useIsProjectOwner } from "@/lib/projects/use-is-project-owner";
import { useCurrentUser } from "@/lib/auth/user-context";
import { tokenStore } from "@/lib/auth/token-store";
import { useProviderApplies } from "@/lib/projects/use-project-applications";
import {
  type ProjectDetail,
  type ProjectOpenForEntry,
  type ProjectOpenPost,
  type ProjectOpenPostServiceKind,
} from "@/lib/projects/project-detail-types";

// ---------------------------------------------------------------------------
// Predicate helpers — keep the "is this project open for applications?"
// logic in one place so the card and any future mirrors stay in sync.

/**
 * `true` iff a given open post is actively accepting bids. The backend
 * uses the literal string `"open"`; we only know about that one for now
 * but stay defensive against future statuses like `"paused"`.
 */
function isOpenPostOpen(post: ProjectOpenPost): boolean {
  return post.status === "open";
}

/**
 * Pick the earliest deadline across all open posts. `null` when none of
 * the open posts has a parseable future deadline — the card then omits
 * the "Apply by" line entirely.
 */
function earliestOpenDeadline(
  posts: ProjectOpenPost[],
): { date: Date; post: ProjectOpenPost } | null {
  const open = posts.filter(isOpenPostOpen);
  if (open.length === 0) return null;
  let best: { date: Date; post: ProjectOpenPost } | null = null;
  for (const post of open) {
    const ts = post.submissionDeadline.getTime();
    if (!Number.isFinite(ts)) continue;
    if (best === null || ts < best.date.getTime()) {
      best = { date: post.submissionDeadline, post };
    }
  }
  return best;
}

/**
 * De-duplicate the service kinds the owner is still collecting bids on.
 * `["design", "both", "construction"]` collapses to `["design", "both",
 * "construction"]` (all three are semantically distinct), but `["both",
 * "both"]` collapses to `["both"]`.
 */
function uniqueOpenFor(
  entries: ProjectOpenForEntry[],
): ProjectOpenForServiceKind[] {
  const seen = new Set<ProjectOpenForServiceKind>();
  const result: ProjectOpenForServiceKind[] = [];
  for (const entry of entries) {
    if (!seen.has(entry)) {
      seen.add(entry);
      result.push(entry);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Card

interface ProjectApplyCardProps {
  project: ProjectDetail;
}

/**
 * Right-column "Apply to project" card for the project overview page.
 *
 * Visibility rule — renders nothing when ANY of:
 *   - viewer is the project owner (you don't apply to your own project),
 *   - there are no `openPosts` with status === "open",
 *   - `openFor` is empty.
 *
 * Reads `useIsProjectOwner` so the same source of truth drives both
 * "hide Invite" and "hide Apply".
 *
 * Content:
 *   - title + subtitle
 *   - a single line summarising the service kinds the owner is looking
 *     for, derived from `openFor` (deduped) and the open posts'
 *     `serviceKind`. If the union is "design + construction", we render
 *     a single "Design + Build" label instead of two chips — keeps the
 *     card compact.
 *   - "Apply by …" deadline line when there's an open post with a future
 *     deadline.
 *   - "Apply now" CTA — opens `<ApplyDialog>` so the user can fill in
 *     the proposal + estimated duration required by the apply API.
 */
export function ProjectApplyCard({ project }: ProjectApplyCardProps) {
  const t = useTranslations("ProjectsOverview.apply");
  const tCapabilities = useTranslations(
    "ProjectsOverview.members.capabilities",
  );
  const format = useFormatter();

  // Owner can't apply to their own project.
  const isOwner = useIsProjectOwner(project);

  // Current signed-in provider — required for the apply payload.
  // We use tokenStore to check if user has token (isHydrated equivalent)
  // and useCurrentUser for the actual account data.
  const hasToken = tokenStore.hasAccessToken();
  const { account } = useCurrentUser();

  // Fetch applies to check if provider has already applied to this project
  const projectId = Number(project.id);
  const { hasAppliedToPost, getApplyForPost, isLoading: isLoadingApplies } =
    useProviderApplies({
      projectShopOwnerId: projectId,
    });

  // The apply dialog collects `proposal` and `estimatedDurationDays` —
  // both required by the wire contract (`ApplyToPostPayload`). Keeping
  // dialog state in the card means the form is reset on close by the
  // dialog itself (`useEffect` on `open`).
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const openPosts = project.openPosts.filter(isOpenPostOpen);
  const openForKinds = uniqueOpenFor(project.openFor);
  const postKinds = new Set<ProjectOpenForServiceKind>(
    openPosts.map((p) => p.serviceKind),
  );
  const mergedKinds: ProjectOpenForServiceKind[] = [
    ...openForKinds,
    ...(Array.from(postKinds) as ProjectOpenForServiceKind[]),
  ];
  const kinds = uniqueOpenFor(mergedKinds);

  // Hide entirely when nothing to apply to. SSR-safe — `useIsProjectOwner`
  // returns `false` until hydration so we never briefly expose the CTA.
  if (openPosts.length === 0 && openForKinds.length === 0) return null;

  const earliest = earliestOpenDeadline(openPosts);

  const summaryLabel = kindsLabel(kinds, tCapabilities);

  // Pick the post to apply to: the earliest-deadline open post. Falls
  // back to the first open post when no deadline is parseable.
  const targetPost: ProjectOpenPost | null =
    earliest?.post ?? openPosts[0] ?? null;

  // Check if provider has already applied to the target post
  const existingApply = targetPost
    ? getApplyForPost(targetPost.id)
    : undefined;
  const hasAlreadyApplied = !!existingApply;

  // Can apply if: has token, has account, target post exists, and hasn't applied yet
  const canApply =
    hasToken &&
    account !== null &&
    account.id > 0 &&
    targetPost !== null &&
    !hasAlreadyApplied;

  // Hide for owners or non-providers. Keep the card visible for providers
  // who have already applied (to show their application status).
  const isProvider = account?.role === "provider";
  if (isOwner || !isProvider) return null;

  const handleApply = () => {
    if (!targetPost || !account) {
      projectActionToast(t("applyNotReady"));
      return;
    }

    setDialogOpen(true);
  };

  // Render "Already applied" state when provider has applied
  const renderAppliedState = () => {
    if (!hasAlreadyApplied || !existingApply) return null;

    const statusConfig = {
      pending: {
        icon: Clock,
        label: t("applied.pending"),
        className: "text-muted-foreground",
      },
      accepted: {
        icon: CheckCircle,
        label: t("applied.accepted"),
        className: "text-green-600",
      },
      rejected: {
        icon: CheckCircle,
        label: t("applied.rejected"),
        className: "text-destructive",
      },
      withdrawn: {
        icon: Clock,
        label: t("applied.pending"),
        className: "text-muted-foreground",
      },
    };

    const status = existingApply.status as keyof typeof statusConfig;
    const config = statusConfig[status] ?? statusConfig.pending;
    const Icon = config.icon;

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
          <Icon className={cn("size-4", config.className)} aria-hidden />
          <span className={cn("text-sm", config.className)}>
            {config.label}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card
        size="sm"
        aria-labelledby="project-apply-title"
        aria-describedby="project-apply-subtitle"
        className="border-border/60"
      >
        <CardHeader>
          <CardTitle
            id="project-apply-title"
            className="flex items-center gap-2 text-base"
          >
            <Sparkles className="size-4 text-primary" aria-hidden />
            {t("title")}
          </CardTitle>
          <CardDescription id="project-apply-subtitle">
            {t("subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-4 pt-0">
          <p className="text-xs text-muted-foreground">
            {t("lookingFor", { kinds: summaryLabel })}
          </p>

          {earliest ? (
            <>
              <Separator className="bg-border/60" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock
                  className="size-3.5 shrink-0"
                  aria-hidden
                />
                <span>
                  {t("applyBy", {
                    date: format.dateTime(earliest.date, {
                      dateStyle: "medium",
                    }),
                  })}
                </span>
              </div>
            </>
          ) : null}

          {hasAlreadyApplied ? (
            renderAppliedState()
          ) : (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="mt-1 w-full"
              onClick={handleApply}
              disabled={!canApply}
            >
              <Send aria-hidden />
              {t("apply")}
            </Button>
          )}
        </CardContent>
      </Card>

      {targetPost && account ? (
        <ApplyDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          postId={targetPost.id}
          providerId={account.id}
          projectName={project.name}
        />
      ) : null}
    </>
  );
}

/**
 * Format the set of service kinds the owner is open to.
 *   - "both" alone → "Design + Build"
 *   - "design" alone → "Design"
 *   - "construction" alone → "Construction"
 *   - any combination that includes "both" → "Design + Build" (because
 *     "both" subsumes the other two and showing both would be noisy)
 *   - otherwise list the kinds separated by " · "
 */
function kindsLabel(
  kinds: ProjectOpenForServiceKind[],
  tCapabilities: ReturnType<typeof useTranslations>,
): string {
  if (kinds.length === 0) return "";
  if (kinds.includes("both")) {
    return tCapabilities("both");
  }
  return kinds
    .map((kind) =>
      kind === "design"
        ? tCapabilities("design")
        : tCapabilities("construction"),
    )
    .join(" · ");
}