"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  CircleDashed,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/user-context";
import {
  useRequestCompletionMutation,
  useTerminateEngagementMutation,
} from "@/features/projects/use-engagements";
import { getEngagementApi } from "@/features/projects/engagement-api";
import type { ProjectProvider } from "@/features/projects/project-detail-types";

// ─── Provider row actions (close collaboration) ─────────────────────────────

interface ProviderEngagementActionsProps {
  /** The provider row on the project detail; provides the engagement id. */
  provider: ProjectProvider;
}

type ProviderMutationKind = "request-completion" | "terminate" | null;

/**
 * Inline action bar for the provider-of-the-project row on `/projects/{id}`.
 *
 * Scope (per `a.md` decisions):
 *   - Web renders **provider** actions only. Owner-only CTAs (Nghiệm thu /
 *     Đóng dự án) live on mobile.
 *   - Shown when the viewer is the engaged provider AND the engagement
 *     has the lifecycle CTAs available (status === "accepted").
 *   - Hidden for everyone else so it never flashes for the wrong role.
 *
 * Buttons:
 *   - "Báo hoàn thành" → POST `/api/project-workings/{id}/request-completion`.
 *     Label switches to "Đang chờ nghiệm thu" once
 *     `engagement.isAwaitingAcceptance` is true; tapping it then updates
 *     the note (backend overwrites on each call).
 *   - "Huỷ ngang hợp tác" → POST `/api/project-workings/{id}/terminate`.
 *
 * The hook fetches the engagement detail (separate from the project
 * detail so backend-side state stays the source of truth for
 * `isAwaitingAcceptance`). If the fetch is in flight the row shows a
 * subtle skeleton + disables the buttons to avoid 409s on a stale state.
 */
export function ProviderEngagementActions({
  provider,
}: ProviderEngagementActionsProps) {
  const t = useTranslations("ProjectsOverview.members.providerActions");
  const tErrors = useTranslations("ProjectsOverview.members.providerActions.errors");
  const { account } = useCurrentUser();

  const viewerProfileId = account?.serviceProvider?.id ?? null;
  const isProvider = account?.role === "provider";
  const isViewerOnThisRow =
    isProvider &&
    typeof viewerProfileId === "number" &&
    provider.providerId === viewerProfileId;

  // Hide for owners, non-providers, providers not engaged here, or
  // engagements whose lifecycle has already closed.
  if (!isViewerOnThisRow) return null;
  if (provider.status !== "accepted") return null;

  return (
    <ProviderEngagementActionsInner
      engagementId={provider.projectWorkingId}
      t={t}
      tErrors={tErrors}
    />
  );
}

interface InnerProps {
  engagementId: number;
  t: ReturnType<typeof useTranslations<"ProjectsOverview.members.providerActions">>;
  tErrors: ReturnType<typeof useTranslations<"ProjectsOverview.members.providerActions.errors">>;
}

function ProviderEngagementActionsInner({
  engagementId,
  t,
  tErrors,
}: InnerProps) {
  // Pull the latest engagement so the button label reflects the
  // backend-computed `isAwaitingAcceptance` flag, not whatever was
  // snapshot on the project-detail cache.
  const { data: engagement, isLoading } = useQuery({
    queryKey: ["engagements", "detail", engagementId],
    queryFn: ({ signal }) => getEngagementApi(engagementId, { signal }),
    enabled: engagementId > 0,
    staleTime: 15_000,
  });

  const [pendingKind, setPendingKind] =
    React.useState<ProviderMutationKind>(null);

  const requestCompletion = useRequestCompletionMutation({
    onSuccessMessage: null,
    onErrorMessage: (err) => err.message || tErrors("requestCompletion"),
  });
  const terminate = useTerminateEngagementMutation({
    onSuccessMessage: null,
    onErrorMessage: (err) => err.message || tErrors("terminate"),
  });

  // Only `accepted` is actionable; both flags below drive label swaps.
  const showRequestCompletion =
    !!engagement &&
    engagement.hasConfirmedContract &&
    !engagement.isAwaitingAcceptance &&
    engagement.status === "accepted";

  const showAwaiting =
    !!engagement &&
    engagement.status === "accepted" &&
    engagement.isAwaitingAcceptance;

  function handleRequestCompletion() {
    if (!engagement) return;
    if (requestCompletion.isPending) return;
    setPendingKind("request-completion");
    requestCompletion.mutate(
      { engagementId: engagement.id, note: engagement.completionRequestNote ?? "" },
      {
        onSettled: () => setPendingKind(null),
        onSuccess: () => toast.success(t("requestCompletionSuccess")),
      },
    );
  }

  function handleTerminate() {
    if (!engagement) return;
    if (terminate.isPending) return;
    setPendingKind("terminate");
    terminate.mutate(
      { engagementId: engagement.id },
      {
        onSettled: () => setPendingKind(null),
        onSuccess: () => toast.success(t("terminateSuccess")),
      },
    );
  }

  if (isLoading && !engagement) {
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span
          aria-hidden
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/40 bg-card/40 px-1.5 py-1 text-[10px] text-muted-foreground"
        >
          <CircleDashed className="size-3 animate-spin" />
          {t("loading")}
        </span>
      </div>
    );
  }

  // The backend may briefly drop `hasConfirmedContract` while a contract
  // is mid-confirmation — guard against flashing the CTA in that window.
  if (!engagement || engagement.status !== "accepted") return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {showAwaiting ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
          <CircleDashed className="size-3" aria-hidden />
          {t("awaitingAcceptance")}
        </span>
      ) : showRequestCompletion ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 gap-1 px-2 text-[10px]"
          onClick={handleRequestCompletion}
          disabled={pendingKind !== null}
          aria-busy={pendingKind === "request-completion" || undefined}
        >
          {pendingKind === "request-completion" ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : null}
          {t("requestCompletion")}
        </Button>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-destructive"
        onClick={handleTerminate}
        disabled={pendingKind !== null}
        aria-busy={pendingKind === "terminate" || undefined}
      >
        {pendingKind === "terminate" ? (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        ) : (
          <XCircle className="size-3" aria-hidden />
        )}
        {t("terminate")}
      </Button>
    </div>
  );
}
