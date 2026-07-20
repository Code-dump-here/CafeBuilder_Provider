"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { MilestoneManagementToolbar } from "@/components/contractor/milestone-management/toolbar";
import { PhaseRow } from "@/components/contractor/milestone-management/phase-row";
import { PhaseEditDialog, type PhaseEditInput } from "@/components/contractor/milestone-management/phase-edit-dialog";
import { TaskEditDialog } from "@/components/contractor/milestone-management/task-edit-dialog";
import { AddPhaseDialog } from "@/components/contractor/milestone-management/add-phase-dialog";
import { TaskDetailView } from "@/components/contractor/milestone-management/task-detail-view";
import { AddTaskModal } from "@/components/contractor/milestone-management/add-task-modal";

import {
  CURRENT_PHASE_ID,
  MOCK_CONSTRUCTION_OVERVIEW,
  phaseExtras,
  type MilestonePhase,
  type MilestoneStatus,
} from "@/lib/contractor/construction-overview-data";

import {
  countDone,
  deriveProgressFromTasks,
  milestoneReducer,
  type MilestoneState,
} from "@/lib/contractor/milestone-mutations";
import {
  resolveTask,
  taskKey,
  type MilestoneTask,
} from "@/lib/contractor/milestone-mgmt-state";

/**
 * `/[locale]/projects/{id}/milestones`
 *
 * Row-based milestone + task management. Each phase renders as a row
 * with its start/end dates + status on the header, and tasks indented
 * below. Clicking a task opens a read-only TaskDetailView with full
 * metadata; "Add task" opens a modal that captures all metadata up
 * front (description, assignee, due date, image attachments).
 */
export default function MilestoneManagementPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "";
  const t = useTranslations("MilestoneManagement");

  const [state, dispatch] = React.useReducer(milestoneReducer, undefined, () => seedFromMock());

  // Phase dialogs
  const [addPhaseOpen, setAddPhaseOpen] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<MilestonePhase | null>(null);
  const [editMetaTarget, setEditMetaTarget] = React.useState<MilestonePhase | null>(null);

  // Edit dialog (triggered from TaskDetailView "Edit" button)
  const [taskEdit, setTaskEdit] = React.useState<{
    open: boolean;
    phaseId: string | null;
    taskIndex: number | null;
    initialTitle: string;
  }>({ open: false, phaseId: null, taskIndex: null, initialTitle: "" });

  // Read-only task detail view
  const [taskDetail, setTaskDetail] = React.useState<{
    open: boolean;
    phaseId: string | null;
    taskIndex: number | null;
  }>({ open: false, phaseId: null, taskIndex: null });

  // Add task modal (driven by PhaseRow's "Add task" CTA)
  const [addTaskTarget, setAddTaskTarget] = React.useState<string | null>(null);

  // Hash-based highlighting
  const [highlightId, setHighlightId] = React.useState<string | null>(null);
  React.useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && state.phases.some((p) => p.id === hash)) {
      setHighlightId(hash);
      const t = setTimeout(() => setHighlightId(null), 2500);
      return () => clearTimeout(t);
    }
  }, [state.phases]);

  // Aggregate counts
  const totalTasks = state.phases.reduce((acc, p) => acc + p.tasks.length, 0);
  const doneTaskCount = state.phases.reduce(
    (acc, p) => acc + countDone(p.id, p.tasks.length, state.taskDone),
    0
  );

  // Phase for active task detail / add-task modal — used to resolve crew
  const activePhase: MilestonePhase | undefined = React.useMemo(() => {
    const id = taskDetail.phaseId ?? addTaskTarget;
    if (!id) return undefined;
    return state.phases.find((p) => p.id === id);
  }, [taskDetail.phaseId, addTaskTarget, state.phases]);

  const detailTask: MilestoneTask | null = React.useMemo(() => {
    if (!activePhase || taskDetail.taskIndex == null) return null;
    return resolveTask(
      activePhase.id,
      taskDetail.taskIndex,
      activePhase.tasks[taskDetail.taskIndex] ?? "",
      state.taskMeta
    );
  }, [activePhase, taskDetail.taskIndex, state.taskMeta]);

  const crewOptions = React.useMemo(() => {
    if (!activePhase) return [];
    const crew = state.extras[activePhase.id]?.crew ?? [];
    return crew.map((c) => ({ id: c.id, name: c.name, initials: c.initials }));
  }, [activePhase, state.extras]);

  const resolveAssignee = React.useCallback(
    (id: string | undefined) => {
      if (!id || !activePhase) return undefined;
      const member = (state.extras[activePhase.id]?.crew ?? []).find((c) => c.id === id);
      if (!member) return undefined;
      return { initials: member.initials, name: member.name };
    },
    [activePhase, state.extras]
  );

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleToggleTask = (phaseId: string, taskIndex: number) => {
    const phase = state.phases.find((p) => p.id === phaseId);
    if (!phase) return;
    const nextDone = {
      ...state.taskDone,
      [taskKey(phaseId, taskIndex)]: !state.taskDone[taskKey(phaseId, taskIndex)],
    };
    dispatch({ type: "toggle_task", phaseId, taskIndex });
    const nextProgress = deriveProgressFromTasks(phaseId, phase.tasks, nextDone);
    dispatch({ type: "set_phase_progress", phaseId, progress: nextProgress });
  };

  const handleOpenTask = (phaseId: string, taskIndex: number) => {
    setTaskDetail({ open: true, phaseId, taskIndex });
  };

  const handleStartAddTask = (phaseId: string) => {
    setAddTaskTarget(phaseId);
  };

  const handleAddTask = (input: {
    title: string;
    description: string;
    assigneeId: string | null;
    dueDate: string | null;
    images: string[];
  }) => {
    if (!addTaskTarget) return;
    dispatch({
      type: "add_task",
      phaseId: addTaskTarget,
      title: input.title,
      description: input.description || undefined,
      dueDate: input.dueDate ?? undefined,
      assigneeId: input.assigneeId ?? undefined,
      images: input.images,
    });
    setAddTaskTarget(null);
  };

  const handleDeleteTask = (phaseId: string, taskIndex: number) => {
    if (!window.confirm(t("phase.deleteConfirm"))) return;
    dispatch({ type: "remove_task", phaseId, taskIndex });
    setTaskDetail((prev) => ({ ...prev, open: false }));
  };

  const handleEditTaskFromDetail = () => {
    if (taskDetail.phaseId == null || taskDetail.taskIndex == null) return;
    const phase = state.phases.find((p) => p.id === taskDetail.phaseId);
    if (!phase) return;
    setTaskEdit({
      open: true,
      phaseId: phase.id,
      taskIndex: taskDetail.taskIndex,
      initialTitle: phase.tasks[taskDetail.taskIndex] ?? "",
    });
  };

  const handleRenamePhase = (phaseId: string) => {
    const phase = state.phases.find((p) => p.id === phaseId);
    if (!phase) return;
    setRenameTarget(phase);
  };

  const handleEditMeta = (phaseId: string) => {
    const phase = state.phases.find((p) => p.id === phaseId);
    if (!phase) return;
    setEditMetaTarget(phase);
  };

  const handleDeletePhase = (phaseId: string) => {
    if (!window.confirm(t("phase.deleteConfirm"))) return;
    dispatch({ type: "remove_phase", phaseId });
  };

  const handleMoveLeft = (phaseId: string) => {
    dispatch({ type: "move_phase", phaseId, direction: "left" });
  };

  const handleMoveRight = (phaseId: string) => {
    dispatch({ type: "move_phase", phaseId, direction: "right" });
  };

  const handleStatusChange = (phaseId: string, status: MilestoneStatus) => {
    dispatch({ type: "set_phase_status", phaseId, status });
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (state.phases.length === 0) {
    return (
      <>
        <MilestoneManagementToolbar
          projectId={projectId}
          phaseCount={0}
          taskCount={0}
          doneTaskCount={0}
          onAddPhase={() => setAddPhaseOpen(true)}
        />
        <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
          {t("errorEmpty")}
        </p>
        <AddPhaseDialog
          open={addPhaseOpen}
          onOpenChange={setAddPhaseOpen}
          onSubmit={(input) => dispatch({ type: "add_phase", ...input })}
        />
      </>
    );
  }

  const lastIndex = state.phases.length - 1;

  return (
    <>
      <MilestoneManagementToolbar
        projectId={projectId}
        phaseCount={state.phases.length}
        taskCount={totalTasks}
        doneTaskCount={doneTaskCount}
        onAddPhase={() => setAddPhaseOpen(true)}
      />

      <div className="mt-3 flex flex-col gap-3">
        {state.phases.map((phase, idx) => (
          <PhaseRow
            key={phase.id}
            phase={phase}
            index={idx}
            lastIndex={lastIndex}
            taskMeta={state.taskMeta}
            taskDone={state.taskDone}
            resolveAssignee={resolveAssignee}
            highlight={highlightId === phase.id}
            onToggleTask={handleToggleTask}
            onOpenTask={handleOpenTask}
            onRequestAddTask={handleStartAddTask}
            onRename={handleRenamePhase}
            onEditMeta={handleEditMeta}
            onDelete={handleDeletePhase}
            onMoveLeft={handleMoveLeft}
            onMoveRight={handleMoveRight}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {/* Phase dialogs */}
      <AddPhaseDialog
        open={addPhaseOpen}
        onOpenChange={setAddPhaseOpen}
        onSubmit={(input) => dispatch({ type: "add_phase", ...input })}
      />
      <PhaseEditDialog
        phase={renameTarget}
        mode="rename"
        open={renameTarget !== null}
        onOpenChange={(o) => {
          if (!o) setRenameTarget(null);
        }}
        onSubmit={({ label }) => {
          if (!renameTarget) return;
          dispatch({ type: "rename_phase", phaseId: renameTarget.id, label });
        }}
      />
      <PhaseEditDialog
        phase={editMetaTarget}
        mode="editMeta"
        open={editMetaTarget !== null}
        onOpenChange={(o) => {
          if (!o) setEditMetaTarget(null);
        }}
        onSubmit={(input: PhaseEditInput) => {
          if (!editMetaTarget) return;
          dispatch({ type: "update_phase_meta", phaseId: editMetaTarget.id, ...input });
        }}
      />

      {/* Task dialogs */}
      <TaskEditDialog
        open={taskEdit.open}
        onOpenChange={(o) => {
          if (!o) setTaskEdit((prev) => ({ ...prev, open: false }));
        }}
        initialTitle={taskEdit.initialTitle}
        onSubmit={(title) => {
          if (taskEdit.phaseId == null || taskEdit.taskIndex == null) return;
          dispatch({ type: "edit_task", phaseId: taskEdit.phaseId, taskIndex: taskEdit.taskIndex, title });
        }}
      />

      <AddTaskModal
        open={addTaskTarget !== null}
        onOpenChange={(o) => {
          if (!o) setAddTaskTarget(null);
        }}
        phaseLabel={state.phases.find((p) => p.id === addTaskTarget)?.label}
        crewOptions={crewOptions}
        onSubmit={handleAddTask}
      />

      <TaskDetailView
        open={taskDetail.open}
        onOpenChange={(o) => {
          if (!o) setTaskDetail((prev) => ({ ...prev, open: false }));
        }}
        task={detailTask}
        phaseLabel={activePhase?.label}
        crewOptions={crewOptions}
        onEdit={handleEditTaskFromDetail}
        onDelete={() => {
          if (taskDetail.phaseId == null || taskDetail.taskIndex == null) return;
          handleDeleteTask(taskDetail.phaseId, taskDetail.taskIndex);
        }}
      />
    </>
  );
}

// ─── Seed ────────────────────────────────────────────────────────────────────

function seedFromMock(): MilestoneState {
  const phases: MilestonePhase[] = MOCK_CONSTRUCTION_OVERVIEW.phases.map(
    (p) => ({ ...p, tasks: [...p.tasks] })
  );
  const taskDone: Record<string, boolean> = {};
  const taskMeta: Record<string, MilestoneTask> = {};

  const current = phases.find((p) => p.id === CURRENT_PHASE_ID);
  if (!current) {
    return { phases, extras: { ...phaseExtras }, taskDone, taskMeta };
  }

  current.tasks.forEach((_t, idx) => {
    if (idx === 0 || idx === 1) taskDone[`${current.id}:${idx}`] = true;
  });

  const crew = phaseExtras[current.id]?.crew ?? [];
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();

  current.tasks.forEach((title, idx) => {
    const key = `${current.id}:${idx}`;
    if (idx === 2) {
      taskMeta[key] = {
        id: key,
        title,
        description:
          "Upgrade existing 100A panel to 200A to support new HVAC + bar equipment. Need utility sign-off before energizing the new sub-feed.",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        assigneeId: crew[2]?.id,
        createdAt: fourDaysAgo,
        images: [
          "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=400&h=400&fit=crop",
          "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop",
        ],
      };
    } else if (idx === 3) {
      taskMeta[key] = {
        id: key,
        title,
        description:
          "Route HVAC ductwork above the dropped ceiling on the south half. Coordinate with electrical rough-in to avoid clashes above the bar ceiling.",
        assigneeId: crew[3]?.id,
        createdAt: fiveDaysAgo,
      };
    }
  });

  return { phases, extras: { ...phaseExtras }, taskDone, taskMeta };
}