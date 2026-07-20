"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { PhaseColumnHeader } from "@/components/contractor/milestone-management/phase-column-header";
import { TaskCard } from "@/components/contractor/milestone-management/task-card";

import type {
  MilestonePhase,
  MilestoneStatus,
} from "@/lib/contractor/construction-overview-data";

interface PhaseColumnProps {
  phase: MilestonePhase;
  index: number;
  lastIndex: number;
  doneCount: number;
  taskDone: Record<string, boolean>;
  onToggleTask: (phaseId: string, taskIndex: number) => void;
  onEditTask: (phaseId: string, taskIndex: number) => void;
  onDeleteTask: (phaseId: string, taskIndex: number) => void;
  onAddTask: (phaseId: string, title: string) => void;
  onRename: (phaseId: string) => void;
  onEditMeta: (phaseId: string) => void;
  onDelete: (phaseId: string) => void;
  onMoveLeft: (phaseId: string) => void;
  onMoveRight: (phaseId: string) => void;
  onStatusChange: (phaseId: string, status: MilestoneStatus) => void;
  /** Optional visual hint when the user navigates here from a hash. */
  highlight?: boolean;
}

/**
 * One column in the milestone Kanban. Owns its own "add task" composer
 * (inline Input + Enter/Escape) but everything else delegates upward so
 * the parent reducer is the single source of truth.
 */
export function PhaseColumn({
  phase,
  index,
  lastIndex,
  doneCount,
  taskDone,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onRename,
  onEditMeta,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onStatusChange,
  highlight,
}: PhaseColumnProps) {
  const t = useTranslations("MilestoneManagement.phase");
  const [draft, setDraft] = React.useState("");

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddTask(phase.id, trimmed);
    setDraft("");
  };

  return (
    <section
      data-phase-id={phase.id}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border bg-card/40 transition-colors",
        highlight ? "border-primary/60 ring-2 ring-primary/30" : "border-border/60"
      )}
    >
      <PhaseColumnHeader
        phase={phase}
        doneCount={doneCount}
        totalTasks={phase.tasks.length}
        index={index}
        lastIndex={lastIndex}
        onRename={() => onRename(phase.id)}
        onEditMeta={() => onEditMeta(phase.id)}
        onDelete={() => onDelete(phase.id)}
        onMoveLeft={() => onMoveLeft(phase.id)}
        onMoveRight={() => onMoveRight(phase.id)}
        onStatusChange={(s) => onStatusChange(phase.id, s)}
      />

      {/* Task list */}
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-2">
        {phase.tasks.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-2 py-3 text-center text-[11px] text-muted-foreground">
            {t("noTasks")}
          </p>
        ) : (
          phase.tasks.map((task, idx) => {
            const done = Boolean(taskDone[`${phase.id}:${idx}`]);
            return (
              <TaskCard
                key={`${phase.id}-${idx}`}
                task={task}
                done={done}
                onToggle={() => onToggleTask(phase.id, idx)}
                onEdit={() => onEditTask(phase.id, idx)}
                onDelete={() => onDeleteTask(phase.id, idx)}
              />
            );
          })
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-1.5 border-t border-border/60 px-3 py-2"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDraft("");
          }}
          placeholder={t("addTaskPlaceholder")}
          className="h-7 text-xs"
          aria-label={t("addTaskPlaceholder")}
        />
        <Button
          type="submit"
          size="icon-sm"
          variant="outline"
          disabled={!draft.trim()}
          aria-label={t("addTaskCta")}
        >
          <Plus aria-hidden />
        </Button>
      </form>
    </section>
  );
}