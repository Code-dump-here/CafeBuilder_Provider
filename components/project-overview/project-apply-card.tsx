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
  Pencil,
  Trash2,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useIsProjectOwner } from "@/features/projects/use-is-project-owner";
import { useCurrentUser } from "@/features/auth/user-context";
import { tokenStore } from "@/features/auth/token-store";
import {
  useProviderApplies,
  useWithdrawApplyMutation,
} from "@/features/projects/use-project-applications";
import {
  type ProjectDetail,
  type ProjectOpenForEntry,
  type ProjectOpenPost,
  type ProjectOpenPostServiceKind,
  type ProjectProviderStatus,
} from "@/features/projects/project-detail-types";
import { type ProviderCapability } from "@/features/auth/auth-me-types";

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
    // Open-ended posts carry no deadline — they can't be "earliest".
    const deadline = post.submissionDeadline;
    if (deadline === null) continue;
    const ts = deadline.getTime();
    if (!Number.isFinite(ts)) continue;
    if (best === null || ts < best.date.getTime()) {
      best = { date: deadline, post };
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
): ProjectOpenPostServiceKind[] {
  const seen = new Set<ProjectOpenPostServiceKind>();
  const result: ProjectOpenPostServiceKind[] = [];
  for (const entry of entries) {
    if (!seen.has(entry)) {
      seen.add(entry);
      result.push(entry);
    }
  }
  return result;
}

/**
 * Mirrors the backend's capability gate in `ApplyService.ApplyAsync`
 * exactly: `both` can apply to any post; `designer`/`constructor` can only
 * apply to a post of their own exact service kind — neither can apply to a
 * `both` post (only a `both`-capability provider can). Keep this in sync
 * with that check if the backend rule ever changes.
 */
function capabilityMatchesServiceKind(
  capability: ProviderCapability | undefined,
  serviceKind: ProjectOpenPostServiceKind,
): boolean {
  if (capability === "both") return true;
  if (capability === "designer") return serviceKind === "design";
  if (capability === "constructor") return serviceKind === "construction";
  return false;
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
 *   - viewer is already engaged on this project (their
 *     `serviceProvider.id` is listed in `project.providers[]` with a
 *     non-terminal status — they don't need to apply again),
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
  // Service kinds, not capabilities: this card labels what the owner is
  // hiring for (`design` / `construction` / `both`), which is the
  // `ServiceKind` vocabulary, not the `Capability` one.
  const tServiceKinds = useTranslations(
    "ProjectsOverview.members.contractTypes",
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
  //
  // `editing` reuses the same dialog in revise mode; `withdrawOpen` drives
  // the confirmation for the (irreversible) withdraw.
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);

  const withdraw = useWithdrawApplyMutation({
    onSuccessSideEffect: () => setWithdrawOpen(false),
    onErrorSideEffect: () => setWithdrawOpen(false),
  });

  const openPosts = project.openPosts.filter(isOpenPostOpen);
  const openForKinds = uniqueOpenFor(project.openFor);
  const postKinds = new Set<ProjectOpenPostServiceKind>(
    openPosts.map((p) => p.serviceKind),
  );
  const mergedKinds: ProjectOpenPostServiceKind[] = [
    ...openForKinds,
    ...(Array.from(postKinds) as ProjectOpenPostServiceKind[]),
  ];
  const kinds = uniqueOpenFor(mergedKinds);

  // Hide entirely when nothing to apply to. SSR-safe — `useIsProjectOwner`
  // returns `false` until hydration so we never briefly expose the CTA.
  if (openPosts.length === 0 && openForKinds.length === 0) return null;

  const summaryLabel = kindsLabel(kinds, tServiceKinds);

  // Pick the post to apply to: the earliest-deadline post the viewer's own
  // capability can actually apply to (mirrors the backend's capability gate
  // in ApplyService.ApplyAsync exactly — see capabilityMatchesServiceKind).
  // A project can have both a design post and a construction post open at
  // once; picking by deadline alone (the old behavior) could hand a
  // designer the construction post's id whenever it happened to close
  // sooner. Submitting against that id always 409s on the backend, and the
  // generic error-toast mapping showed "you already applied" — which is
  // wrong and made the failure look like success, so the application never
  // actually reached the owner.
  const viewerCapability = account?.serviceProvider?.capability;
  const applicablePosts = openPosts.filter((p) =>
    capabilityMatchesServiceKind(viewerCapability, p.serviceKind),
  );
  const earliest = earliestOpenDeadline(applicablePosts);
  const targetPost: ProjectOpenPost | null =
    earliest?.post ?? applicablePosts[0] ?? null;

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

  // Has the current provider already been engaged on this project? We
  // match `account.serviceProvider.id` against `project.providers[]` so
  // the "Apply" CTA disappears once the provider is on the team (e.g.
  // they accepted an invitation, or the owner accepted their bid).
  // Terminal statuses (`rejected`, `completed`, `terminated`) don't block
  // the CTA — the provider can re-apply if the project is still hiring.
  const viewerProfileId = account?.serviceProvider?.id;
  const activeProviderStatuses = new Set<ProjectProviderStatus>([
    "requested",
    "accepted",
  ]);
  const isAlreadyEngaged =
    isProvider &&
    typeof viewerProfileId === "number" &&
    project.providers.some(
      (p) =>
        p.providerId === viewerProfileId &&
        activeProviderStatuses.has(p.status),
    );

  if (isOwner || !isProvider || isAlreadyEngaged) return null;

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

    // Keys mirror the backend `ApplicationStatus` enum. There is no
    // `withdrawn` case: withdrawing hard-deletes the row, so a withdrawn
    // application disappears from the list rather than reaching this render.
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
    };

    const config = statusConfig[existingApply.status] ?? statusConfig.pending;
    const Icon = config.icon;

    // Revise / withdraw are only legal while the owner hasn't answered —
    // the server returns 409 otherwise, so don't offer the buttons at all.
    const canAmend = existingApply.status === "pending";

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
          <Icon className={cn("size-4", config.className)} aria-hidden />
          <span className={cn("text-sm", config.className)}>
            {config.label}
          </span>
        </div>

        {canAmend ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setEditing(true);
                setDialogOpen(true);
              }}
              disabled={withdraw.isPending}
            >
              <Pencil aria-hidden />
              {t("applied.edit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={() => setWithdrawOpen(true)}
              disabled={withdraw.isPending}
              aria-busy={withdraw.isPending}
            >
              <Trash2 aria-hidden />
              {t("applied.withdraw")}
            </Button>
          </div>
        ) : null}
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
          onOpenChange={(open) => {
            setDialogOpen(open);
            // Drop back to "create" mode on close so the next open of the
            // dialog from the Apply CTA isn't stuck editing a stale record.
            if (!open) setEditing(false);
          }}
          postId={targetPost.id}
          // The apply payload carries no provider id (the server reads the
          // JWT); this is the dialog's "do you have a provider profile?"
          // guard, so it must be the profile id, not the account id.
          providerId={viewerProfileId ?? 0}
          projectName={project.name}
          existingApply={editing ? existingApply ?? null : null}
        />
      ) : null}

      <AlertDialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("withdrawConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("withdrawConfirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdraw.isPending}>
              {t("withdrawConfirm.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // Keep the dialog mounted while the request is in flight so
                // the button can show its pending state; the mutation's
                // side-effects close it either way.
                event.preventDefault();
                if (existingApply) withdraw.mutate(existingApply.id);
              }}
              disabled={withdraw.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {withdraw.isPending
                ? t("withdrawConfirm.confirming")
                : t("withdrawConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  kinds: ProjectOpenPostServiceKind[],
  tServiceKinds: ReturnType<typeof useTranslations>,
): string {
  if (kinds.length === 0) return "";
  if (kinds.includes("both")) {
    return tServiceKinds("both");
  }
  // Keys mirror the `ServiceKind` members, so this lookup is total.
  return kinds.map((kind) => tServiceKinds(kind)).join(" · ");
}