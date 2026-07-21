"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

import { MilestoneManagementToolbar } from "@/components/contractor/milestone-management/toolbar";
import { PhaseRow } from "@/components/contractor/milestone-management/phase-row";
import { PhaseEditDialog, type PhaseEditInput } from "@/components/contractor/milestone-management/phase-edit-dialog";
import { TaskEditDialog } from "@/components/contractor/milestone-management/task-edit-dialog";
import { AddPhaseDialog } from "@/components/contractor/milestone-management/add-phase-dialog";
import { TaskDetailView } from "@/components/contractor/milestone-management/task-detail-view";
import { AddTaskModal } from "@/components/contractor/milestone-management/add-task-modal";

import { useProjectDetail } from "@/lib/projects/use-project-detail";
import {
  useConstructionItems,
  useCreateConstructionItemMutation,
  useUpdateConstructionItemMutation,
  useSetConstructionItemStatusMutation,
  useDeleteConstructionItemMutation,
  useConstructionTasks,
  useCreateConstructionTaskMutation,
  useUpdateConstructionTaskMutation,
  useSetConstructionTaskStatusMutation,
  useDeleteConstructionTaskMutation,
} from "@/lib/projects/use-construction";
import type {
  ConstructionItem,
  ConstructionTask,
  ConstructionStatus,
} from "@/lib/projects/construction-types";

// ─── Map API types to component types ────────────────────────────────────────

/** Map API status to the component's expected status format */
function mapItemStatus(status: ConstructionStatus): "completed" | "inProgress" | "blocked" | "upcoming" {
  switch (status) {
    case "completed":
      return "completed";
    case "in_progress":
      return "inProgress";
    case "pending":
      return "upcoming";
    default:
      return "upcoming";
  }
}

/** Map component status back to API status */
function unmapStatus(status: string): ConstructionStatus {
  switch (status) {
    case "completed":
      return "completed";
    case "inProgress":
      return "in_progress";
    case "blocked":
      return "pending"; // API doesn't have blocked, use pending
    case "upcoming":
      return "pending";
    default:
      return "pending";
  }
}

/**
 * `/[locale]/projects/{id}/milestones`
 *
 * Row-based milestone + task management. Fetches from
 * GET /api/construction-items and GET /api/construction-tasks.
 *
 * Each phase renders as a row with its start/end dates + status on the header,
 * and tasks indented below. Clicking a task opens a read-only TaskDetailView
 * with full metadata; "Add task" opens a modal.
 */
export default function MilestoneManagementPage() {
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id ?? "";
  const t = useTranslations("MilestoneManagement");

  // Get project to find the construction engagement (projectWorkingId)
  const { project, isLoading: isLoadingProject, isError: isProjectError } = useProjectDetail(projectIdParam);

  // Find the construction provider's projectWorkingId
  const constructionEngagement = React.useMemo(() => {
    return project.providers.find(
      (p) => p.capability === "construction" && p.status === "accepted"
    );
  }, [project.providers]);

  const projectWorkingId = constructionEngagement?.projectWorkingId;

  // Check if there's no construction engagement
  const hasNoConstructionEngagement = !constructionEngagement;

  // Fetch milestones (construction items)
  const {
    items: allItems,
    topLevelItems,
    subItemsByParent,
    isLoading: isLoadingItems,
    isFetching: isFetchingItems,
    isError: isItemsError,
    error: itemsError,
    refetch: refetchItems,
  } = useConstructionItems({
    projectWorkingId: projectWorkingId ?? 0,
    enabled: Boolean(projectWorkingId),
  });

  // Fetch all tasks for these milestones
  const {
    items: allTasks,
    isLoading: isLoadingTasks,
    isFetching: isFetchingTasks,
    refetch: refetchTasks,
  } = useConstructionTasks({
    enabled: Boolean(projectWorkingId),
  });

  // Mutations
  const createItem = useCreateConstructionItemMutation();
  const updateItem = useUpdateConstructionItemMutation();
  const setItemStatus = useSetConstructionItemStatusMutation();
  const deleteItem = useDeleteConstructionItemMutation();

  const createTask = useCreateConstructionTaskMutation();
  const updateTask = useUpdateConstructionTaskMutation();
  const setTaskStatus = useSetConstructionTaskStatusMutation();
  const deleteTask = useDeleteConstructionTaskMutation();

  // Group tasks by constructionItemId
  const tasksByItem = React.useMemo(() => {
    const grouped: Record<number, ConstructionTask[]> = {};
    for (const task of allTasks) {
      if (!grouped[task.constructionItemId]) {
        grouped[task.constructionItemId] = [];
      }
      grouped[task.constructionItemId]!.push(task);
    }
    return grouped;
  }, [allTasks]);

  // Convert API items to component format
  const phases: Array<{
    id: string;
    shortLabel: string;
    label: string;
    status: "completed" | "inProgress" | "blocked" | "upcoming";
    progress: number;
    targetDate: string;
    startDate: string;
    endDate: string;
    lead: string;
    tasks: string[];
    blockerCount: number;
    photoCount: number;
  }> = React.useMemo(() => {
    return topLevelItems.map((item) => {
      const itemTasks = tasksByItem[item.id] ?? [];
      const completedCount = itemTasks.filter((t) => t.status === "completed").length;
      const progress = itemTasks.length > 0
        ? Math.round((completedCount / itemTasks.length) * 100)
        : item.status === "completed" ? 100 : 0;

      return {
        id: String(item.id),
        shortLabel: item.category ?? item.name.slice(0, 12),
        label: item.name,
        status: mapItemStatus(item.status),
        progress,
        targetDate: item.estimateAt ?? "",
        startDate: "",
        endDate: item.estimateAt ?? "",
        lead: "",
        tasks: itemTasks.map((t) => t.name),
        blockerCount: 0,
        photoCount: 0,
      };
    });
  }, [topLevelItems, tasksByItem]);

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [addPhaseOpen, setAddPhaseOpen] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<{ id: string; label: string } | null>(null);
  const [editMetaTarget, setEditMetaTarget] = React.useState<ConstructionItem | null>(null);

  const [taskEdit, setTaskEdit] = React.useState<{
    open: boolean;
    itemId: number | null;
    taskIndex: number | null;
    initialTitle: string;
  }>({ open: false, itemId: null, taskIndex: null, initialTitle: "" });

  const [taskDetail, setTaskDetail] = React.useState<{
    open: boolean;
    itemId: number | null;
    taskIndex: number | null;
  }>({ open: false, itemId: null, taskIndex: null });

  const [addTaskTarget, setAddTaskTarget] = React.useState<number | null>(null);

  // Hash-based highlighting
  const [highlightId, setHighlightId] = React.useState<string | null>(null);
  React.useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && phases.some((p) => p.id === hash)) {
      setHighlightId(hash);
      const timer = setTimeout(() => setHighlightId(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [phases]);

  // Aggregate counts
  const totalTasks = allTasks.length;
  const doneTaskCount = allTasks.filter((t) => t.status === "completed").length;

  // Active item for task detail modal
  const activeItem: ConstructionItem | undefined = React.useMemo(() => {
    const id = taskDetail.itemId ?? addTaskTarget;
    if (!id) return undefined;
    return allItems.find((item) => item.id === id);
  }, [taskDetail.itemId, addTaskTarget, allItems]);

  const activeTasks = React.useMemo(() => {
    if (!activeItem) return [];
    return tasksByItem[activeItem.id] ?? [];
  }, [activeItem, tasksByItem]);

  // ── Task handlers ───────────────────────────────────────────────────────────
  const handleToggleTask = async (itemId: number, taskIndex: number) => {
    const task = activeTasks[taskIndex];
    if (!task) return;

    const nextStatus: ConstructionStatus = task.status === "completed"
      ? "in_progress"
      : "completed";

    await setTaskStatus.mutateAsync({
      id: task.id,
      payload: { status: nextStatus },
    });
    void refetchTasks();
  };

  const handleOpenTask = (itemId: number, taskIndex: number) => {
    setTaskDetail({ open: true, itemId, taskIndex });
  };

  const handleStartAddTask = (itemId: number) => {
    setAddTaskTarget(itemId);
  };

  const handleAddTask = async (input: {
    title: string;
    description: string;
    assigneeId: string | null;
    dueDate: string | null;
    images: string[];
  }) => {
    if (!addTaskTarget || !projectWorkingId) return;

    await createTask.mutateAsync({
      constructionItemId: addTaskTarget,
      name: input.title,
      description: input.description || undefined,
      estimateAt: input.dueDate ?? undefined,
      imageUrl: input.images[0] ?? undefined,
    });

    setAddTaskTarget(null);
    void refetchTasks();
  };

  const handleDeleteTask = async (itemId: number, taskIndex: number) => {
    const task = activeTasks[taskIndex];
    if (!task) return;
    if (!window.confirm(t("phase.deleteConfirm"))) return;

    await deleteTask.mutateAsync(task.id);
    setTaskDetail((prev) => ({ ...prev, open: false }));
    void refetchTasks();
  };

  const handleEditTaskFromDetail = () => {
    if (taskDetail.itemId == null || taskDetail.taskIndex == null) return;
    const task = activeTasks[taskDetail.taskIndex];
    if (!task) return;
    setTaskEdit({
      open: true,
      itemId: taskDetail.itemId,
      taskIndex: taskDetail.taskIndex,
      initialTitle: task.name,
    });
  };

  const handleSubmitTaskEdit = async (title: string) => {
    if (taskEdit.itemId == null || taskEdit.taskIndex == null) return;
    const task = activeTasks[taskEdit.taskIndex];
    if (!task) return;

    await updateTask.mutateAsync({
      id: task.id,
      payload: { name: title },
    });

    setTaskEdit((prev) => ({ ...prev, open: false }));
    void refetchTasks();
  };

  // ── Phase handlers ──────────────────────────────────────────────────────────
  const handleRenamePhase = (phaseId: string) => {
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return;
    setRenameTarget({ id: phaseId, label: phase.label });
  };

  const handleEditMeta = (phaseId: string) => {
    const item = allItems.find((i) => String(i.id) === phaseId);
    if (!item) return;
    setEditMetaTarget(item);
  };

  const handleDeletePhase = async (phaseId: string) => {
    if (!window.confirm(t("phase.deleteConfirm"))) return;
    await deleteItem.mutateAsync(Number(phaseId));
    void refetchItems();
  };

  const handleStatusChange = async (phaseId: string, status: string) => {
    await setItemStatus.mutateAsync({
      id: Number(phaseId),
      payload: { status: unmapStatus(status) },
    });
    void refetchItems();
  };

  const handleAddPhase = async (input: { label: string; lead: string; startDate: string; endDate: string; targetDate: string }) => {
    if (!projectWorkingId) return;
    await createItem.mutateAsync({
      projectWorkingId,
      name: input.label,
      category: input.label.toLowerCase().replace(/\s+/g, "-"),
      estimateAt: input.targetDate || undefined,
    });
    void refetchItems();
  };

  const handleSubmitRename = async (input: { label: string }) => {
    if (!renameTarget) return;
    await updateItem.mutateAsync({
      id: Number(renameTarget.id),
      payload: { name: input.label },
    });
    setRenameTarget(null);
    void refetchItems();
  };

  const handleSubmitEditMeta = async (input: PhaseEditInput) => {
    if (!editMetaTarget) return;
    await updateItem.mutateAsync({
      id: editMetaTarget.id,
      payload: {
        name: input.label,
        category: input.label.toLowerCase().replace(/\s+/g, "-"),
        estimateAt: input.targetDate || undefined,
      },
    });
    setEditMetaTarget(null);
    void refetchItems();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isLoadingProject || isLoadingItems || isLoadingTasks) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isProjectError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
        <AlertTriangle className="size-6 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load project.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (isItemsError) {
    const message = itemsError?.message ?? "Failed to load milestones.";
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
        <AlertTriangle className="size-6 text-destructive" />
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button variant="outline" size="sm" onClick={() => void refetchItems()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (!projectWorkingId) {
    return (
      <>
        <MilestoneManagementToolbar
          projectId={projectIdParam}
          phaseCount={0}
          taskCount={0}
          doneTaskCount={0}
          onAddPhase={() => setAddPhaseOpen(true)}
        />
        <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
          No construction engagement found for this project.
        </p>
      </>
    );
  }

  if (phases.length === 0) {
    return (
      <>
        <MilestoneManagementToolbar
          projectId={projectIdParam}
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
          onSubmit={handleAddPhase}
        />
      </>
    );
  }

  const lastIndex = phases.length - 1;

  return (
    <>
      <MilestoneManagementToolbar
        projectId={projectIdParam}
        phaseCount={phases.length}
        taskCount={totalTasks}
        doneTaskCount={doneTaskCount}
        onAddPhase={() => setAddPhaseOpen(true)}
      />

      <div className="mt-3 flex flex-col gap-3">
        {phases.map((phase, idx) => {
          const itemId = Number(phase.id);
          const itemTasks = tasksByItem[itemId] ?? [];

          return (
            <PhaseRow
              key={phase.id}
              phase={phase}
              index={idx}
              lastIndex={lastIndex}
              taskMeta={{}} // Not used with API
              taskDone={Object.fromEntries(
                itemTasks.map((t, i) => [`${phase.id}:${i}`, t.status === "completed"])
              )}
              resolveAssignee={() => undefined}
              highlight={highlightId === phase.id}
              onToggleTask={(phaseId, taskIndex) => handleToggleTask(Number(phaseId), taskIndex)}
              onOpenTask={(_, taskIndex) => handleOpenTask(itemId, taskIndex)}
              onRequestAddTask={() => handleStartAddTask(itemId)}
              onRename={handleRenamePhase}
              onEditMeta={handleEditMeta}
              onDelete={handleDeletePhase}
              onMoveLeft={() => {}} // Not supported in API
              onMoveRight={() => {}} // Not supported in API
              onStatusChange={handleStatusChange}
            />
          );
        })}
      </div>

      {/* Phase dialogs */}
      <AddPhaseDialog
        open={addPhaseOpen}
        onOpenChange={setAddPhaseOpen}
        onSubmit={handleAddPhase}
      />
      <PhaseEditDialog
        phase={renameTarget ? { id: renameTarget.id, label: renameTarget.label } : null}
        mode="rename"
        open={renameTarget !== null}
        onOpenChange={(o) => {
          if (!o) setRenameTarget(null);
        }}
        onSubmit={handleSubmitRename}
      />
      <PhaseEditDialog
        phase={editMetaTarget ? {
          id: String(editMetaTarget.id),
          label: editMetaTarget.name,
          targetDate: editMetaTarget.estimateAt ?? "",
        } : null}
        mode="editMeta"
        open={editMetaTarget !== null}
        onOpenChange={(o) => {
          if (!o) setEditMetaTarget(null);
        }}
        onSubmit={handleSubmitEditMeta}
      />

      {/* Task dialogs */}
      <TaskEditDialog
        open={taskEdit.open}
        onOpenChange={(o) => {
          if (!o) setTaskEdit((prev) => ({ ...prev, open: false }));
        }}
        initialTitle={taskEdit.initialTitle}
        onSubmit={handleSubmitTaskEdit}
      />

      <AddTaskModal
        open={addTaskTarget !== null}
        onOpenChange={(o) => {
          if (!o) setAddTaskTarget(null);
        }}
        phaseLabel={activeItem?.name}
        crewOptions={[]}
        onSubmit={handleAddTask}
      />

      <TaskDetailView
        open={taskDetail.open}
        onOpenChange={(o) => {
          if (!o) setTaskDetail((prev) => ({ ...prev, open: false }));
        }}
        task={taskDetail.taskIndex != null && activeTasks[taskDetail.taskIndex] ? {
          id: String(activeTasks[taskDetail.taskIndex]!.id),
          title: activeTasks[taskDetail.taskIndex]!.name,
          description: activeTasks[taskDetail.taskIndex]!.description ?? undefined,
          dueDate: activeTasks[taskDetail.taskIndex]!.estimateAt ?? undefined,
          assigneeId: undefined,
          images: activeTasks[taskDetail.taskIndex]!.imageUrl ? [activeTasks[taskDetail.taskIndex]!.imageUrl!] : undefined,
          createdAt: activeTasks[taskDetail.taskIndex]!.createdAt,
        } : null}
        phaseLabel={activeItem?.name}
        crewOptions={[]}
        onEdit={handleEditTaskFromDetail}
        onDelete={() => {
          if (taskDetail.itemId == null || taskDetail.taskIndex == null) return;
          handleDeleteTask(taskDetail.itemId, taskDetail.taskIndex);
        }}
      />
    </>
  );
}