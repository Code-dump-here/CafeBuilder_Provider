"use client";

import { useFormatter, useTranslations } from "next-intl";
import { CalendarDays, CheckCircle2, Circle, CircleDot } from "lucide-react";

import { pressable } from "@/lib/interactive";
import { cn } from "@/lib/utils";

import type { ConstructionStatus } from "@/features/projects/construction-types";
import type { MilestoneTask } from "@/lib/contractor/milestone-mgmt-state";

interface TaskChipProps {
  phaseId: string;
  taskIndex: number;
  task: MilestoneTask;
  status: ConstructionStatus;
  onClick: () => void;
  onToggle: () => void;
}

/**
 * Pill-shaped, horizontally-laid task card. Lives inside a `PhaseRow`
 * and renders as a horizontal-scroll-friendly chip:
 *
 *   [ ○  Stud framing on north+west walls     Jul 24 ]
 *
 * Clicking the title opens the task detail modal. The leading circle
 * toggles status inline (a separate click target so the modal doesn't pop
 * open when the user just wants to tick the box) — one step at a time,
 * matching the backend's pending → in_progress → completed rule. It used
 * to be a plain checked/unchecked circle collapsed from `status ===
 * "completed"`, so clicking a pending task moved it to in_progress with no
 * visible change at all — the click looked like it did nothing. Completed
 * is a dead end: the backend never allows reopening a finished task, so
 * the toggle disables once done instead of offering an action that would
 * just fail.
 */
export function TaskChip({
  phaseId,
  taskIndex,
  task,
  status,
  onClick,
  onToggle,
}: TaskChipProps) {
  const t = useTranslations("MilestoneManagement.task");
  const format = useFormatter();

  const done = status === "completed";
  const inProgress = status === "in_progress";

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
        aria-label={done ? t("taskCompleted") : inProgress ? t("markDone") : t("markInProgress")}
        title={done ? t("taskCompleted") : inProgress ? t("markDone") : t("markInProgress")}
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
          {task.title}
        </span>

        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground">
          {task.dueDate ? (
            <span className="inline-flex items-center gap-0.5">
              <CalendarDays className="size-2.5" aria-hidden />
              {format.dateTime(new Date(task.dueDate), {
                month: "short",
                day: "numeric",
              })}
            </span>
          ) : null}
        </span>
      </button>
    </article>
  );
}