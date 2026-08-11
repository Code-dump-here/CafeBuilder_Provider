"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DrawingCanvas } from "@/components/technical-drawings/drawing-canvas";
import { DrawingDetailHeader } from "@/components/technical-drawings/drawing-detail-header";
import { DrawingTreeGroups } from "@/components/technical-drawings/drawing-tree-groups";
import { ReviewerInfoCard } from "@/components/technical-drawings/reviewer-info-card";
import { VersionHistoryPanel } from "@/components/technical-drawings/version-history-panel";
import {
  useDrawingGroups,
  useTechnicalDrawing,
  useTechnicalDrawings,
} from "@/features/projects/use-technical-drawings";
import type { DrawingVersion } from "@/features/projects/technical-drawing-types";

export default function TechnicalDrawingDetailPage() {
  const params = useParams<{ id: string; drawingId: string }>();
  const projectIdParam = params?.id ?? "";
  const drawingIdParam = params?.drawingId ?? "";
  const drawingId = Number.parseInt(drawingIdParam, 10);
  const t = useTranslations("TechnicalDrawings");

  const drawing = useTechnicalDrawing(drawingId);
  const allDrawings = useTechnicalDrawings(projectIdParam);
  const groups = useDrawingGroups(projectIdParam);

  // Lookup table for tree rendering — O(1) instead of repeated finds.
  const drawingsById = React.useMemo(() => {
    const map = new Map<number, (typeof allDrawings)[number]>();
    allDrawings.forEach((d) => map.set(d.id, d));
    return map;
  }, [allDrawings]);

  // Version selection — defaults to the newest revision.
  const [selectedVersionId, setSelectedVersionId] = React.useState<
    number | null
  >(null);
  const [compareVersionId, setCompareVersionId] = React.useState<
    number | null
  >(null);

  // Reset version selection when the drawing changes. Without this,
  // navigating from drawing A (id=1) to drawing B (id=2) would keep the
  // previous `selectedVersionId`, which no longer exists in B's list.
  React.useEffect(() => {
    if (!drawing) {
      setSelectedVersionId(null);
      setCompareVersionId(null);
      return;
    }
    setSelectedVersionId(drawing.versions[0]?.id ?? null);
    setCompareVersionId(null);
  }, [drawing?.id]);

  // Open the first group that contains the current drawing by default.
  //
  // Runs before the "not found" early return below so the hook order stays
  // identical across renders — a render that bailed out early followed by one
  // that didn't would otherwise trip "Rendered more hooks than during the
  // previous render". `drawing` may be undefined here, hence the optional
  // chaining; the early return still handles the not-found UI.
  const defaultOpenGroupIds = React.useMemo(() => {
    if (!drawing) return undefined;
    const group = groups.find((g) => g.drawingIds.includes(drawing.id));
    return group ? [group.id] : undefined;
  }, [groups, drawing]);

  if (!drawingId || Number.isNaN(drawingId) || !drawing) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertTriangle
          aria-hidden
          className="size-8 text-muted-foreground/50"
        />
        <p className="text-sm text-muted-foreground">
          Drawing not found.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href={`/projects/${projectIdParam}/technical-drawings`}>
            {t("pageTitle")}
          </Link>
        </Button>
      </div>
    );
  }

  const handleSelectVersion = (version: DrawingVersion) => {
    setSelectedVersionId(version.id);
  };

  const handleToggleCompare = (version: DrawingVersion) => {
    // Toggling compare on the currently-selected version is a no-op
    // (you can't compare a version against itself).
    if (version.id === selectedVersionId) return;
    setCompareVersionId((current) =>
      current === version.id ? null : version.id,
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <DrawingDetailHeader drawing={drawing} projectId={projectIdParam} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_320px]">
        <DrawingTreeGroups
          groups={groups}
          drawingsById={drawingsById}
          selectedId={drawing.id}
          projectId={projectIdParam}
          defaultOpenGroupIds={defaultOpenGroupIds}
        />

        <DrawingCanvas drawing={drawing} />

        <div className="flex min-h-0 flex-col gap-4">
          <VersionHistoryPanel
            versions={drawing.versions}
            selectedVersionId={selectedVersionId}
            onSelectVersion={handleSelectVersion}
            compareVersionId={compareVersionId}
            onToggleCompare={handleToggleCompare}
          />
          <ReviewerInfoCard drawing={drawing} />
        </div>
      </div>
    </div>
  );
}