"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { AiRecommendationsList } from "@/components/design-brief/ai-recommendations-list";
import { BriefDetailsCard } from "@/components/design-brief/brief-details-card";
import { ProjectApplyCard } from "@/components/project-overview/project-apply-card";
import { ProjectMembersCard } from "@/components/project-overview/project-members-card";
import { ProjectOwnerCard } from "@/components/project-overview/project-owner-card";
import { QuickFactsCard } from "@/components/project-overview/quick-facts-card";
import { ContractorProjectQuickActions } from "@/components/project-overview/contractor-project-quick-actions";

import {
  useAiRecommendations,
} from "@/lib/projects/use-ai-recommendations";
import { useProjectDetail } from "@/lib/projects/use-project-detail";
import { useDesignBriefs } from "@/lib/projects/use-design-briefs";

// ---------------------------------------------------------------------------
// Page component
//
// Renders the combined project overview + design brief + AI iterations at
// `/[locale]/projects/[id]` — single page, three parallel API calls.
//
// Data flow:
//   1. `useParams` picks up the `[id]` segment.
//   2. `useProjectDetail(id)` calls `GET /api/project-shop-owners/{id}` (the axios
//      interceptor attaches the Bearer access token from `tokenStore`).
//   3. `useDesignBriefs({ projectId })` calls
//      `GET /api/design-briefs?projectId={id}&pageNumber=1&pageSize=10`.
//   4. `useAiRecommendations({ briefId })` (enabled only after the brief
//      resolves) calls
//      `GET /api/ai-recommendations?briefId={id}&pageNumber=1&pageSize=10`.
//   5. While the project or brief is loading, render skeleton shells so
//      the page doesn't jump. AI recs have their own inline skeleton
//      because they're a separate dependent request.
//   6. On error, render an alert with a Retry CTA wired to refetch
//      whatever failed (project + brief + recs).
//   7. On success, render the hero (in the layout), the brief details
//      card (left column), the AI iterations list (under the brief),
//      and the right-column stack:
//        Quick Facts → Owner → Apply → Providers

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id ?? "";

  const {
    project,
    isLoading: isLoadingProject,
    isFetching: isFetchingProject,
    isError: isProjectError,
    error: projectError,
    refetch: refetchProject,
  } = useProjectDetail(projectIdParam);

  const {
    data: briefData,
    isLoading: isLoadingBrief,
    isFetching: isFetchingBrief,
    isError: isBriefError,
    error: briefError,
    refetch: refetchBrief,
  } = useDesignBriefs({ projectId: projectIdParam });

  // Pick the latest brief by `updatedAt` desc — defensive against any
  // backend ordering change.
  const brief = React.useMemo(() => {
    if (briefData.items.length === 0) return null;
    return [...briefData.items].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    )[0];
  }, [briefData.items]);

  // AI recs only fire once we know which brief to ask about. Pass `null`
  // while the brief is still loading — the hook keeps the query idle.
  const {
    data: aiData,
    isLoading: isLoadingAi,
    isFetching: isFetchingAi,
    isError: isAiError,
    error: aiError,
    refetch: refetchAi,
  } = useAiRecommendations({ briefId: brief?.id ?? null });

  if (isProjectError || isBriefError || isAiError) {
    const message =
      projectError?.message ??
      briefError?.message ??
      aiError?.message ??
      "Failed to load this project.";
    return (
      <ErrorState
        message={message}
        onRetry={() => {
          void refetchProject();
          void refetchBrief();
          void refetchAi();
        }}
      />
    );
  }

  const isInitialLoading = isLoadingProject || isLoadingBrief;

  return (
    <div className="flex flex-col gap-6">
      {isInitialLoading ? (
        <PageLoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Left column — brief input (top) + AI Design Iterations (below) */}
          <div className="flex flex-col gap-4 md:col-span-2">
            {brief ? <BriefDetailsCard brief={brief} /> : <NoBriefState />}

            {/* AI Design Iterations — stacked directly below the brief in the
                left column. Only present when we have a brief to scope
                against. When the brief is missing or the recs are still
                loading we render an inline skeleton so the section doesn't
                pop in suddenly after the rest of the page settles. */}
            {brief ? (
              isLoadingAi ? (
                <AiRecommendationsSkeleton />
              ) : (
                <AiRecommendationsList recommendations={aiData.items} />
              )
            ) : null}
          </div>

          {/* Right column — Quick Facts (top) → Owner → Apply → Members/Providers */}
          <div className="flex flex-col gap-4 md:col-span-1">
            <QuickFactsCard project={project} />

            {/* Owner card — the person behind the project. Sits between
                Quick Facts and Providers so the right rail reads
                "facts → who → who's working on it". Renders nothing if
                the API hasn't populated `project.owner` yet. */}
            <ProjectOwnerCard project={project} />

            {/* Apply card — shown only when the project is actively
                collecting bids (open posts / openFor) AND the viewer
                isn't the owner themselves. Rendered between Owner and
                Providers so the natural reading order is
                "facts → who → act on it → who's working on it". */}
            <ProjectApplyCard project={project} />

            {/* Providers card — owner + collaborators. Right under the
                Owner so the right rail stays a self-contained
                "project at a glance" stack. */}
            <ProjectMembersCard project={project} />

            {/* Contractor-style "Construction overview" card. Lives on
                the project page for every viewer (designer, owner,
                contractor) while per-role sidebar routing is paused —
                its four tiles deep-link into the project-scoped sidebar
                items (construction-log, daily-reports, issues,
                materials). */}
            <ContractorProjectQuickActions projectId={projectIdParam} />
          </div>
        </div>
      )}

      {isFetchingProject || isFetchingBrief || isFetchingAi ? (
        !isInitialLoading && !isLoadingAi ? (
          <p
            aria-live="polite"
            className="flex items-center justify-center gap-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            <Loader2 className="size-3 animate-spin" aria-hidden />
            Refreshing…
          </p>
        ) : null
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton — mirrors the brief + quick-facts + AI list layout so
// the page doesn't jump on first load.

function PageLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-4 md:col-span-2">
          <Card
            size="sm"
            aria-busy
            aria-live="polite"
            className="border-border/60"
          >
            <CardHeader>
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-4" style={{ width: `${90 - i * 8}%` }} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-4 md:col-span-1">
          <Card
            size="sm"
            aria-busy
            aria-live="polite"
            className="border-border/60"
          >
            <CardHeader>
              <Skeleton className="h-5 w-1/3" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-4"
                  style={{ width: `${90 - i * 12}%` }}
                />
              ))}
            </CardContent>
          </Card>
          <Card
            size="sm"
            aria-busy
            aria-live="polite"
            className="border-border/60"
          >
            <CardHeader>
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
          <Card
            size="sm"
            aria-busy
            aria-live="polite"
            className="border-border/60"
          >
            <CardHeader>
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
          <Card
            size="sm"
            aria-busy
            aria-live="polite"
            className="border-border/60"
          >
            <CardHeader>
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <AiRecommendationsSkeleton />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI list loading skeleton — matches `AiRecommendationsList`'s footprint
// (header + 3 placeholder cards in a scroll area) so the column doesn't
// resize when the real list arrives.

function AiRecommendationsSkeleton() {
  return (
    <Card
      size="sm"
      aria-busy
      aria-live="polite"
      className="border-border/60"
    >
      <CardHeader>
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="mt-2 h-3 w-1/3" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card
            key={i}
            size="sm"
            className="border-border/60"
          >
            <CardHeader>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/4" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-3" style={{ width: `${92 - i * 10}%` }} />
              <Skeleton className="h-3" style={{ width: `${78 - i * 8}%` }} />
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// No-brief state — friendly block when the project has no brief yet.

function NoBriefState() {
  const t = useTranslations("ProjectsOverview.designBrief.empty");
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 py-16 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <FileText className="size-5" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-foreground">{t("title")}</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state — full-width alert with retry.

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  const t = useTranslations("ProjectsOverview.errors");
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center"
    >
      <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-foreground">{t("title")}</p>
        <p className="max-w-md text-sm text-muted-foreground">{t("subtitle")}</p>
        {message ? (
          <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">
            {message}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onRetry}
        className="mt-1"
      >
        {t("retry")}
      </Button>
    </div>
  );
}