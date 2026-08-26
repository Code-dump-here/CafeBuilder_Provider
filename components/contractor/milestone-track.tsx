"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, CircleDashed, FlagTriangleRight, XCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { pressable } from "@/lib/interactive";
import { cn } from "@/lib/utils";

import type {
  MilestonePhase,
  MilestoneStatus,
} from "@/lib/contractor/construction-overview-data";

interface MilestoneTrackProps {
  phases: MilestonePhase[];
  selectedPhaseId: string;
  onSelect: (id: string) => void;
}

/**
 * Horizontal milestone rail showing all phases side by side. The selected
 * node is highlighted with a ring; the "current" node (the one carrying
 * actual progress) gets a pulsing accent so it's the eye magnet even if
 * the user selected something else.
 *
 *   ●─────●─────◉─────⊙─────○─────○
 *   done  done  active blocked  upcoming  upcoming
 */
export function MilestoneTrack({
  phases,
  selectedPhaseId,
  onSelect,
}: MilestoneTrackProps) {
  const t = useTranslations("ConstructionOverview.track");

  return (
    <Card size="sm" className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>

      <CardContent className="overflow-x-auto">
        <ol className="flex min-w-fit items-start gap-0">
          {phases.map((phase, idx) => {
            const isLast = idx === phases.length - 1;
            const tone = STATUS_TONE[phase.status];
            const isSelected = phase.id === selectedPhaseId;
            return (
              <li
                key={phase.id}
                className={cn(
                  "flex min-w-[140px] flex-1 flex-col items-center",
                  !isLast && "border-r border-border/40 pr-2"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(phase.id)}
                  aria-pressed={isSelected}
                  aria-label={phase.label}
                  className={cn(
                    pressable,
                    "group flex w-full flex-col items-center gap-1.5 rounded-md p-2 hover:bg-muted/60 motion-safe:active:scale-[0.97]",
                    isSelected && "bg-muted/60"
                  )}
                >
                  <div
                    className={cn(
                      "relative flex size-9 items-center justify-center rounded-full border-2 transition-all",
                      // The node is the thing the eye tracks along the rail,
                      // so it grows under the cursor rather than relying on
                      // the panel tint alone to say "this one".
                      "motion-safe:group-hover:scale-110",
                      tone.badgeClass,
                      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                      phase.status === "inProgress" && !isSelected && "ring-2 ring-amber-400/40 ring-offset-2 ring-offset-card motion-safe:animate-pulse"
                    )}
                  >
                    <NodeIcon status={phase.status} />
                  </div>

                  <span className="text-center text-[11px] font-medium text-foreground">
                    {phase.shortLabel}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0 text-[10px]",
                      tone.className
                    )}
                  >
                    {phase.progress}%
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function NodeIcon({ status }: { status: MilestoneStatus }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="size-4" aria-hidden />;
    case "inProgress":
      return <FlagTriangleRight className="size-4" aria-hidden />;
    case "blocked":
      return <XCircle className="size-4" aria-hidden />;
    case "upcoming":
      return <CircleDashed className="size-4" aria-hidden />;
  }
}

const STATUS_TONE: Record<
  MilestoneStatus,
  {
    badgeClass: string;
    className: string;
  }
> = {
  completed: {
    badgeClass: "border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  inProgress: {
    badgeClass: "border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  blocked: {
    badgeClass: "border-rose-500/60 bg-rose-500/15 text-rose-700 dark:text-rose-300",
    className: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  upcoming: {
    badgeClass: "border-border/70 bg-card text-muted-foreground",
    className: "bg-muted text-muted-foreground",
  },
};