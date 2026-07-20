"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import type {
  MilestonePhase,
  MilestoneStatus,
} from "@/lib/contractor/construction-overview-data";

interface PhaseColumnHeaderProps {
  phase: MilestonePhase;
  doneCount: number;
  totalTasks: number;
  /** Index within phases array — used to gate move-left/right. */
  index: number;
  lastIndex: number;
  onRename: () => void;
  onEditMeta: () => void;
  onDelete: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onStatusChange: (status: MilestoneStatus) => void;
}

const STATUS_TONE: Record<
  MilestoneStatus,
  { badgeClass: string }
> = {
  completed: {
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  inProgress: {
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  blocked: {
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  upcoming: {
    badgeClass: "bg-muted text-muted-foreground",
  },
};

/**
 * Header strip at the top of a phase column. Hosts the status pill +
 * phase label + lead/target + progress meter + a kebab menu with the
 * full set of phase-level actions (rename / edit meta / set status /
 * reorder / delete).
 */
export function PhaseColumnHeader({
  phase,
  doneCount,
  totalTasks,
  index,
  lastIndex,
  onRename,
  onEditMeta,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onStatusChange,
}: PhaseColumnHeaderProps) {
  const t = useTranslations("MilestoneManagement.phase");
  const tStatus = useTranslations("ConstructionOverview.status");
  const format = useFormatter();

  return (
    <header className="flex flex-col gap-2 border-b border-border/60 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                STATUS_TONE[phase.status].badgeClass
              )}
            >
              {tStatus(phase.status)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              #{index + 1}
            </span>
          </div>
          <button
            type="button"
            onClick={onRename}
            className="line-clamp-1 text-left text-sm font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {phase.label}
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Phase actions"
            >
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={onRename}>
              <Pencil aria-hidden />
              {t("rename")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onEditMeta}>
              <ClipboardList aria-hidden />
              {t("editMeta")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={phase.status}
              onValueChange={(v) => onStatusChange(v as MilestoneStatus)}
            >
              <DropdownMenuRadioItem value="completed">
                {t("statusCompleted")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="inProgress">
                {t("statusInProgress")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="blocked">
                {t("statusBlocked")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="upcoming">
                {t("statusUpcoming")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onMoveLeft}
              disabled={index === 0}
            >
              <ChevronLeft aria-hidden />
              {t("moveLeft")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onMoveRight}
              disabled={index === lastIndex}
            >
              <ChevronRight aria-hidden />
              {t("moveRight")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onDelete}
              variant="destructive"
            >
              <Trash2 aria-hidden />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Lead + target */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <User className="size-3" aria-hidden />
          <span className="font-medium text-foreground">{phase.lead}</span>
        </span>
        <span className="opacity-60">·</span>
        <span>
          {format.dateTime(new Date(phase.targetDate), {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Progress meter */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${phase.progress}%` }}
            role="progressbar"
            aria-valuenow={phase.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <span className="w-9 text-right text-[10px] tabular-nums text-muted-foreground">
          {phase.progress}%
        </span>
      </div>

      {/* Tasks done counter */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {t("tasksDone", { done: doneCount, total: totalTasks })}
        </span>
        <span>
          {phase.blockerCount > 0
            ? `${phase.blockerCount} ⚠`
            : phase.photoCount > 0
              ? `${phase.photoCount} 📷`
              : ""}
        </span>
      </div>
    </header>
  );
}