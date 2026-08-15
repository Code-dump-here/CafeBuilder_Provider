"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
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

interface PhaseRowProps {
  phase: MilestonePhase;
  index: number;
  taskMeta: Record<string, MilestoneTask>;
  taskStatus: Record<string, ConstructionStatus>;
  resolveAssignee: (id: string | undefined) => { initials: string; name: string } | undefined;
  onToggleTask: (phaseId: string, taskIndex: number) => void;
  onOpenTask: (phaseId: string, taskIndex: number) => void;
  onRequestAddTask: (phaseId: string) => void;
  onRename: (phaseId: string) => void;
  onEditMeta: (phaseId: string) => void;
  onDelete: (phaseId: string) => void;
  onStatusChange: (phaseId: string, status: MilestoneStatus) => void;
  highlight?: boolean;
}

export function PhaseRow(props: PhaseRowProps) {
  const { phase, index, taskMeta, taskStatus, resolveAssignee, highlight, onToggleTask, onOpenTask, onRequestAddTask, onRename, onEditMeta, onDelete, onStatusChange } = props;
  const t = useTranslations("MilestoneManagement.phase");

  const doneCount = phase.tasks.reduce(
    (acc, _t, idx) => acc + (taskStatus[`${phase.id}:${idx}`] === "completed" ? 1 : 0),
    0
  );

  return (
    <section
      data-phase-id={phase.id}
      className={cn(
        "flex flex-col gap-2.5 rounded-lg border bg-card/30 p-3 transition-colors",
        highlight ? "border-primary/60 ring-2 ring-primary/30" : "border-border/60"
      )}
    >
      <PhaseRowHeader
        phase={phase}
        index={index}
        doneCount={doneCount}
        onRename={onRename}
        onEditMeta={onEditMeta}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
      />

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
            const assignee = resolveAssignee(meta?.assigneeId);
            return (
              <TaskChip
                key={key}
                phaseId={phase.id}
                taskIndex={idx}
                task={meta ?? { id: key, title: phase.tasks[idx] ?? "" }}
                status={taskStatus[key] ?? "pending"}
                assigneeInitials={assignee?.initials}
                assigneeName={assignee?.name}
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