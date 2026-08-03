"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, ClipboardList, Loader2 } from "lucide-react";

import { ConstructionOverviewHeader } from "@/components/contractor/construction-overview-header";
import { MilestoneTrack } from "@/components/contractor/milestone-track";
import { MilestoneDetailCard } from "@/components/contractor/milestone-detail-card";
import { ContractorActionTiles } from "@/components/contractor/contractor-action-tiles";
import { PhaseDetailDrawer } from "@/components/contractor/phase-detail-drawer";
import { Button } from "@/components/ui/button";
import { useEngagements } from "@/features/projects/use-engagements";
import { useProjectDetail } from "@/features/projects/use-project-detail";
import { useConstructionOverview } from "@/lib/contractor/use-construction-overview";

/**
 * `/[locale]/projects/{id}/construction-overview`
 *
 * The contractor's "project home" — milestone track on top, detail of
 * the selected phase below, then a tile grid for one-tap navigation to
 * the daily tools (log / reports / issues / materials / payments).
 *
 * Data flow (post-refactor):
 *   1. `useProjectDetail(id)` — project metadata for the header chip.
 *   2. `useEngagements({ projectId, status: "accepted" })` — pick the
 *      accepted engagement to scope construction items / issues.
 *   3. `useConstructionOverview({ projectWorkingId, projectName })` —
 *      thin adapter that calls `useConstructionItems` + `useIssues` and
 *      maps them onto the legacy `MilestonePhase[]` shape consumed by
 *      `MilestoneTrack` / `MilestoneDetailCard` / `PhaseDetailDrawer`.
 *
 * Render states (three distinct outcomes, not two):
 *   - **loading**  — at least one query is in-flight; show spinner.
 *   - **error**    — at least one query failed; show retry banner.
 *   - **empty**    — queries succeeded but produced no milestones.
 *                   Differentiate from error: the API is fine, the
 *                   project just hasn't had any construction items
 *                   authored yet. Surface a CTA that takes the user to
 *                   `/milestones` so they can create the first phase.
 *   - **ready**    — render the track + detail + tiles.
 *
 * The previous version conflated "empty" and "error" behind one alert,
 * which led to the misleading "Milestone data unavailable" toast even
 * for healthy projects with zero milestones. The split below fixes that
 * and makes the diagnostic console output (see `debugLog`) so we can
 * see why the data was empty without leaving the page.
 *
 * The current phase is auto-selected on first render: prefer an
 * `inProgress` phase (the one the contractor is actually working on),
 * then `blocked` (work stalled), then the first phase. This replaces
 * the hard-coded `CURRENT_PHASE_ID = "framing"` constant from the mock
 * module so the highlight follows real data.
 *
 * Clicking "Open phase detail" on the detail card slides in a side
 * drawer (simplified — see `PhaseDetailDrawer`) with the read of the
 * selected phase plus its real tasks and issues.
 */
export default function ConstructionOverviewPage() {
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id ?? "";
  const t = useTranslations("ConstructionOverview");

  // 1. Project metadata for the header chip. Cheap call (cached).
  const { project, isLoading: isLoadingProject } = useProjectDetail(projectIdParam);

  // 2. Resolve the accepted engagement. We take the first row — same
  //    scoping rule as `design-management` so the two overview pages
  //    agree on which engagement they're talking about.
  const { engagements, isLoading: isLoadingEngagements } = useEngagements({
    projectId: projectIdParam,
    status: "accepted",
    pageSize: 1,
  });
  const engagementId = engagements[0]?.id ?? null;

  // 3. Adapter — pulls milestones + issues and synthesizes the
  //    `MilestonePhase[]` shape consumed downstream.
  const overview = useConstructionOverview({
    projectWorkingId: engagementId,
    projectName: project.name || undefined,
    projectId: projectIdParam,
  });

  const data = overview.data;

  // Temporary diagnostic — emits a single log when the data is empty so
  // we can tell from the console whether the cause is "no engagement",
  // "engagement found but no milestones", or "API error". Drop once
  // the empty-state messaging is verified to be self-explanatory.
  React.useEffect(() => {
    if (
      !isLoadingProject &&
      !isLoadingEngagements &&
      !overview.isLoading &&
      data.phases.length === 0
    ) {
      console.info("[construction-overview] empty result", {
        projectIdParam,
        engagementsResolved: engagements.length,
        engagementId,
        rawItems: overview.items.length,
        rawIssues: overview.issues.length,
        isError: overview.isError,
      });
    }
  }, [
    isLoadingProject,
    isLoadingEngagements,
    overview.isLoading,
    overview.isError,
    overview.items.length,
    overview.issues.length,
    data.phases.length,
    projectIdParam,
    engagements.length,
    engagementId,
  ]);

  // Auto-select the "current" phase on first render. Re-runs only when
  // the phase list itself changes (e.g. after refetch), not when the
  // user clicks around the track.
  const initialPhaseId = React.useMemo(() => {
    const phases = data.phases;
    if (phases.length === 0) return "";
    const inProgress = phases.find((p) => p.status === "inProgress");
    if (inProgress) return inProgress.id;
    const blocked = phases.find((p) => p.status === "blocked");
    if (blocked) return blocked.id;
    return phases[0]!.id;
  }, [data.phases]);

  const [selectedPhaseId, setSelectedPhaseId] = React.useState<string>("");

  // Push the auto-derived id into state once the list loads. Done in an
  // effect (not during render) to keep the `useState` initializer
  // side-effect-free — a state update during render would trigger a
  // re-render warning in React 18+ strict mode.
  React.useEffect(() => {
    if (initialPhaseId && selectedPhaseId === "") {
      setSelectedPhaseId(initialPhaseId);
    }
  }, [initialPhaseId, selectedPhaseId]);

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const selectedPhase = React.useMemo(
    () => data.phases.find((p) => p.id === selectedPhaseId) ?? data.phases[0],
    [data.phases, selectedPhaseId],
  );

  // Phase shown in the drawer — locked to whatever was selected when
  // the user clicked "Open phase detail", so closing + reopening the
  // drawer doesn't surprise them with a different phase if they've
  // since moved the track selection.
  const [drawerPhase, setDrawerPhase] = React.useState<
    (typeof data.phases)[number] | null
  >(null);

  const handleOpenDetail = React.useCallback(() => {
    if (selectedPhase) {
      setDrawerPhase(selectedPhase);
      setDrawerOpen(true);
    }
  }, [selectedPhase]);

  // Loading state — surface a centered spinner while the page is wiring
  // up. We treat the whole "engagement → overview" chain as a single
  // loading boundary; per-section skeletons would flicker since the
  // header, track, and detail card all depend on the same data.
  //
  // Note: even when `engagementId` is still null we stay in loading —
  // otherwise the page would flash the "no engagement" empty state
  // before the engagements query resolved.
  const isInitialLoading =
    isLoadingProject ||
    isLoadingEngagements ||
    (engagementId != null && overview.isLoading);

  if (isInitialLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <Loader2 aria-hidden className="size-5 animate-spin" />
        <span>{t("loading")}</span>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  // API call failed (network, 4xx/5xx). Show retry; empty data should
  // not land here — see the empty-state branch below.
  if (overview.isError) {
    return (
      <div
        role="alert"
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/60 px-6 py-10 text-center"
      >
        <AlertTriangle aria-hidden className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("milestoneError")}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            void overview.refetch();
          }}
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  // API succeeded but produced no milestones. Two flavors:
  //   a) No accepted engagement for this project → the user shouldn't
  //      be on this page at all. Tell them what to do.
  //   b) Engagement exists, just no milestones yet → CTA into
  //      `/milestones` to create the first phase.
  if (data.phases.length === 0) {
    const noEngagement = engagementId == null;
    return (
      <div
        role="status"
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/60 px-6 py-10 text-center"
      >
        <ClipboardList aria-hidden className="size-6 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            {noEngagement ? t("emptyNoEngagement") : t("emptyTitle")}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {noEngagement ? t("emptyNoEngagementDesc") : t("emptyDesc")}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/projects/${projectIdParam}/milestones`}>
            {noEngagement ? t("emptyNoEngagementCta") : t("emptyCta")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <ConstructionOverviewHeader
          data={data}
          currentPhaseLabel={selectedPhase.label}
        />

        <MilestoneTrack
          phases={data.phases}
          selectedPhaseId={selectedPhaseId}
          onSelect={setSelectedPhaseId}
        />

        <MilestoneDetailCard
          phase={selectedPhase}
          onOpenDetail={handleOpenDetail}
        />

        <ContractorActionTiles projectId={projectIdParam} />
      </div>

      <PhaseDetailDrawer
        phase={drawerPhase}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        projectId={projectIdParam}
        // Forward the engagement id so the drawer can fetch tasks and
        // per-milestone issues. `null` keeps its hooks disabled until
        // we have a valid engagement.
        projectWorkingId={engagementId}
      />
    </>
  );
}