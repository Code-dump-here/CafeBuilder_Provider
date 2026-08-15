"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AlertTriangle } from "lucide-react";

import { MilestoneManagementToolbar } from "@/components/contractor/milestone-management/toolbar";
import { PhaseRow } from "@/components/contractor/milestone-management/phase-row";
import { PhaseEditDialog, type PhaseEditInput } from "@/components/contractor/milestone-management/phase-edit-dialog";
import { TaskEditDialog } from "@/components/contractor/milestone-management/task-edit-dialog";
import { AddPhaseDialog } from "@/components/contractor/milestone-management/add-phase-dialog";
import { TaskDetailView } from "@/components/contractor/milestone-management/task-detail-view";
import { AddTaskModal } from "@/components/contractor/milestone-management/add-task-modal";
import { MilestoneNotesDialog } from "@/components/contractor/milestone-management/milestone-notes-dialog";

import { useCurrentUser } from "@/features/auth/user-context";
import { useProjectDetail } from "@/features/projects/use-project-detail";
import { useEngagements } from "@/features/projects/use-engagements";
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
} from "@/features/projects/use-construction";
import type {
  ConstructionItem,
  ConstructionTask,
  ConstructionStatus,
} from "@/features/projects/construction-types";

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
  const router = useRouter();
  const projectIdParam = params?.id ?? "";
  const t = useTranslations("MilestoneManagement");

  // Get project to find the construction engagement (projectWorkingId)
  const { project, isLoading: isLoadingProject, isError: isProjectError } = useProjectDetail(projectIdParam);

  // Find the construction engagement's projectWorkingId.
  //
  // Gate on `contractType` (what the provider was hired for here), not
  // `capability` (what they can do in general) — a `both`-capability studio
  // engaged for design only has no business owning milestones, and a
  // designer-capability provider can still be engaged for construction.
  //
  // Also scoped by the viewer's own providerId so another provider's
  // engagement on the same project (e.g. the designer when this viewer is
  // the constructor) can never drive this page — project.providers lists
  // every provider on the project, not just the caller.
  //
  // Prefer an `accepted` row over a `requested` one: if the owner invited two
  // contractors and one has accepted, that's the live engagement.
  const { account } = useCurrentUser();
  const viewerProfileId = account?.serviceProvider?.id ?? null;
  const constructionEngagement = React.useMemo(() => {
    const candidates = project.providers.filter(
      (p) =>
        p.providerId === viewerProfileId &&
        (p.contractType === "construction" || p.contractType === "both") &&
        (p.status === "accepted" || p.status === "requested"),
    );
    return (
      candidates.find((p) => p.status === "accepted") ?? candidates[0]
    );
  }, [project.providers, viewerProfileId]);

  const projectWorkingId = constructionEngagement?.projectWorkingId;

  // `project.providers` carries the engagement's id, status and contractType
  // but not `hasConfirmedContract`, so pull the full record to decide whether
  // a phase can be created at all.
  const { engagements } = useEngagements({
    projectId: projectIdParam,
    providerId: viewerProfileId ?? undefined,
    pageSize: 20,
    enabled: viewerProfileId != null,
  });
  const engagementRecord = React.useMemo(
    () => engagements.find((e) => e.id === projectWorkingId) ?? null,
    [engagements, projectWorkingId],
  );

  // The server refuses `POST /construction-items` unless the engagement is
  // `accepted` AND has a confirmed contract ("đã ký mới được làm"). Only
  // creation is gated — editing, status changes and tasks are not — but since
  // creation is the way into the flow, this covers it.
  //
  // Note the engagement resolved above can be a `requested` row when no
  // accepted one exists, which the server also rejects; the status check
  // below catches that too.
  const canAddPhase =
    engagementRecord?.status === "accepted" &&
    engagementRecord.hasConfirmedContract === true;
  const blockedReason = !constructionEngagement
    ? null
    : engagementRecord?.status !== "accepted"
      ? t("gate.notAccepted")
      : !engagementRecord.hasConfirmedContract
        ? t("gate.noContract")
        : null;

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
    // The backend defaults to pageSize=10, which silently hid every phase
    // past the first page on any project with more than 10 milestones.
    pageSize: 200,
  });

  // Fetch all tasks for these milestones. Same pageSize=10 default problem
  // Scoped to this engagement: the toolbar counts (`totalTasks`,
  // `doneTaskCount`) are derived straight off this list, so an unscoped
  // fetch made them sum every task the provider could see across all their
  // projects — the page then rendered only this project's, leaving the
  // counter permanently disagreeing with the rows beneath it.
  const {
    items: allTasks,
    isLoading: isLoadingTasks,
    isFetching: isFetchingTasks,
    refetch: refetchTasks,
  } = useConstructionTasks({
    projectWorkingId: projectWorkingId ?? undefined,
    enabled: Boolean(projectWorkingId),
    pageSize: 200,
  });

  // Mutations
  const createItem = useCreateConstructionItemMutation();
  const updateItem = useUpdateConstructionItemMutation();
  // Closing a milestone can take two calls (see `handleStatusChange`), so the
  // hook's per-call success toast is suppressed and fired once at the end
  // instead — otherwise one click produced two identical toasts.
  const setItemStatus = useSetConstructionItemStatusMutation({
    onSuccessMessage: null,
  });
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
        // ConstructionItem only tracks one real date (`estimateAt`, a
        // target/completion date) — there's no start-date field on the
        // backend. This used to fill start/end/target with the same
        // value, which rendered as a date "range" whose two ends were
        // secretly identical. Approximate the same way the read-only
        // construction overview page already does (see
        // `use-construction-overview.ts`): start = when the record was
        // created, end = actual completion if set, else the planned
        // target, else last-touched.
        targetDate: item.estimateAt ?? item.createdAt,
        startDate: item.createdAt,
        endDate: item.actualAt ?? item.estimateAt ?? item.updatedAt,
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

  // Delete confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    open: boolean;
    taskId: number | null;
    taskIndex: number | null;
  }>({ open: false, taskId: null, taskIndex: null });

  // Hash-based highlighting
  const [highlightId, setHighlightId] = React.useState<string | null>(null);
  /** Construction item whose owner-note thread is open, null when closed. */
  const [notesPhaseId, setNotesPhaseId] = React.useState<number | null>(null);
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
  //
  // Status toggles used to fire the moment the checkbox was clicked — one
  // misclick and a task jumped forward with no way back (the backend only
  // allows one-step-forward transitions, never backward, so "completed" is
  // a dead end). `toggleConfirm` holds the pending toggle until the user
  // confirms it in a dialog instead. Both entry points (the chip's inline
  // circle and the task detail modal's button) route through
  // `handleRequestToggleTask` so there's exactly one confirm dialog.
  const [toggleConfirm, setToggleConfirm] = React.useState<{
    open: boolean;
    itemId: number | null;
    taskIndex: number | null;
  }>({ open: false, itemId: null, taskIndex: null });

  const pendingToggleTask =
    toggleConfirm.itemId != null && toggleConfirm.taskIndex != null
      ? (tasksByItem[toggleConfirm.itemId] ?? [])[toggleConfirm.taskIndex]
      : undefined;
  const pendingToggleNextStatus: ConstructionStatus | null =
    pendingToggleTask == null
      ? null
      : pendingToggleTask.status === "in_progress"
        ? "completed"
        : "in_progress";

  const handleRequestToggleTask = (itemId: number, taskIndex: number) => {
    const task = (tasksByItem[itemId] ?? [])[taskIndex];
    // The backend rejects reopening a completed task — there's no valid
    // next status once a task is done, so there's nothing to confirm.
    if (!task || task.status === "completed") return;
    setToggleConfirm({ open: true, itemId, taskIndex });
  };

  const handleConfirmToggleTask = async () => {
    const task = pendingToggleTask;
    const nextStatus = pendingToggleNextStatus;
    setToggleConfirm({ open: false, itemId: null, taskIndex: null });
    setTaskDetail((prev) => ({ ...prev, open: false }));
    if (!task || !nextStatus) return;

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
    name: string;
    description: string;
    estimateAt: string | null;
    imageUrl: string | null;
  }) => {
    if (!addTaskTarget || !projectWorkingId) return;

    await createTask.mutateAsync({
      constructionItemId: addTaskTarget,
      name: input.name,
      description: input.description || undefined,
      estimateAt: input.estimateAt ?? undefined,
      imageUrl: input.imageUrl ?? undefined,
    });

    setAddTaskTarget(null);
    void refetchTasks();
  };

  // Open delete confirmation for a task (from detail view)
  const handleRequestDeleteTask = () => {
    setTaskDetail((prev) => ({ ...prev, open: false }));
    // TaskDetailView passes delete confirmation back to us
  };

  // Confirm and execute delete from AlertDialog
  const handleConfirmDeleteTask = async () => {
    const { taskId, taskIndex } = deleteConfirm;
    if (taskId === null || taskIndex === null) return;

    try {
      await deleteTask.mutateAsync(taskId);
      toast.success(t("task.deleteSuccess"));
      setDeleteConfirm({ open: false, taskId: null, taskIndex: null });
      void refetchTasks();
    } catch (err) {
      console.error("[MilestonePage] deleteTask error", err);
      toast.error("Không thể xóa công việc. Vui lòng thử lại.");
      setDeleteConfirm({ open: false, taskId: null, taskIndex: null });
    }
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
    try {
      await deleteItem.mutateAsync(Number(phaseId));
      void refetchItems();
    } catch (err) {
      console.error("[MilestonePage] deleteItem error", err);
      toast.error(t("phase.deleteError"));
    }
  };

  const handleStatusChange = async (phaseId: string, status: string) => {
    const target = unmapStatus(status);
    const current = allItems.find((i) => i.id === Number(phaseId))?.status;

    try {
      // The backend only accepts one-step-forward transitions
      // (pending → in_progress → completed) and never auto-advances a
      // milestone when its tasks finish. A provider who ticked off every
      // task therefore still had a "pending" milestone, and reporting the
      // engagement complete kept failing with "Còn N hạng mục thi công
      // chưa 'completed'". Walking the intermediate hop here lets one
      // click close a finished milestone without weakening the server's
      // rule (it still refuses if any task is unfinished).
      if (target === "completed" && current === "pending") {
        await setItemStatus.mutateAsync({
          id: Number(phaseId),
          payload: { status: "in_progress" },
        });
      }
      await setItemStatus.mutateAsync({
        id: Number(phaseId),
        payload: { status: target },
      });
      toast.success(t("phase.statusSuccess"));
    } catch (err) {
      // The mutation hook already surfaced the server's own message.
      console.error("[MilestonePage] setItemStatus error", err);
    } finally {
      // Refetch either way: the intermediate hop may have landed even when
      // the second call failed, so the UI must not keep showing "pending".
      void refetchItems();
    }
  };

  const handleAddPhase = async (input: { name: string; category?: string; description?: string; estimateAt?: string }) => {
    if (!projectWorkingId) {
      return;
    }
    try {
      await createItem.mutateAsync({
        projectWorkingId,
        name: input.name,
        category: input.category,
        description: input.description,
        estimateAt: input.estimateAt,
      });
      void refetchItems();
    } catch (err) {
      console.error("[MilestonePage] createItem error", err);
      toast.error(t("addPhase.error"));
      throw err;
    }
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

  if (!constructionEngagement) {
    return (
      <>
        <MilestoneManagementToolbar
          projectId={projectIdParam}
          phaseCount={0}
          taskCount={0}
          doneTaskCount={0}
          onAddPhase={() => setAddPhaseOpen(true)}
          addPhaseDisabled
        />
        <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
          No construction engagement found for this project.
        </p>
        <AddPhaseDialog
          open={addPhaseOpen}
          onOpenChange={setAddPhaseOpen}
          onSubmit={() => {
            // Silently do nothing - no engagement
          }}
        />
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
          addPhaseDisabled={!canAddPhase}
        />
        {blockedReason ? (
          <p className="mt-3 rounded-md border border-amber-300/50 bg-amber-50/50 px-3 py-2 text-xs text-muted-foreground dark:border-amber-700/40 dark:bg-amber-950/20">
            {blockedReason}
          </p>
        ) : null}
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

  return (
    <>
      <MilestoneManagementToolbar
        projectId={projectIdParam}
        phaseCount={phases.length}
        taskCount={totalTasks}
        doneTaskCount={doneTaskCount}
        onAddPhase={() => setAddPhaseOpen(true)}
        addPhaseDisabled={!canAddPhase}
      />
      {blockedReason ? (
        <p className="mt-3 rounded-md border border-amber-300/50 bg-amber-50/50 px-3 py-2 text-xs text-muted-foreground dark:border-amber-700/40 dark:bg-amber-950/20">
          {blockedReason}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-3">
        {phases.map((phase, idx) => {
          const itemId = Number(phase.id);
          const itemTasks = tasksByItem[itemId] ?? [];

          return (
            <PhaseRow
              key={phase.id}
              phase={phase}
              index={idx}
              taskMeta={{}} // Not used with API
              taskStatus={Object.fromEntries(
                itemTasks.map((t, i) => [`${phase.id}:${i}`, t.status])
              )}
              highlight={highlightId === phase.id}
              onToggleTask={(phaseId, taskIndex) => handleRequestToggleTask(Number(phaseId), taskIndex)}
              onOpenTask={(_, taskIndex) => handleOpenTask(itemId, taskIndex)}
              onRequestAddTask={() => handleStartAddTask(itemId)}
              onRename={handleRenamePhase}
              onEditMeta={handleEditMeta}
              onDelete={handleDeletePhase}
              onOpenNotes={(phaseId) => setNotesPhaseId(Number(phaseId))}
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

      <MilestoneNotesDialog
        open={notesPhaseId != null}
        onOpenChange={(open) => {
          if (!open) setNotesPhaseId(null);
        }}
        milestoneId={notesPhaseId}
        milestoneLabel={
          phases.find((p) => Number(p.id) === notesPhaseId)?.label
        }
      />

      <AddTaskModal
        open={addTaskTarget !== null}
        onOpenChange={(o) => {
          if (!o) setAddTaskTarget(null);
        }}
        phaseLabel={activeItem?.name}
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
          images: activeTasks[taskDetail.taskIndex]!.imageViewUrl
          ? [activeTasks[taskDetail.taskIndex]!.imageViewUrl!]
          : activeTasks[taskDetail.taskIndex]!.imageUrl
            ? [activeTasks[taskDetail.taskIndex]!.imageUrl!]
            : undefined,
          createdAt: activeTasks[taskDetail.taskIndex]!.createdAt,
          status: activeTasks[taskDetail.taskIndex]!.status,
        } : null}
        phaseLabel={activeItem?.name}
        onEdit={handleEditTaskFromDetail}
        onDelete={() => {
          if (taskDetail.itemId == null || taskDetail.taskIndex == null) return;
          const task = activeTasks[taskDetail.taskIndex];
          if (!task) return;
          setDeleteConfirm({
            open: true,
            taskId: task.id,
            taskIndex: taskDetail.taskIndex,
          });
        }}
        onToggleStatus={() => {
          if (taskDetail.itemId == null || taskDetail.taskIndex == null) return;
          handleRequestToggleTask(taskDetail.itemId, taskDetail.taskIndex);
        }}
        onReportIssue={() => {
          router.push(`/projects/${projectIdParam}/issues`);
        }}
      />

      {/* Delete task confirmation */}
      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm((prev) => ({ ...prev, open: false }));
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá công việc</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xoá công việc này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDeleteTask()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task status toggle confirmation */}
      <ConfirmDialog
        open={toggleConfirm.open}
        onOpenChange={(open) => {
          if (!open) setToggleConfirm({ open: false, itemId: null, taskIndex: null });
        }}
        title={t("task.confirmToggleTitle")}
        description={
          pendingToggleTask
            ? pendingToggleNextStatus === "completed"
              ? t("task.confirmToggleToCompleted", { title: pendingToggleTask.name })
              : t("task.confirmToggleToInProgress", { title: pendingToggleTask.name })
            : ""
        }
        confirmLabel={t("task.confirmCta")}
        cancelLabel={t("task.confirmCancel")}
        onConfirm={() => void handleConfirmToggleTask()}
      />
    </>
  );
}