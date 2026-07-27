"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  CalendarDays,
  FlagTriangleRight,
  TriangleAlert,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import type {
  MilestonePhase,
  MilestoneStatus,
} from "@/lib/contractor/construction-overview-data";

interface MilestoneDetailCardProps {
  phase: MilestonePhase;
  /** Drives "Open phase detail" CTA. */
  onOpenDetail: () => void;
}

/**
 * Detail card for the phase the user selected on the track. Carries:
 *   - phase meta (status pill, target date, progress %)
 *   - open-issue counter (driven by `phase.blockerCount`, real data)
 *   - tasks preview (kept as an empty-state slot — full task list lives
 *     inside the phase-detail drawer now that we render real
 *     `ConstructionTask[]` data there)
 *   - shortcut button to open the per-phase drawer
 *
 * Fields dropped from the mock-data version:
 *   - `lead` — no API surface; the contact-pill is moved to the drawer.
 *   - `photoCount` — no API surface; photo strip lives in the drawer.
 */
export function MilestoneDetailCard({
  phase,
  onOpenDetail,
}: MilestoneDetailCardProps) {
  const t = useTranslations("ConstructionOverview.detail");
  const tStatus = useTranslations("ConstructionOverview.status");
  const format = useFormatter();

  const tone = STATUS_TONE[phase.status];

  return (
    <Card size="sm" className="border-border/60">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${tone.className}`}
              >
                {phase.status === "inProgress" ? (
                  <FlagTriangleRight className="size-3" aria-hidden />
                ) : null}
                {tStatus(phase.status)}
              </span>
              {phase.blockerCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300">
                  <TriangleAlert className="size-3" aria-hidden />
                  {t("blockers", { count: phase.blockerCount })}
                </span>
              ) : null}
            </div>
            <CardTitle className="text-base">{phase.label}</CardTitle>
            <CardDescription>{t("subtitle")}</CardDescription>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenDetail}
          >
            {t("viewPhase")}
          </Button>
        </div>

        {/* Meta strip — kept narrow: just the targeted finish date. */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3" aria-hidden />
            <span className="text-foreground">
              {format.dateTime(new Date(phase.targetDate), {
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="opacity-80">· {t("target")}</span>
          </span>
        </div>

        {/* Progress bar */}
        <PhaseProgress percent={phase.progress} tone={tone} label={t("progressLabel")} />
      </CardHeader>

      <CardContent>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("tasks")}
        </h3>
        <p className="mt-2 rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {t("noTasks")}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function PhaseProgress({
  percent,
  tone,
  label,
}: {
  percent: number;
  tone: { barClass: string };
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="flex flex-col gap-1 pt-2">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{clamped}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${tone.barClass}`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

// ─── Tones (kept here too — track and detail share the visual language) ───────

const STATUS_TONE: Record<
  MilestoneStatus,
  { className: string; barClass: string }
> = {
  completed: {
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    barClass: "bg-emerald-500",
  },
  inProgress: {
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    barClass: "bg-amber-500",
  },
  blocked: {
    className: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    barClass: "bg-rose-500",
  },
  upcoming: {
    className: "bg-muted text-muted-foreground",
    barClass: "bg-muted-foreground/40",
  },
};