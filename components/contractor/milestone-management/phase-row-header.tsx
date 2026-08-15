"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageSquareText,
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
  doneCount: number;
  onRename: (phaseId: string) => void;
  onEditMeta: (phaseId: string) => void;
  onDelete: (phaseId: string) => void;
  /** Opens the owner's note thread for this milestone. */
  onOpenNotes: (phaseId: string) => void;
  /** May be async — awaited so the row can show a busy state while the
   *  status change (which can take two requests) is in flight. */
  onStatusChange: (
    phaseId: string,
    status: MilestoneStatus,
  ) => void | Promise<void>;
}

const STATUS_TONE: Record<MilestoneStatus, { badgeClass: string }> = {
  completed: { badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  inProgress: { badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  blocked: { badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  upcoming: { badgeClass: "bg-muted text-muted-foreground" },
};

// The backend only allows one-step-forward transitions — pending ("upcoming")
// → in_progress → completed, never backward and never skipped. Skipping is
// rejected with a 409 ("Không thể chuyển hạng mục từ 'pending' sang
// 'completed'"), confirmed against the live API. "blocked" isn't a real
// backend status at all (it maps to "pending" on write, and the API never
// returns it on read), so it can never be a valid target from any state.
// This maps each current status to the status immediately after it, which
// drives the menu's hint text.
//
// Note "completed" is offered from "upcoming" too even though it isn't the
// immediate next step: `onStatusChange` walks the in_progress hop for us, so
// a milestone whose tasks are all done closes in one action instead of
// forcing two trips through this menu.
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
  doneCount,
  onRename,
  onEditMeta,
  onDelete,
  onOpenNotes,
  onStatusChange,
}: PhaseRowHeaderProps) {
  const t = useTranslations("MilestoneManagement.phase");
  const tStatus = useTranslations("ConstructionOverview.status");
  const tNotes = useTranslations("MilestoneManagement.notes");
  const format = useFormatter();
  const nextStatus = VALID_NEXT_STATUS[phase.status];

  // The three-dot menu used to fire `onStatusChange` the instant a radio
  // item was clicked — one misclick and the phase moved forward with no
  // way back (the backend only allows one-step-forward transitions, never
  // backward). `pendingStatus` holds the selection until the user confirms
  // it in a separate dialog instead.
  const [pendingStatus, setPendingStatus] = React.useState<MilestoneStatus | null>(null);
  const [blockedOpen, setBlockedOpen] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);

  const totalTasks = phase.tasks.length;
  const allTasksDone = totalTasks === 0 || doneCount === totalTasks;

  // Every task ticked off but the milestone still open. This is the state
  // that used to strand providers: the work was visibly finished, yet the
  // engagement couldn't be reported complete because the milestone itself
  // was never advanced. Surface it as a real button rather than leaving it
  // buried two levels into the kebab menu.
  //
  // Requires at least one task on purpose — `allTasksDone` is vacuously
  // true for an empty milestone, which would otherwise stamp "Mark
  // completed" on every phase the moment it was created. Closing an empty
  // milestone is still possible through the menu, it just isn't promoted.
  const canClose =
    totalTasks > 0 && allTasksDone && phase.status !== "completed";

  const applyStatus = async (target: MilestoneStatus) => {
    setIsApplying(true);
    try {
      await onStatusChange(phase.id, target);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRadioChange = (value: MilestoneStatus) => {
    if (value === "completed" && !allTasksDone) {
      // The server does enforce this — it answers 409 "Còn N task chưa
      // 'completed' trong hạng mục này". (An earlier comment here claimed
      // the API didn't check; that was wrong, and verifying against the
      // live API disproved it.) The client guard stays anyway: it names
      // the phase and the outstanding count instead of surfacing a raw
      // server string, and it costs a round trip to learn nothing new.
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
        {canClose ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 gap-1 px-2 text-[10px]"
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
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            STATUS_TONE[phase.status].badgeClass
          )}
        >
          {tStatus(phase.status)}
        </span>
        {/* The owner writes notes against a milestone from the mobile app.
            Kept as a visible control rather than a menu entry — buried in the
            kebab, a note nobody knows about is the same as no note. */}
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
              {/* Reachable from "upcoming" as well — `onStatusChange` walks
                  the in_progress hop, so a finished milestone doesn't need
                  two separate trips through this menu. */}
              <DropdownMenuRadioItem
                value="completed"
                disabled={phase.status === "completed"}
                className={cn(canClose && "font-medium text-foreground")}
              >
                {canClose && <ArrowRight aria-hidden className="size-3.5" />}
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
            {/* "Move left/right" used to sit here. There is no reorder
                endpoint — both handlers were `() => {}`, so the items did
                nothing but look enabled. Removed rather than disabled: a
                greyed-out control still implies the feature exists. */}
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