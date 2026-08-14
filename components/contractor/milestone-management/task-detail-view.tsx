"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CalendarDays, Clock, User, ImageIcon, Trash2, Pencil, TriangleAlert, CheckCircle, Circle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import type { MilestoneTask } from "@/lib/contractor/milestone-mgmt-state";
import type { ConstructionStatus } from "@/features/projects/construction-types";

interface CrewMember {
  id: string;
  name: string;
  initials: string;
}

interface TaskDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: MilestoneTask | null;
  phaseLabel?: string;
  crewOptions: CrewMember[];
  onEdit: () => void;
  onDelete: () => void;
  /** Toggle task completion status */
  onToggleStatus: () => void;
  /**
   * Opens the issues page filtered to this task's milestone.
   * Optional — when omitted the "Report issue" button is hidden.
   */
  onReportIssue?: () => void;
}

export function TaskDetailView(props: TaskDetailViewProps) {
  const { open, onOpenChange, task, phaseLabel, crewOptions, onEdit, onDelete, onToggleStatus, onReportIssue } = props;
  const t = useTranslations("MilestoneManagement.task.detail");
  const tIssue = useTranslations("MilestoneManagement.issue");
  const format = useFormatter();

  if (!task) return null;

  const assignee = task.assigneeId
    ? crewOptions.find((c) => c.id === task.assigneeId)
    : undefined;

  const handleDelete = () => {
    onDelete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl" showCloseButton={true}>
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span>{phaseLabel ?? t("title")}</span>
          </div>
        </div>

        <DialogTitle className="sr-only">{task.title}</DialogTitle>

        <div className="flex flex-col gap-5 pt-2">
          {/* Title + meta strip */}
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold leading-tight">{task.title}</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onToggleStatus}
                disabled={(task as { status?: ConstructionStatus }).status === "completed"}
                className="shrink-0 gap-1.5"
              >
                {(task as { status?: ConstructionStatus }).status === "completed" ? (
                  <>
                    <CheckCircle className="size-4 text-emerald-500" aria-hidden />
                    <span className="text-emerald-600 dark:text-emerald-400">Hoàn thành</span>
                  </>
                ) : (
                  <>
                    <Circle className="size-4 text-muted-foreground" aria-hidden />
                    <span>Đánh dấu xong</span>
                  </>
                )}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden />
                <span>{t("created", { date: format.dateTime(new Date(task.createdAt ?? new Date().toISOString()), { dateStyle: "medium" }) })}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <User className="size-3.5" aria-hidden />
                {assignee ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold uppercase text-primary">
                      {assignee.initials}
                    </span>
                    <span className="font-medium text-foreground">{assignee.name}</span>
                  </span>
                ) : (
                  <span>{t("noAssigneeOption")}</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden />
                {task.dueDate
                  ? format.dateTime(new Date(task.dueDate), { dateStyle: "medium" })
                  : t("noDueDate")}
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

          {/* Images gallery */}
          <ImagesGallery images={task.images ?? []} t={t} />

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
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
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
 * Read-only image gallery. Click any thumbnail to open a fullscreen
 * preview overlay.
 */
function ImagesGallery({
  images,
  t,
}: {
  images: string[];
  t: ReturnType<typeof useTranslations<"MilestoneManagement.task.detail">>;
}) {
  const [active, setActive] = React.useState<string | null>(null);

  if (images.length === 0) return null;

  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <ImageIcon className="size-3" aria-hidden />
        {t("fields.images")}
        <span className="text-[10px] text-muted-foreground">({images.length})</span>
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((src, idx) => (
          <button
            key={`${src}-${idx}`}
            type="button"
            onClick={() => setActive(src)}
            className="group relative aspect-square overflow-hidden rounded-md border border-border/60 bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </button>
        ))}
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
            alt=""
            className="max-h-full max-w-full rounded-md shadow-2xl"
          />
        </div>
      ) : null}
    </section>
  );
}