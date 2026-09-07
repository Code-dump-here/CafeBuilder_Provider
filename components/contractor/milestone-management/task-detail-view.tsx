"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  CalendarDays,
  CheckCircle,
  Circle,
  Clock,
  ImageIcon,
  Pencil,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { pressable } from "@/lib/interactive";
import { cn } from "@/lib/utils";

import type {
  ConstructionStatus,
  ConstructionTask,
} from "@/features/projects/construction-types";

interface TaskDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ConstructionTask | null;
  phaseLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
  /** Toggle task completion status (server-side pending → in_progress → completed). */
  onToggleStatus: () => void;
  /**
   * Opens the issues page filtered to this task's milestone.
   * Optional — when omitted the "Report issue" button is hidden.
   */
  onReportIssue?: () => void;
}

/**
 * Read-only view of a `ConstructionTask`. The full edit form lives in the
 * dedicated `TaskEditDialog`; this surface intentionally shows the four
 * calendar anchors and the two labour fields in their final shape, so the
 * user can confirm what was saved before they go to edit again.
 */
export function TaskDetailView(props: TaskDetailViewProps) {
  const {
    open,
    onOpenChange,
    task,
    phaseLabel,
    onEdit,
    onDelete,
    onToggleStatus,
    onReportIssue,
  } = props;
  const t = useTranslations("MilestoneManagement.task.detail");
  const tIssue = useTranslations("MilestoneManagement.issue");
  const tShared = useTranslations("ConstructionShared");
  const format = useFormatter();

  if (!task) return null;

  const status: ConstructionStatus = task.status;
  const done = status === "completed";
  const inProgress = status === "in_progress";

  const handleDelete = () => {
    onDelete();
    onOpenChange(false);
  };

  // What we show for the date strip mirrors the chip: planned when not
  // finished, actual when complete. Either may be null — we fall through
  // to the planned/actual pair rather than show "no date" on a finished
  // task that has its actual set.
  const visibleTarget = done
    ? (task.actualAt ?? task.estimateAt)
    : (task.estimateAt ?? task.actualAt);

  const visibleDuration = done
    ? task.actualDurationDays
    : task.plannedDurationDays;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"
        showCloseButton={true}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span>{phaseLabel ?? t("title")}</span>
          </div>
        </div>

        <DialogTitle className="sr-only">{task.name}</DialogTitle>

        <div className="flex flex-col gap-5 pt-2">
          {/* Title + meta strip */}
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold leading-tight">
                {task.name}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onToggleStatus}
                disabled={done}
                className="shrink-0 gap-1.5"
                title={
                  done
                    ? tShared("status.completed")
                    : inProgress
                      ? t("markDone")
                      : t("markInProgress")
                }
              >
                {done ? (
                  <>
                    <CheckCircle
                      className="size-4 text-emerald-500"
                      aria-hidden
                    />
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {tShared("status.completed")}
                    </span>
                  </>
                ) : (
                  <>
                    <Circle
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                    <span>
                      {inProgress ? t("markDone") : t("markInProgress")}
                    </span>
                  </>
                )}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden />
                <span>
                  {t("created", {
                    date: format.dateTime(new Date(task.createdAt), {
                      dateStyle: "medium",
                    }),
                  })}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden />
                {visibleTarget
                  ? format.dateTime(new Date(visibleTarget), {
                      dateStyle: "medium",
                    })
                  : t("noDueDate")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                {done
                  ? tShared("duration.actual", {
                      count: task.actualDurationDays ?? 0,
                    })
                  : tShared("duration.planned", {
                      count: task.plannedDurationDays ?? 0,
                    })}
                {visibleDuration == null ? tShared("duration.noDates") : null}
              </span>
            </div>
          </div>

          {/* Description */}
          {task.description ? (
            <section className="flex flex-col gap-1.5">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("fields.description")}
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {task.description}
              </p>
            </section>
          ) : null}

          {/* Reference image */}
          <ImagesGallery
            src={task.imageViewUrl ?? null}
            alt={task.name}
            t={t}
          />

          {/* Labour cost */}
          {(task.estimatedLaborCost != null ||
            task.actualLaborCost != null) && (
            <section className="flex flex-col gap-1.5">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {tShared("cost.labor")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label={tShared("cost.estimated")}>
                  <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm">
                    {task.estimatedLaborCost != null
                      ? format.number(task.estimatedLaborCost)
                      : tShared("cost.unavailable")}
                  </div>
                </Field>
                <Field label={tShared("cost.actual")}>
                  <div
                    className={cn(
                      "rounded-md border bg-muted/40 px-3 py-2 text-sm",
                      task.actualLaborCost == null
                        ? "border-border/60 text-muted-foreground"
                        : "border-border/60",
                    )}
                  >
                    {task.actualLaborCost != null
                      ? format.number(task.actualLaborCost)
                      : tShared("cost.unavailable")}
                  </div>
                </Field>
              </div>
            </section>
          )}

          {/* Delay note */}
          {task.reason ? (
            <section className="flex flex-col gap-1.5">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("fields.reason")}
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {task.reason}
              </p>
            </section>
          ) : null}

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 aria-hidden />
                {t("deleteCta")}
              </Button>
              {onReportIssue ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onReportIssue}
                  className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400"
                >
                  <TriangleAlert aria-hidden />
                  {tIssue("addCta")}
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                {t("close")}
              </Button>
              <Button type="button" size="sm" onClick={onEdit}>
                <Pencil aria-hidden />
                {t("edit")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A single image reference (objectName / view URL pair). Click the thumb
 * to open a fullscreen preview overlay.
 */
function ImagesGallery({
  src,
  alt,
  t,
}: {
  src: string | null;
  alt: string;
  t: ReturnType<typeof useTranslations<"MilestoneManagement.task.detail">>;
}) {
  const [active, setActive] = React.useState<string | null>(null);

  if (!src) return null;

  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <ImageIcon className="size-3" aria-hidden />
        {t("fields.images")}
      </h3>
      <div>
        <button
          type="button"
          onClick={() => setActive(src)}
          className={cn(
            pressable,
            "group relative aspect-square w-32 overflow-hidden rounded-md border border-border/60 bg-muted hover:border-primary/60",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </button>
      </div>
      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active}
            alt={alt}
            className="max-h-full max-w-full rounded-md shadow-2xl"
          />
        </div>
      ) : null}
    </section>
  );
}
