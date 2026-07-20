"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { ConstructionOverviewHeader } from "@/components/contractor/construction-overview-header";
import { MilestoneTrack } from "@/components/contractor/milestone-track";
import { MilestoneDetailCard } from "@/components/contractor/milestone-detail-card";
import { ContractorActionTiles } from "@/components/contractor/contractor-action-tiles";
import { PhaseDetailDrawer } from "@/components/contractor/phase-detail-drawer";

import {
  CURRENT_PHASE_ID,
  MOCK_CONSTRUCTION_OVERVIEW,
  type MilestonePhase,
} from "@/lib/contractor/construction-overview-data";

/**
 * `/[locale]/projects/{id}/construction-overview`
 *
 * The contractor's "project home" — milestone track on top, detail of
 * the selected phase below, then a tile grid for one-tap navigation to
 * the daily tools (log / reports / issues / materials / payments).
 *
 * Clicking "Open phase detail" on the detail card slides in a side
 * drawer with the full read of the selected phase (KPI strip +
 * narrative + tasks + blockers + photos + crew).
 */
export default function ConstructionOverviewPage() {
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id ?? "";
  const t = useTranslations("ConstructionOverview");

  const data = MOCK_CONSTRUCTION_OVERVIEW;

  const [selectedPhaseId, setSelectedPhaseId] = React.useState<string>(
    () => {
      // Prefer the project's actual current phase, fall back to the
      // first phase if the constant is missing (development safety).
      const exists = data.phases.some((p) => p.id === CURRENT_PHASE_ID);
      return exists ? CURRENT_PHASE_ID : (data.phases[0]?.id ?? "");
    }
  );

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const selectedPhase = React.useMemo(
    () => data.phases.find((p) => p.id === selectedPhaseId) ?? data.phases[0],
    [data.phases, selectedPhaseId]
  );

  // Phase shown in the drawer — locked to whatever was selected when
  // the user clicked "Open phase detail", so closing + reopening the
  // drawer doesn't surprise them with a different phase if they've
  // since moved the track selection.
  const [drawerPhase, setDrawerPhase] = React.useState<MilestonePhase | null>(
    null
  );

  const handleOpenDetail = React.useCallback(() => {
    if (selectedPhase) {
      setDrawerPhase(selectedPhase);
      setDrawerOpen(true);
    }
  }, [selectedPhase]);

  if (!selectedPhase) {
    return (
      <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
        {t("milestoneError")}
      </p>
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
      />
    </>
  );
}