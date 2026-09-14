"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  Loader2,
  ListChecks,
  MessageSquareText,
  MoreHorizontal,
  Package,
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
import { pressable } from "@/lib/interactive";
import { cn } from "@/lib/utils";
import { Stamp, type StampTone } from "@/components/drawing-set/stamp";

import type {
  ConstructionItem,
  ConstructionStatus,
} from "@/features/projects/construction-types";

interface PhaseRowHeaderProps {
  phase: ConstructionItem;
  index: number;
  /** Number of tasks already completed. */
  doneCount: number;
  /** Total number of tasks under this milestone (page-owned count). */
  totalTasks: number;
  onRename: (phaseId: string) => void;
  onEditMeta: (phaseId: string) => void;
  onDelete: (phaseId: string) => void;
  /** Opens the owner's note thread for this milestone. */
  onOpenNotes: (phaseId: string) => void;
  /** Opens the acceptance checklist that gates closing this milestone. */
  onOpenChecklist: (phaseId: string) => void;
  /** Opens materials and cost for this milestone. */
  onOpenMaterials: (phaseId: string) => void;
  /**
   * Forward-only transitions: `pending → in_progress → completed`.
   * The page walks the in_progress hop when "completed" is requested from
   * "pending", so a finished milestone doesn't need two trips.
   */
  onStatusChange: (
    phaseId: string,
    status: ConstructionStatus,
  ) => void | Promise<void>;
  /**
   * The keyboard and touch route to reordering. Dragging the grip is a
   * mouse gesture, so it can't be the only one — these menu items do the
   * same job for everyone else.
   *
   * Absent when the list isn't reorderable and when the milestone is
   * completed: finished work keeps the order it was done in.
   */
  reorder?: {
    onMoveUp: () => void;
    onMoveDown: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
  };
}


const VALID_NEXT_STATUS: Record<
  ConstructionStatus,
  ConstructionStatus | null
> = {
  pending: "in_progress",
  in_progress: "completed",
  completed: null,
};

// Status as an ink stamp. Not started is a neutral stamp rather than none at
// all: an unstamped sheet reads as forgotten, a NOT STARTED stamp as decided.
const STATUS_STAMP: Record<ConstructionStatus, StampTone> = {
  pending: "neutral",
  in_progress: "warning",
  completed: "success",
};

// Relative to ConstructionShared: these go through `tShared`, which is already
// bound to that namespace. Written as full paths they resolved to
// ConstructionShared.ConstructionShared.status.*, and every status pill on the
// board rendered its own key path in capitals.
const STATUS_LABEL_KEY: Record<ConstructionStatus, string> = {
  pending: "status.pending",
  in_progress: "status.in_progress",
  completed: "status.completed",
};

/**
 * Header strip for a single milestone row.
 *
 * Left side: name + index + tasksDone + duration strip.
 * Right side: status pill + kebab menu.
 *
 * Date display mirrors the spec:
 *   • Not started: planned window (`startAt → estimateAt`) + `plannedDurationDays`.
 *   • In progress: same window + an extra "actual so far" hint when we
 *     have an `actualStartAt`.
 *   • Completed: the actual window (`actualStartAt → actualAt`) + `actualDurationDays`.
 */
export function PhaseRowHeader({
  phase,
  index,
  doneCount,
  totalTasks,
  onRename,
  onEditMeta,
  onDelete,
  onOpenNotes,
  onOpenChecklist,
  onOpenMaterials,
  onStatusChange,
  reorder,
}: PhaseRowHeaderProps) {
  const t = useTranslations("MilestoneManagement.phase");
  const tShared = useTranslations("ConstructionShared");
  const tNotes = useTranslations("MilestoneManagement.notes");
  const tChecklist = useTranslations("MilestoneManagement.checklist");
  const tMaterials = useTranslations("MilestoneManagement.materials");
  const format = useFormatter();
  const nextStatus = VALID_NEXT_STATUS[phase.status];

  // The kebab menu used to fire `onStatusChange` the instant a radio item
  // was clicked — one misclick and the phase moved forward with no way
  // back (the backend only allows forward transitions). `pendingStatus`
  // holds the selection until the user confirms in a separate dialog.
  const [pendingStatus, setPendingStatus] =
    React.useState<ConstructionStatus | null>(null);
  const [blockedOpen, setBlockedOpen] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);

  const allTasksDone = totalTasks === 0 || doneCount === totalTasks;

  // Every task ticked off but the milestone still open. Promote it as a
  // real button rather than leaving it buried in the kebab.
  const canClose =
    totalTasks > 0 && allTasksDone && phase.status !== "completed";

  const applyStatus = async (target: ConstructionStatus) => {
    setIsApplying(true);
    try {
      await onStatusChange(phase.id, target);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRadioChange = (value: ConstructionStatus) => {
    if (value === "completed" && !allTasksDone) {
      // The server enforces this (409). The client guard stays to name the
      // outstanding count instead of surfacing a raw server string.
      setBlockedOpen(true);
      return;
    }
    setPendingStatus(value);
  };

  const handleConfirmStatus = () => {
    const target = pendingStatus;
    setPendingStatus(null);
    if (target) void applyStatus(target);
  };

  // Resolve the dates to render based on status — see the file header
  // for the policy.
  const isComplete = phase.status === "completed";
  const visibleStart = isComplete
    ? (phase.actualStartAt ?? phase.startAt)
    : (phase.startAt ?? phase.actualStartAt);
  const visibleEnd = isComplete
    ? (phase.actualAt ?? phase.estimateAt)
    : (phase.estimateAt ?? phase.actualAt);
  const visibleDuration = isComplete
    ? phase.actualDurationDays
    : phase.plannedDurationDays;

  return (
    <header className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <button
            type="button"
            onClick={() => onRename(phase.id)}
            className={cn(
              pressable,
              "rounded-sm text-left text-base font-semibold tracking-tight text-foreground underline-offset-2 hover:text-primary hover:underline",
            )}
          >
            {phase.name}
          </button>
          {/* Sheet reference, the way a drawing set numbers its pages. */}
          <span className="font-mono text-2xs font-semibold tracking-[0.08em] text-foreground/70">
            M-{String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {t("tasksDone", { done: doneCount, total: totalTasks })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {phase.category ? (
            <span className="inline-flex items-center gap-1">
              <User className="size-3" aria-hidden />
              <span className="font-medium text-foreground">
                {phase.category}
              </span>
            </span>
          ) : null}
          {visibleStart && visibleEnd ? (
            <>
              {phase.category ? (
                <span className="opacity-60">·</span>
              ) : null}
              <span>
                {format.dateTime(new Date(visibleStart), {
                  month: "short",
                  day: "numeric",
                })}
                {" → "}
                {format.dateTime(new Date(visibleEnd), {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </>
          ) : (
            <span>{tShared("duration.noDates")}</span>
          )}
          {visibleDuration != null ? (
            <>
              <span className="opacity-60">·</span>
              <span className="tabular-nums">
                {isComplete
                  ? tShared("duration.actual", { count: visibleDuration })
                  : tShared("duration.planned", { count: visibleDuration })}
              </span>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {canClose ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 gap-1 px-2 text-xs"
            onClick={() => setPendingStatus("completed")}
            disabled={isApplying}
            aria-busy={isApplying || undefined}
          >
            {isApplying ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="size-3" aria-hidden />
            )}
            {t("closeMilestone")}
          </Button>
        ) : null}
        <Stamp size="sm" tone={STATUS_STAMP[phase.status]} seed={phase.id + phase.status}>
          {tShared(STATUS_LABEL_KEY[phase.status])}
        </Stamp>
        {/* Payment state comes from confirmed payment batches, so it moves
            independently of the work status — a phase can be finished and
            unpaid, or paid while still running. Only shown when true: an
            "unpaid" badge on every phase would be noise. */}
        {phase.isPaid ? (
          <Stamp size="sm" tone="success" seed={phase.id + "paid"}>
            {t("paid")}
          </Stamp>
        ) : null}
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={tChecklist("open")}
          title={tChecklist("open")}
          onClick={() => onOpenChecklist(phase.id)}
        >
          <ListChecks aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={tMaterials("open")}
          title={tMaterials("open")}
          onClick={() => onOpenMaterials(phase.id)}
        >
          <Package aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={tNotes("open")}
          title={tNotes("open")}
          onClick={() => onOpenNotes(phase.id)}
        >
          <MessageSquareText aria-hidden />
        </Button>
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
            <DropdownMenuItem onSelect={() => onRename(phase.id)}>
              <Pencil aria-hidden />
              {t("rename")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEditMeta(phase.id)}>
              <ClipboardList aria-hidden />
              {t("editMeta")}
            </DropdownMenuItem>
            {reorder ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={reorder.onMoveUp}
                  disabled={!reorder.canMoveUp}
                >
                  <ArrowUp aria-hidden />
                  {t("moveUp")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={reorder.onMoveDown}
                  disabled={!reorder.canMoveDown}
                >
                  <ArrowDown aria-hidden />
                  {t("moveDown")}
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("setStatus")}
            </DropdownMenuLabel>
            <p className="px-2 pb-1.5 text-xs leading-snug text-muted-foreground">
              {nextStatus ? t("statusMoveHint") : t("statusTerminalHint")}
            </p>
            <DropdownMenuRadioGroup
              value={phase.status}
              onValueChange={(v) =>
                handleRadioChange(v as ConstructionStatus)
              }
            >
              <DropdownMenuRadioItem
                value="completed"
                disabled={phase.status === "completed"}
                className={cn(canClose && "font-medium text-foreground")}
              >
                {canClose && (
                  <ArrowRight aria-hidden className="size-3.5" />
                )}
                {t("statusCompleted")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="in_progress"
                disabled={nextStatus !== "in_progress"}
                className={cn(
                  nextStatus === "in_progress" &&
                    "font-medium text-foreground",
                )}
              >
                {nextStatus === "in_progress" && (
                  <ArrowRight aria-hidden className="size-3.5" />
                )}
                {t("statusInProgress")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="pending" disabled>
                {t("statusUpcoming")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDelete(phase.id)}
              variant="destructive"
            >
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
            ? t("confirmStatusToCompleted", { name: phase.name })
            : t("confirmStatusToInProgress", { name: phase.name })
        }
        confirmLabel={t("confirmCta")}
        cancelLabel={t("confirmCancel")}
        onConfirm={handleConfirmStatus}
      />

      <AlertDialog open={blockedOpen} onOpenChange={setBlockedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("blockedTasksTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("blockedTasksBody", {
                name: phase.name,
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
