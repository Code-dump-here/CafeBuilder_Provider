"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { TaskChip } from "@/components/contractor/milestone-management/task-chip";

import type {
  MilestonePhase,
  MilestoneStatus,
} from "@/lib/contractor/construction-overview-data";
import type { MilestoneTask } from "@/lib/contractor/milestone-mgmt-state";
import type { ConstructionStatus } from "@/features/projects/construction-types";

import { PhaseRowHeader } from "@/components/contractor/milestone-management/phase-row-header";

/**
 * Everything a row needs to take part in drag-to-reorder. Supplied by the page,
 * which owns the list and the `useDragReorder` instance; absent when the list
 * isn't reorderable.
 */
export interface PhaseReorder {
  /** Spread on the row — the row is the drop target. */
  containerProps: React.HTMLAttributes<HTMLElement>;
  /** Spread on the grip — the grip is the drag source. */
  handleProps: React.HTMLAttributes<HTMLElement> & { draggable: boolean };
  isDragging: boolean;
  /** Which edge to draw the drop indicator on, or null when not a target. */
  dropEdge: "top" | "bottom" | null;
  /**
   * False for completed milestones. Signed-off work keeps the order it was
   * done in, so the grip is shown locked rather than hidden — a missing handle
   * on one row looks like a rendering bug, a locked one explains itself.
   */
  canMove: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

interface PhaseRowProps {
  phase: MilestonePhase;
  index: number;
  reorder?: PhaseReorder;
  taskMeta: Record<string, MilestoneTask>;
  taskStatus: Record<string, ConstructionStatus>;
  onToggleTask: (phaseId: string, taskIndex: number) => void;
  onOpenTask: (phaseId: string, taskIndex: number) => void;
  onRequestAddTask: (phaseId: string) => void;
  onRename: (phaseId: string) => void;
  onEditMeta: (phaseId: string) => void;
  onDelete: (phaseId: string) => void;
  onOpenNotes: (phaseId: string) => void;
  onOpenChecklist: (phaseId: string) => void;
  onOpenMaterials: (phaseId: string) => void;
  onStatusChange: (phaseId: string, status: MilestoneStatus) => void;
  highlight?: boolean;
}

export function PhaseRow(props: PhaseRowProps) {
  const { phase, index, reorder, taskMeta, taskStatus, highlight, onToggleTask, onOpenTask, onRequestAddTask, onRename, onEditMeta, onDelete, onOpenNotes, onOpenChecklist, onOpenMaterials, onStatusChange } = props;
  const t = useTranslations("MilestoneManagement.phase");

  const doneCount = phase.tasks.reduce(
    (acc, _t, idx) => acc + (taskStatus[`${phase.id}:${idx}`] === "completed" ? 1 : 0),
    0
  );

  return (
    <section
      {...(reorder?.containerProps ?? {})}
      data-phase-id={phase.id}
      className={cn(
        "relative flex flex-col gap-2.5 rounded-lg border bg-card/30 p-3 transition-colors",
        highlight ? "border-primary/60 ring-2 ring-primary/30" : "border-border/60",
        reorder?.isDragging ? "opacity-40" : null
      )}
    >
      {/* Where the dragged milestone would land. Drawn on the row being hovered
          rather than as a gap in the list, so nothing reflows mid-drag. */}
      {reorder?.dropEdge ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-2 h-0.5 rounded-full bg-primary",
            reorder.dropEdge === "top" ? "-top-px" : "-bottom-px"
          )}
        />
      ) : null}

      <div className="flex items-start gap-1.5">
        {reorder ? (
          <button
            type="button"
            {...reorder.handleProps}
            disabled={!reorder.canMove}
            aria-label={reorder.canMove ? t("dragHandle") : t("dragHandleLocked")}
            title={reorder.canMove ? t("dragHandle") : t("dragHandleLocked")}
            className={cn(
              "mt-0.5 shrink-0 rounded p-1 text-muted-foreground transition-colors",
              reorder.canMove
                ? "cursor-grab hover:bg-accent hover:text-foreground active:cursor-grabbing"
                : "cursor-not-allowed opacity-40"
            )}
          >
            <GripVertical aria-hidden className="size-4" />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <PhaseRowHeader
            phase={phase}
            index={index}
            doneCount={doneCount}
            onRename={onRename}
            onEditMeta={onEditMeta}
            onDelete={onDelete}
            onOpenNotes={onOpenNotes}
            onOpenChecklist={onOpenChecklist}
            onOpenMaterials={onOpenMaterials}
            onStatusChange={onStatusChange}
            reorder={
              reorder && reorder.canMove
                ? {
                    onMoveUp: reorder.onMoveUp,
                    onMoveDown: reorder.onMoveDown,
                    canMoveUp: reorder.canMoveUp,
                    canMoveDown: reorder.canMoveDown,
                  }
                : undefined
            }
          />
        </div>
      </div>

      {/* Tasks indented below the milestone name */}
      <div className="flex flex-col gap-1.5 pl-4 sm:pl-10">
        {phase.tasks.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-3 text-[11px] text-muted-foreground">
            {t("noTasks")}
          </p>
        ) : (
          phase.tasks.map((_title, idx) => {
            const key = `${phase.id}:${idx}`;
            const meta = taskMeta[key];
            return (
              <TaskChip
                key={key}
                phaseId={phase.id}
                taskIndex={idx}
                task={meta ?? { id: key, title: phase.tasks[idx] ?? "" }}
                status={taskStatus[key] ?? "pending"}
                onClick={() => onOpenTask(phase.id, idx)}
                onToggle={() => onToggleTask(phase.id, idx)}
              />
            );
          })
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onRequestAddTask(phase.id)}
          className="mt-1 self-start"
        >
          <Plus aria-hidden />
          {t("addTaskCta")}
        </Button>
      </div>
    </section>
  );
}