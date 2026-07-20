"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CalendarDays, ClipboardCheck, Clock, User, X, ImageIcon, Trash2, Pencil } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { MilestoneTask } from "@/lib/contractor/milestone-mgmt-state";

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
}

export function TaskDetailView(props: TaskDetailViewProps) {
  const { open, onOpenChange, task, phaseLabel, crewOptions, onEdit, onDelete } = props;
  const t = useTranslations("MilestoneManagement.task.detail");
  const tDeleteConfirm = useTranslations("MilestoneManagement.task");
  const format = useFormatter();

  if (!task) return null;

  const assignee = task.assigneeId
    ? crewOptions.find((c) => c.id === task.assigneeId)
    : undefined;

  const handleDelete = () => {
    if (!window.confirm(tDeleteConfirm("deleteConfirm"))) return;
    onDelete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <ClipboardCheck className="size-3.5" aria-hidden />
            <span>{phaseLabel ?? t("title")}</span>
          </div>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t("close")}>
              <X aria-hidden />
            </Button>
          </DialogClose>
        </div>

        <DialogTitle className="sr-only">{task.title}</DialogTitle>

        <div className="flex flex-col gap-5 pt-2">
          {/* Title + meta strip */}
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold leading-tight">{task.title}</h2>
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

          {/* Checklist / work-to-do */}
          <Checklist taskId={task.id} t={t} />

          {/* Images gallery */}
          <ImagesGallery images={task.images ?? []} t={t} />

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
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
 * Default checklist of "what needs to be done" inside the task. For
 * now it's a static set of best-practice items so the task view feels
 * useful out of the box. When the backend lands, this becomes a
 * server-persisted checklist keyed by `task.id`.
 */
function Checklist({ taskId, t }: { taskId: string; t: ReturnType<typeof useTranslations<"MilestoneManagement.task.detail">> }) {
  const [done, setDone] = React.useState<Record<number, boolean>>({});
  const items = [
    t("checklist.prepare"),
    t("checklist.execute"),
    t("checklist.verify"),
    t("checklist.log"),
  ];
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {t("fields.checklist")}
      </h3>
      <ul className="flex flex-col gap-1 rounded-md border border-border/60 bg-muted/20 p-2">
        {items.map((label, idx) => {
          const checked = Boolean(done[idx]);
          return (
            <li key={`${taskId}-${idx}`}>
              <button
                type="button"
                onClick={() => setDone((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left text-xs hover:bg-background/60",
                  checked && "text-muted-foreground"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-emerald-500/70 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "border-border bg-card"
                  )}
                >
                  {checked ? "✓" : ""}
                </span>
                <span className={cn(checked && "line-through")}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
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