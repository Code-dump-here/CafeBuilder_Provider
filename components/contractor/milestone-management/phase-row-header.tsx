"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  ArrowRight,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

// The backend only allows one-step-forward transitions — pending ("upcoming")
// → in_progress → completed, never backward and never skipped — and rejects
// anything else with a 400. "blocked" isn't a real backend status at all (it
// maps to "pending" on write, and the API never returns it on read), so it
// can never be a valid target from any state. Picking a status the backend
// will reject used to just surface a raw, Vietnamese-only error toast with no
// indication *why* — this maps each current status to the single status that
// can actually be set next, so the menu only ever offers a transition that
// will succeed.
const VALID_NEXT_STATUS: Record<MilestoneStatus, MilestoneStatus | null> = {
  upcoming: "inProgress",
  inProgress: "completed",
  completed: null,
  blocked: null,
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
  const nextStatus = VALID_NEXT_STATUS[phase.status];

  // The three-dot menu used to fire `onStatusChange` the instant a radio
  // item was clicked — one misclick and the phase moved forward with no
  // way back (the backend only allows one-step-forward transitions, never
  // backward). `pendingStatus` holds the selection until the user confirms
  // it in a separate dialog instead.
  const [pendingStatus, setPendingStatus] = React.useState<MilestoneStatus | null>(null);
  const [blockedOpen, setBlockedOpen] = React.useState(false);

  const totalTasks = phase.tasks.length;
  const allTasksDone = totalTasks === 0 || doneCount === totalTasks;

  const handleRadioChange = (value: MilestoneStatus) => {
    if (value === "completed" && !allTasksDone) {
      // Nothing stops the API from marking a phase "completed" while its
      // tasks are still open — it doesn't check. Block it client-side so
      // "completed" always actually means done.
      setBlockedOpen(true);
      return;
    }
    setPendingStatus(value);
  };

  const handleConfirmStatus = () => {
    if (pendingStatus) onStatusChange(phase.id, pendingStatus);
    setPendingStatus(null);
  };

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
          {phase.startDate && phase.endDate ? (
            <>
              <span className="opacity-60">·</span>
              <span>
                {format.dateTime(new Date(phase.startDate), { month: "short", day: "numeric" })}
                {" → "}
                {format.dateTime(new Date(phase.endDate), { month: "short", day: "numeric" })}
              </span>
            </>
          ) : null}
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
            <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("setStatus")}
            </DropdownMenuLabel>
            <p className="px-2 pb-1.5 text-[11px] leading-snug text-muted-foreground">
              {nextStatus ? t("statusMoveHint") : t("statusTerminalHint")}
            </p>
            <DropdownMenuRadioGroup
              value={phase.status}
              onValueChange={(v) => handleRadioChange(v as MilestoneStatus)}
            >
              <DropdownMenuRadioItem
                value="completed"
                disabled={nextStatus !== "completed"}
                className={cn(nextStatus === "completed" && "font-medium text-foreground")}
              >
                {nextStatus === "completed" && <ArrowRight aria-hidden className="size-3.5" />}
                {t("statusCompleted")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="inProgress"
                disabled={nextStatus !== "inProgress"}
                className={cn(nextStatus === "inProgress" && "font-medium text-foreground")}
              >
                {nextStatus === "inProgress" && <ArrowRight aria-hidden className="size-3.5" />}
                {t("statusInProgress")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="upcoming" disabled>
                {t("statusUpcoming")}
              </DropdownMenuRadioItem>
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

      <ConfirmDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => {
          if (!open) setPendingStatus(null);
        }}
        title={t("confirmStatusTitle")}
        description={
          pendingStatus === "completed"
            ? t("confirmStatusToCompleted", { name: phase.label })
            : t("confirmStatusToInProgress", { name: phase.label })
        }
        confirmLabel={t("confirmCta")}
        cancelLabel={t("confirmCancel")}
        onConfirm={handleConfirmStatus}
      />

      {/* Info-only — acknowledgement, not confirm/cancel. Nothing to
          confirm here since "completed" was already rejected client-side. */}
      <AlertDialog open={blockedOpen} onOpenChange={setBlockedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("blockedTasksTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("blockedTasksBody", {
                name: phase.label,
                count: totalTasks - doneCount,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction>{t("blockedTasksCta")}</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}