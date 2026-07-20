"use client";

import { useFormatter, useTranslations } from "next-intl";
import { CalendarDays, CheckCircle2, Circle, User } from "lucide-react";

import { cn } from "@/lib/utils";

import type { MilestoneTask } from "@/lib/contractor/milestone-mgmt-state";

interface TaskChipProps {
  phaseId: string;
  taskIndex: number;
  task: MilestoneTask;
  done: boolean;
  assigneeInitials?: string;
  assigneeName?: string;
  onClick: () => void;
  onToggle: () => void;
}

/**
 * Pill-shaped, horizontally-laid task card. Lives inside a `PhaseRow`
 * and renders as a horizontal-scroll-friendly chip:
 *
 *   [ ○  Stud framing on north+west walls     Khoi  Jul 24 ]
 *
 * Clicking the title opens the task detail modal. The leading circle
 * toggles done state inline (a separate click target so the modal
 * doesn't pop open when the user just wants to tick the box).
 */
export function TaskChip({
  phaseId,
  taskIndex,
  task,
  done,
  assigneeInitials,
  assigneeName,
  onClick,
  onToggle,
}: TaskChipProps) {
  const t = useTranslations("MilestoneManagement.task");
  const format = useFormatter();

  return (
    <article
      data-task-key={`${phaseId}:${taskIndex}`}
      className={cn(
        "group flex w-full items-start gap-2 rounded-md border bg-card px-2.5 py-2 transition-colors hover:border-border/80",
        done ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/60"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? t("markUndone") : t("markDone")}
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          done
            ? "border-emerald-500/70 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
            : "border-border bg-card text-muted-foreground hover:border-foreground/40"
        )}
      >
        {done ? (
          <CheckCircle2 className="size-3" aria-hidden />
        ) : (
          <Circle className="size-2.5" aria-hidden />
        )}
      </button>

      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-start gap-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        )}
      >
        <span
          className={cn(
            "line-clamp-2 text-xs font-medium leading-snug",
            done && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </span>

        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground">
          {assigneeInitials ? (
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="flex size-4 items-center justify-center rounded-full bg-primary/15 text-[8px] font-semibold uppercase text-primary"
                title={assigneeName}
              >
                {assigneeInitials}
              </span>
              {assigneeName ? (
                <span className="max-w-[80px] truncate">{assigneeName}</span>
              ) : null}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <User className="size-2.5" aria-hidden />
              {t("noAssignee")}
            </span>
          )}
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