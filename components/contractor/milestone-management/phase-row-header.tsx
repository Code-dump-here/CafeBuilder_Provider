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

import type { MilestonePhase, MilestoneStatus } from "@/lib/contractor/construction-overview-data";

interface PhaseRowHeaderProps {
  phase: MilestonePhase;
  index: number;
  lastIndex: number;
  doneCount: number;
  onRename: (phaseId: string) => void;
  onEditMeta: (phaseId: string) => void;
  onDelete: (phaseId: string) => void;
  onMoveLeft: (phaseId: string) => void;
  onMoveRight: (phaseId: string) => void;
  onStatusChange: (phaseId: string, status: MilestoneStatus) => void;
}

const STATUS_TONE: Record<MilestoneStatus, { badgeClass: string }> = {
  completed: { badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  inProgress: { badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  blocked: { badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  upcoming: { badgeClass: "bg-muted text-muted-foreground" },
};

/**
 * Header strip for a single milestone row.
 * Left side  = milestone name + # + tasksDone
 * Middle     = lead + target date
 * Right side = status pill + kebab menu
 */
export function PhaseRowHeader({
  phase,
  index,
  lastIndex,
  doneCount,
  onRename,
  onEditMeta,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onStatusChange,
}: PhaseRowHeaderProps) {
  const t = useTranslations("MilestoneManagement.phase");
  const tStatus = useTranslations("ConstructionOverview.status");
  const format = useFormatter();

  return (
    <header className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <button
            type="button"
            onClick={() => onRename(phase.id)}
            className="text-left text-sm font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {phase.label}
          </button>
          <span className="text-[10px] text-muted-foreground">#{index + 1}</span>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground">
            {t("tasksDone", { done: doneCount, total: phase.tasks.length })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="size-3" aria-hidden />
            <span className="font-medium text-foreground">{phase.lead}</span>
          </span>
          <span className="opacity-60">·</span>
          <span>
            {format.dateTime(new Date(phase.startDate), { month: "short", day: "numeric" })}
            {" → "}
            {format.dateTime(new Date(phase.endDate), { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>
    <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            STATUS_TONE[phase.status].badgeClass
          )}
        >
          {tStatus(phase.status)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Phase actions">
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => onRename(phase.id)}>
              <Pencil aria-hidden />
              {t("rename")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEditMeta(phase.id)}>
              <ClipboardList aria-hidden />
              {t("editMeta")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={phase.status}
              onValueChange={(v) => onStatusChange(phase.id, v as MilestoneStatus)}
            >
              <DropdownMenuRadioItem value="completed">{t("statusCompleted")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="inProgress">{t("statusInProgress")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="blocked">{t("statusBlocked")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="upcoming">{t("statusUpcoming")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onMoveLeft(phase.id)} disabled={index === 0}>
              <ChevronLeft aria-hidden />
              {t("moveLeft")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMoveRight(phase.id)} disabled={index === lastIndex}>
              <ChevronRight aria-hidden />
              {t("moveRight")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onDelete(phase.id)} variant="destructive">
              <Trash2 aria-hidden />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}