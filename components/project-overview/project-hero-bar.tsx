"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Printer,
  Share2,
  CircleDashed,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/features/auth/user-context";
import {
  useRequestCompletionMutation,
  useTerminateEngagementMutation,
} from "@/features/projects/use-engagements";
import { getEngagementApi } from "@/features/projects/engagement-api";
import { projectActionToast } from "./project-action-toast";
import type { ProjectDetail } from "@/features/projects/project-detail-types";

interface ProjectHeroBarProps {
  project: ProjectDetail;
}

/**
 * Provider action buttons shown in the hero bar for service providers
 * who are engaged on this project.
 */
interface ProviderHeroActionsProps {
  project: ProjectDetail;
}

function ProviderHeroActions({ project }: ProviderHeroActionsProps) {
  const t = useTranslations("ProjectsOverview.members.providerActions");
  const tErrors = useTranslations(
    "ProjectsOverview.members.providerActions.errors",
  );
  const { account } = useCurrentUser();

  // Find the provider engagement for this user
  const viewerProfileId = account?.serviceProvider?.id ?? null;
  const isProvider = account?.role === "provider";

  const myEngagement = React.useMemo(() => {
    if (!isProvider || viewerProfileId === null) return null;
    return (
      project.providers.find(
        (p) =>
          p.providerId === viewerProfileId &&
          p.status === "accepted" &&
          p.projectWorkingId !== "",
      ) ?? null
    );
  }, [project.providers, isProvider, viewerProfileId]);

  if (!myEngagement) return null;

  return (
    <ProviderEngagementHeroInner
      engagementId={myEngagement.projectWorkingId}
      t={t}
      tErrors={tErrors}
    />
  );
}

interface ProviderEngagementHeroInnerProps {
  engagementId: string;
  t: ReturnType<
    typeof useTranslations<"ProjectsOverview.members.providerActions">
  >;
  tErrors: ReturnType<
    typeof useTranslations<"ProjectsOverview.members.providerActions.errors">
  >;
}

function ProviderEngagementHeroInner({
  engagementId,
  t,
  tErrors,
}: ProviderEngagementHeroInnerProps) {
  const { data: engagement, isLoading } = useQuery({
    queryKey: ["engagements", "detail", engagementId],
    queryFn: ({ signal }) => getEngagementApi(engagementId, { signal }),
    enabled: engagementId !== "",
    staleTime: 15_000,
  });

  const [pendingKind, setPendingKind] = React.useState<
    "request-completion" | "terminate" | null
  >(null);

  const requestCompletion = useRequestCompletionMutation({
    onSuccessMessage: null,
    onErrorMessage: (err) => err.message || tErrors("requestCompletion"),
  });
  // No `onSuccessMessage` override: the hook picks between "ended" and
  // "request sent" by reading the engagement it gets back. This used to
  // suppress the hook's toast and unconditionally announce termination in
  // `handleTerminate`, which lied on the first tap.
  const terminate = useTerminateEngagementMutation({
    onErrorMessage: (err) => err.message || tErrors("terminate"),
  });

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
    if (!engagement || requestCompletion.isPending) return;
    setPendingKind("request-completion");
    requestCompletion.mutate(
      {
        engagementId: engagement.id,
        note: engagement.completionRequestNote ?? "",
      },
      {
        onSettled: () => setPendingKind(null),
        onSuccess: () => toast.success(t("requestCompletionSuccess")),
      },
    );
  }

  function handleTerminate() {
    if (!engagement || terminate.isPending) return;
    setPendingKind("terminate");
    terminate.mutate(
      { engagementId: engagement.id },
      { onSettled: () => setPendingKind(null) },
    );
  }

  if (isLoading && !engagement) return null;
  if (!engagement || engagement.status !== "accepted") return null;

  return (
    <>
      {showAwaiting ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
          <CircleDashed className="size-3" aria-hidden />
          {t("awaitingAcceptance")}
        </span>
      ) : showRequestCompletion ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleRequestCompletion}
          disabled={pendingKind !== null}
          aria-busy={pendingKind === "request-completion" || undefined}
        >
          {pendingKind === "request-completion" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <CircleDashed className="size-4" aria-hidden />
          )}
          {t("requestCompletion")}
        </Button>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="lg"
        onClick={handleTerminate}
        disabled={pendingKind !== null}
        aria-busy={pendingKind === "terminate" || undefined}
        className="text-muted-foreground hover:text-destructive"
      >
        {pendingKind === "terminate" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <XCircle className="size-4" aria-hidden />
        )}
        {t("terminate")}
      </Button>
    </>
  );
}

export function ProjectHeroBar({ project }: ProjectHeroBarProps) {
  const format = useFormatter();

  const formatDate = (value: Date) =>
    format.dateTime(value, { dateStyle: "medium" });

  const hasAnyDate =
    project.createdAt.getTime() !== 0 || project.updatedAt.getTime() !== 0;

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };
  const handleShare = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
        // Clipboard write may be denied (permissions / insecure context).
      }
      projectActionToast("Link copied to clipboard.");
    }
  };

  return (
    <header className="flex flex-col gap-3 border-b border-border/60 pb-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {project.name || "Project"}
          </h1>
          {hasAnyDate ? (
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              {project.createdAt.getTime() !== 0 ? (
                <span>
                  <span className="text-muted-foreground/80">Created: </span>
                  <span className="text-foreground">
                    {formatDate(project.createdAt)}
                  </span>
                </span>
              ) : null}
              {project.updatedAt.getTime() !== 0 ? (
                <span>
                  <span className="text-muted-foreground/80">Updated: </span>
                  <span className="text-foreground">
                    {formatDate(project.updatedAt)}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Project actions"
        >
          <ProviderHeroActions project={project} />
          <Separator
            orientation="vertical"
            className="mx-1 hidden h-6 sm:block"
          />
          <Button
            variant="outline"
            size="lg"
            onClick={handlePrint}
            aria-label="Print"
          >
            <Printer aria-hidden />
            Print
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleShare}
            aria-label="Share"
          >
            <Share2 aria-hidden />
            Share
          </Button>
        </div>
      </div>
    </header>
  );
}