"use client";

import { useFormatter, useTranslations } from "next-intl";
import { CalendarDays, CheckCircle2, Circle, CircleDot } from "lucide-react";

import { pressable } from "@/lib/interactive";
import { cn } from "@/lib/utils";

import type {
  ConstructionStatus,
  ConstructionTask,
} from "@/features/projects/construction-types";

interface TaskChipProps {
  phaseId: string;
  taskIndex: number;
  task: ConstructionTask;
  onClick: () => void;
  onToggle: () => void;
}

/**
 * Pill-shaped task card. Lives inside a `PhaseRow` and renders as a
 * horizontally-laid chip.
 *
 * Status transitions only go forward — pending → in_progress → completed —
 * so the leading button is the next allowed step:
 *   • pending: shows an empty circle, click → in_progress.
 *   • in_progress: shows a half-circle, click → completed.
 *   • completed: disabled, shows a check; the server rejects reopens.
 *
 * Clicking the title opens the task detail modal. Toggle and title are
 * separate click targets so ticking the circle never opens the modal by
 * accident.
 */
export function TaskChip({
  phaseId,
  taskIndex,
  task,
  onClick,
  onToggle,
}: TaskChipProps) {
  const t = useTranslations("MilestoneManagement.task");
  const tShared = useTranslations("ConstructionShared");
  const format = useFormatter();

  const status: ConstructionStatus = task.status;
  const done = status === "completed";
  const inProgress = status === "in_progress";

  const toggleLabel = done
    ? t("taskCompleted")
    : inProgress
      ? t("markDone")
      : t("markInProgress");

  // The header chip shows the planned end date when set, the actual
  // finish date when complete — mirrors the milestone header rule.
  const visibleDate = done
    ? (task.actualAt ?? task.estimateAt)
    : (task.estimateAt ?? task.actualStartAt);

  return (
    <article
      data-task-key={`${phaseId}:${taskIndex}`}
      className={cn(
        "group flex w-full items-start gap-2 rounded-md border bg-card px-2.5 py-2",
        // Reacts to a hover anywhere on the chip, including the dead
        // space between the toggle and the title — the whole pill is one
        // task, so lighting up only the text would read as two things.
        "transition-[border-color,box-shadow] duration-150 ease-out hover:border-foreground/25 hover:shadow-sm",
        done
          ? "border-emerald-500/40 bg-emerald-500/5"
          : inProgress
            ? "border-amber-500/40 bg-amber-500/5"
            : "border-border/60"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={done}
        aria-label={toggleLabel}
        title={toggleLabel}
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          done
            ? "border-emerald-500/70 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 cursor-default"
            : inProgress
              ? "border-amber-500/70 bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:border-amber-600"
              : "border-border bg-card text-muted-foreground hover:border-foreground/40"
        )}
      >
        {done ? (
          <CheckCircle2 className="size-3" aria-hidden />
        ) : inProgress ? (
          <CircleDot className="size-3" aria-hidden />
        ) : (
          <Circle className="size-2.5" aria-hidden />
        )}
      </button>

      <button
        type="button"
        onClick={onClick}
        className={cn(
          pressable,
          "group/title flex min-w-0 flex-1 flex-col items-start gap-1 rounded-sm text-left"
        )}
      >
        <span
          className={cn(
            // Underlined on hover so it's clear the title itself opens the
            // task detail, as distinct from the circle beside it, which
            // changes the status without opening anything.
            "line-clamp-2 text-xs font-medium leading-snug underline-offset-2 group-hover/title:underline",
            done && "text-muted-foreground line-through"
          )}
        >
          {task.name}
        </span>

        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground">
          {visibleDate ? (
            <span className="inline-flex items-center gap-0.5">
              <CalendarDays className="size-2.5" aria-hidden />
              {format.dateTime(new Date(visibleDate), {
                month: "short",
                day: "numeric",
              })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 opacity-70">
              <CalendarDays className="size-2.5" aria-hidden />
              {tShared("schedule.noTasks")}
            </span>
          )}
        </span>
      </button>
    </article>
  );
}
