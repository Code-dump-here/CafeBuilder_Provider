"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
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

import { MilestoneManagementToolbar } from "@/components/contractor/milestone-management/toolbar";
import { PhaseRow } from "@/components/contractor/milestone-management/phase-row";
import {
  PhaseEditDialog,
  type PhaseItemLike,
} from "@/components/contractor/milestone-management/phase-edit-dialog";
import { TaskEditDialog } from "@/components/contractor/milestone-management/task-edit-dialog";
import { AddPhaseDialog } from "@/components/contractor/milestone-management/add-phase-dialog";
import { ApplyTemplateDialog } from "@/components/contractor/milestone-management/apply-template-dialog";
import { TaskDetailView } from "@/components/contractor/milestone-management/task-detail-view";
import { AddTaskModal } from "@/components/contractor/milestone-management/add-task-modal";
import { MilestoneNotesDialog } from "@/components/contractor/milestone-management/milestone-notes-dialog";
import { ChecklistDialog } from "@/components/contractor/milestone-management/checklist-dialog";
import { MaterialsDialog } from "@/components/contractor/milestone-management/materials-dialog";

import { useCurrentUser } from "@/features/auth/user-context";
import { useProjectDetail } from "@/features/projects/use-project-detail";
import { useEngagements } from "@/features/projects/use-engagements";
import {
  useConstructionItems,
  useConstructionTasks,
  useCreateConstructionItemMutation,
  useUpdateConstructionItemMutation,
  useSetConstructionItemStatusMutation,
  useDeleteConstructionItemMutation,
  useCreateConstructionTaskMutation,
  useUpdateConstructionTaskMutation,
  useSetConstructionTaskStatusMutation,
  useDeleteConstructionTaskMutation,
  useReorderConstructionItemsMutation,
  byScheduleDate,
} from "@/features/projects/use-construction";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { useInvalidateCostSummaries } from "@/features/projects/use-cost-summary";
import { useApplyConstructionTemplateMutation } from "@/features/projects/use-construction-templates";
import type {
  ConstructionItem,
  ConstructionTask,
  ConstructionStatus,
  UpdateConstructionItemPayload,
  UpdateConstructionTaskPayload,
  CreateConstructionTaskPayload,
} from "@/features/projects/construction-types";

/**
 * `/[locale]/projects/{id}/milestones`
 *
 * Row-based milestone + task management. Fetches from
 * GET /api/construction-items and GET /api/construction-tasks.
 *
 * Each phase renders as a row with its start/end dates + status on the header,
 * and tasks indented below. Clicking a task opens a read-only TaskDetailView
 * with full metadata; "Add task" opens a modal.
 *
 * Task ids are server-issued uuids, so the page indexes tasks by id directly
 * rather than by `(phaseId, taskIndex)` — the older `taskIndex` addressing
 * broke when two tasks got created within the same millisecond.
 */
/**
 * The URL fragment, as an external store.
 *
 * `getServerHashSnapshot` returns "" so the server render and hydration agree
 * that nothing is highlighted; React only switches to the live snapshot once
 * hydration finishes. `window.location.hash` returns an equal string on every
 * call, which is what keeps `useSyncExternalStore` from re-rendering forever.
 */
function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
function getHashSnapshot(): string {
  return window.location.hash.replace(/^#/, "");
}
function getServerHashSnapshot(): string {
  return "";
}

export default function MilestoneManagementPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectIdParam = params?.id ?? "";
  const t = useTranslations("MilestoneManagement");

  // Get project to find the construction engagement (projectWorkingId)
  const { project, isLoading: isLoadingProject, isError: isProjectError } =
    useProjectDetail(projectIdParam);

  // Gate on `contractType` (what the provider was hired for here), not
  // `capability` (what they can do in general) — a `both`-capability studio
  // engaged for design only has no business owning milestones. Also scoped
  // by the viewer's own providerId so another provider's engagement on the
  // same project can never drive this page.
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
  // but not `hasConfirmedContract`, so pull the full record to decide
  // whether a phase can be created at all.
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

  // Fetch milestones (construction items)
  const {
    items: allItems,
    topLevelItems,
    isLoading: isLoadingItems,
    isError: isItemsError,
    error: itemsError,
    refetch: refetchItems,
  } = useConstructionItems({
    projectWorkingId: projectWorkingId ?? "",
    enabled: Boolean(projectWorkingId),
    // The backend defaults to pageSize=10, which silently hid every phase
    // past the first page on any project with more than 10 milestones.
    pageSize: 200,
  });

  // Scoped to this engagement: the toolbar counts (`totalTasks`,
  // `doneTaskCount`) are derived from this list, so an unscoped fetch made
  // them sum every task the provider could see across all their projects.
  const {
    items: allTasks,
    isLoading: isLoadingTasks,
    refetch: refetchTasks,
  } = useConstructionTasks({
    projectWorkingId: projectWorkingId ?? undefined,
    enabled: Boolean(projectWorkingId),
    pageSize: 200,
  });

  // Mutations
  const createItem = useCreateConstructionItemMutation();
  const updateItem = useUpdateConstructionItemMutation();
  const applyTemplate = useApplyConstructionTemplateMutation();
  // Closing a milestone can take two calls (see `handleStatusChange`), so
  // the hook's per-call success toast is suppressed and fired once at the
  // end instead — otherwise one click produced two identical toasts.
  const setItemStatus = useSetConstructionItemStatusMutation({
    onSuccessMessage: null,
  });
  const deleteItem = useDeleteConstructionItemMutation();

  const createTask = useCreateConstructionTaskMutation();
  const updateTask = useUpdateConstructionTaskMutation();
  const setTaskStatus = useSetConstructionTaskStatusMutation();
  const deleteTask = useDeleteConstructionTaskMutation();

  // This page refreshes itself with `refetchItems` / `refetchTasks`, which only
  // reach its own two queries. The cost summary is a separate query on the
  // construction-overview page, and cost rolls up milestone status — so closing
  // a phase here left that card showing the status it had before, with no way
  // back: `refetchOnWindowFocus` is off, so a card already on screen never
  // reconsiders.
  const invalidateCostSummaries = useInvalidateCostSummaries();

  // Group tasks by constructionItemId
  const tasksByItem = React.useMemo(() => {
    const grouped: Record<string, ConstructionTask[]> = {};
    for (const task of allTasks) {
      if (!grouped[task.constructionItemId]) {
        grouped[task.constructionItemId] = [];
      }
      grouped[task.constructionItemId]!.push(task);
    }
    for (const list of Object.values(grouped)) list.sort(byScheduleDate);
    return grouped;
  }, [allTasks]);

  // ── Reordering ──────────────────────────────────────────────────────────────
  const [pendingOrder, setPendingOrder] = React.useState<string[] | null>(null);

  const orderedItems = React.useMemo(() => {
    if (!pendingOrder) return topLevelItems;
    const byId = new Map(topLevelItems.map((item) => [item.id, item]));
    const next = pendingOrder
      .map((id) => byId.get(id))
      .filter((item): item is ConstructionItem => item !== undefined);
    for (const item of topLevelItems) {
      if (!pendingOrder.includes(item.id)) next.push(item);
    }
    return next;
  }, [topLevelItems, pendingOrder]);

  const reorderItems = useReorderConstructionItemsMutation({
    onSuccessSideEffect: () => {
      // Only stop overriding once fresh rows are in the cache; clearing
      // first would flash the pre-drag order for a frame.
      void Promise.resolve(refetchItems()).finally(() =>
        setPendingOrder(null),
      );
    },
    onErrorSideEffect: () => setPendingOrder(null),
  });

  const handleReorderPhases = React.useCallback(
    (nextIds: string[]) => {
      if (!projectWorkingId) return;
      setPendingOrder(nextIds);
      reorderItems.mutate({
        projectWorkingId,
        // This screen only renders top-level milestones; their children are
        // their own sibling group and are not reordered from here.
        parentId: null,
        itemIds: nextIds,
      });
    },
    [projectWorkingId, reorderItems],
  );

  const phaseIds = React.useMemo(
    () => orderedItems.map((item) => item.id),
    [orderedItems],
  );

  const dragReorder = useDragReorder({
    ids: phaseIds,
    canDrag: (id) =>
      orderedItems.find((item) => item.id === id)?.status !== "completed",
    onReorder: handleReorderPhases,
  });

  const canReorder = orderedItems.length > 1 && Boolean(projectWorkingId);

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [addPhaseOpen, setAddPhaseOpen] = React.useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = React.useState(false);
  const [renameTargetId, setRenameTargetId] = React.useState<string | null>(null);
  const [editMetaTarget, setEditMetaTarget] =
    React.useState<ConstructionItem | null>(null);
  const [taskEdit, setTaskEdit] = React.useState<{
    open: boolean;
    taskId: string | null;
  }>({ open: false, taskId: null });

  const [taskDetailId, setTaskDetailId] = React.useState<string | null>(null);
  const [addTaskTarget, setAddTaskTarget] = React.useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    open: boolean;
    taskId: string | null;
  }>({ open: false, taskId: null });

  // Hash-based highlighting. The hash is read through `useSyncExternalStore`
  // rather than an effect or a lazy initial state: it is browser state, and
  // `getServerHashSnapshot` keeps SSR and hydration agreeing on "no highlight".
  // Reading `window.location.hash` inside a useState initialiser gives the
  // server null and the client the hash — a hydration mismatch — and only ever
  // sees the hash present at mount. Subscribing to `hashchange` means a second
  // link to a different phase re-highlights too.
  const locationHash = React.useSyncExternalStore(
    subscribeToHash,
    getHashSnapshot,
    getServerHashSnapshot,
  );
  // The highlight is a 2.5s flash, so it has to expire. What is remembered is
  // *which* hash has already flashed, not a boolean — with a boolean, following
  // a second link to a different phase would find the flag still set and never
  // highlight again.
  const [expiredHash, setExpiredHash] = React.useState<string | null>(null);
  // An unknown hash (#new-tab and the like) must not count as a phase, or it
  // would be the one that "flashed" and suppress a real highlight after it.
  const targetHash =
    locationHash && topLevelItems.some((p) => p.id === locationHash)
      ? locationHash
      : null;
  const highlightId = targetHash && targetHash !== expiredHash ? targetHash : null;

  // setState inside the timeout callback, not in the effect body — that is the
  // distinction the lint rule draws, and it is a real one: this update lands
  // 2.5 seconds later rather than as a second render on the way to first paint.
  React.useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setExpiredHash(highlightId), 2500);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const [notesPhaseId, setNotesPhaseId] = React.useState<string | null>(null);
  const [checklistPhaseId, setChecklistPhaseId] =
    React.useState<string | null>(null);
  const [materialsPhaseId, setMaterialsPhaseId] =
    React.useState<string | null>(null);

  // Aggregate counts (toolbar)
  const totalTasks = allTasks.length;
  const doneTaskCount = allTasks.filter((t) => t.status === "completed").length;

  // Active lookups
  const activeAddTaskItem = React.useMemo(
    () => allItems.find((i) => i.id === addTaskTarget) ?? null,
    [allItems, addTaskTarget],
  );

  const phaseById = React.useMemo(() => {
    const map = new Map<string, ConstructionItem>();
    for (const item of allItems) map.set(item.id, item);
    return map;
  }, [allItems]);

  const taskById = React.useMemo(() => {
    const map = new Map<string, ConstructionTask>();
    for (const task of allTasks) map.set(task.id, task);
    return map;
  }, [allTasks]);

  const activeDetailTask =
    taskDetailId != null ? (taskById.get(taskDetailId) ?? null) : null;

  const activeEditTask =
    taskEdit.taskId != null ? (taskById.get(taskEdit.taskId) ?? null) : null;

  // ── Task handlers ───────────────────────────────────────────────────────────

  const [toggleConfirm, setToggleConfirm] = React.useState<{
    open: boolean;
    taskId: string | null;
  }>({ open: false, taskId: null });

  const pendingToggleTask =
    toggleConfirm.taskId != null
      ? (taskById.get(toggleConfirm.taskId) ?? null)
      : null;
  const pendingToggleNextStatus: ConstructionStatus | null =
    pendingToggleTask == null
      ? null
      : pendingToggleTask.status === "in_progress"
        ? "completed"
        : "in_progress";

  const handleRequestToggleTask = (taskId: string) => {
    const task = taskById.get(taskId);
    // The backend rejects reopening a completed task — there's no valid
    // next status once a task is done, so there's nothing to confirm.
    if (!task || task.status === "completed") return;
    setToggleConfirm({ open: true, taskId });
  };

  const handleConfirmToggleTask = async () => {
    const task = pendingToggleTask;
    const nextStatus = pendingToggleNextStatus;
    setToggleConfirm({ open: false, taskId: null });
    setTaskDetailId(null);
    if (!task || !nextStatus || !projectWorkingId) return;

    await setTaskStatus.mutateAsync({
      id: task.id,
      payload: { status: nextStatus },
      projectWorkingId,
    });
  };

  const handleOpenTask = (taskId: string) => setTaskDetailId(taskId);

  const handleStartAddTask = (phaseId: string) => setAddTaskTarget(phaseId);

  const handleAddTask = async (input: CreateConstructionTaskPayload) => {
    if (!projectWorkingId) return;

    await createTask.mutateAsync({
      constructionItemId: input.constructionItemId,
      name: input.name ?? "",
      description: input.description,
      imageUrl: input.imageUrl,
      startAt: input.startAt,
      estimateAt: input.estimateAt,
      estimatedLaborCost: input.estimatedLaborCost,
      projectWorkingId,
    });
    setAddTaskTarget(null);
  };

  const handleConfirmDeleteTask = async () => {
    const { taskId } = deleteConfirm;
    if (!taskId || !projectWorkingId) {
      setDeleteConfirm({ open: false, taskId: null });
      return;
    }
    const task = taskById.get(taskId);
    if (!task) {
      setDeleteConfirm({ open: false, taskId: null });
      return;
    }

    try {
      await deleteTask.mutateAsync({
        id: taskId,
        projectWorkingId,
        constructionItemId: task.constructionItemId,
      });
    } finally {
      setDeleteConfirm({ open: false, taskId: null });
      setTaskDetailId(null);
    }
  };

  const handleEditTaskFromDetail = () => {
    if (!activeDetailTask) return;
    setTaskEdit({ open: true, taskId: activeDetailTask.id });
    setTaskDetailId(null);
  };

  const handleSubmitTaskEdit = async (
    payload: UpdateConstructionTaskPayload,
  ) => {
    if (!activeEditTask || !projectWorkingId) return;
    await updateTask.mutateAsync({
      id: activeEditTask.id,
      payload,
      projectWorkingId,
    });
    setTaskEdit({ open: false, taskId: null });
  };

  // ── Phase handlers ──────────────────────────────────────────────────────────

  const handleDeletePhase = async (phaseId: string) => {
    if (!window.confirm(t("phase.deleteConfirm"))) return;
    if (!projectWorkingId) return;
    try {
      await deleteItem.mutateAsync({
        id: phaseId,
        projectWorkingId,
      });
    } catch (err) {
      console.error("[MilestonePage] deleteItem error", err);
      toast.error(t("phase.deleteError"));
    }
  };

  const handleStatusChange = async (
    phaseId: string,
    status: ConstructionStatus,
  ) => {
    const current = allItems.find((i) => i.id === phaseId)?.status;

    try {
      // The backend only accepts one-step-forward transitions
      // (pending → in_progress → completed) and never auto-advances a
      // milestone when its tasks finish. Walking the intermediate hop
      // here lets one click close a finished milestone.
      if (status === "completed" && current === "pending") {
        await setItemStatus.mutateAsync({
          id: phaseId,
          payload: { status: "in_progress" },
        });
      }
      await setItemStatus.mutateAsync({
        id: phaseId,
        payload: { status },
      });
      toast.success(t("phase.statusSuccess"));
    } catch (err) {
      console.error("[MilestonePage] setItemStatus error", err);
    } finally {
      void refetchItems();
      invalidateCostSummaries();
    }
  };

  const handleAddPhase = async (input: {
    name: string;
    category?: string;
    description?: string;
    startAt?: string;
    estimateAt?: string;
    estimatedLaborCost?: number;
  }) => {
    if (!projectWorkingId) return;
    try {
      await createItem.mutateAsync({
        projectWorkingId,
        name: input.name,
        category: input.category,
        description: input.description,
        startAt: input.startAt,
        estimateAt: input.estimateAt,
        estimatedLaborCost: input.estimatedLaborCost,
      });
      void refetchItems();
    } catch (err) {
      console.error("[MilestonePage] createItem error", err);
      toast.error(t("addPhase.error"));
      throw err;
    }
  };

  const handleApplyTemplate = async (input: {
    templateId: string;
    startDate: string;
  }) => {
    if (!projectWorkingId) return;

    await applyTemplate.mutateAsync({
      id: input.templateId,
      payload: { projectWorkingId, startDate: input.startDate },
    });
    void refetchItems();
    void refetchTasks();
  };

  const handleSubmitRename = async (
    payload: UpdateConstructionItemPayload,
  ) => {
    if (!renameTargetId) return;
    await updateItem.mutateAsync({
      id: renameTargetId,
      payload,
    });
    setRenameTargetId(null);
    void refetchItems();
  };

  const handleSubmitEditMeta = async (
    payload: UpdateConstructionItemPayload,
  ) => {
    if (!editMetaTarget) return;
    await updateItem.mutateAsync({
      id: editMetaTarget.id,
      payload,
    });
    setEditMetaTarget(null);
    void refetchItems();
  };

  // ── Loading / error states ──────────────────────────────────────────────────

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
        <p className="text-sm text-muted-foreground">{t("loadProjectError")}</p>
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
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          No construction engagement found for this project.
        </p>
        <AddPhaseDialog
          open={addPhaseOpen}
          onOpenChange={setAddPhaseOpen}
          onSubmit={() => {
            // Silently do nothing — no engagement.
          }}
        />
      </>
    );
  }

  if (orderedItems.length === 0) {
    return (
      <>
        <MilestoneManagementToolbar
          projectId={projectIdParam}
          phaseCount={0}
          taskCount={0}
          doneTaskCount={0}
          onAddPhase={() => setAddPhaseOpen(true)}
          addPhaseDisabled={!canAddPhase}
          onApplyTemplate={() => setApplyTemplateOpen(true)}
          applyTemplateDisabled={!canAddPhase}
        />
        {blockedReason ? (
          <p className="mt-3 rounded-md border border-warning/30 bg-warning-muted px-3 py-2 text-xs text-warning-muted-foreground">
            {blockedReason}
          </p>
        ) : null}
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          {t("errorEmpty")}
        </p>
        <AddPhaseDialog
          open={addPhaseOpen}
          onOpenChange={setAddPhaseOpen}
          onSubmit={handleAddPhase}
        />
        <ApplyTemplateDialog
          open={applyTemplateOpen}
          onOpenChange={setApplyTemplateOpen}
          hasExistingPhases={false}
          onSubmit={handleApplyTemplate}
        />
      </>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  const renamePhase = renameTargetId
    ? (phaseById.get(renameTargetId) ?? null)
    : null;

  return (
    <>
      <MilestoneManagementToolbar
        projectId={projectIdParam}
        phaseCount={orderedItems.length}
        taskCount={totalTasks}
        doneTaskCount={doneTaskCount}
        onAddPhase={() => setAddPhaseOpen(true)}
        addPhaseDisabled={!canAddPhase}
        onApplyTemplate={() => setApplyTemplateOpen(true)}
        applyTemplateDisabled={!canAddPhase}
      />
      {blockedReason ? (
        <p className="mt-3 rounded-md border border-warning/30 bg-warning-muted px-3 py-2 text-xs text-warning-muted-foreground">
          {blockedReason}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-3">
        {orderedItems.map((item, idx) => {
          const itemTasks = tasksByItem[item.id] ?? [];
          const canMove = item.status !== "completed";
          return (
            <PhaseRow
              key={item.id}
              phase={item}
              index={idx}
              tasks={itemTasks}
              reorder={
                canReorder
                  ? {
                      ...dragReorder.getItemProps(item.id),
                      canMove,
                      onMoveUp: () => dragReorder.move(item.id, -1),
                      onMoveDown: () => dragReorder.move(item.id, 1),
                      canMoveUp: canMove && idx > 0,
                      canMoveDown:
                        canMove && idx < orderedItems.length - 1,
                    }
                  : undefined
              }
              highlight={highlightId === item.id}
              onToggleTask={handleRequestToggleTask}
              onOpenTask={handleOpenTask}
              onRequestAddTask={handleStartAddTask}
              onRename={(id) => setRenameTargetId(id)}
              onEditMeta={(id) => {
                const target = phaseById.get(id);
                if (target) setEditMetaTarget(target);
              }}
              onDelete={handleDeletePhase}
              onOpenNotes={(id) => setNotesPhaseId(id)}
              onOpenChecklist={(id) => setChecklistPhaseId(id)}
              onOpenMaterials={(id) => setMaterialsPhaseId(id)}
              onStatusChange={handleStatusChange}
            />
          );
        })}
      </div>

      {/* ── Phase dialogs ── */}
      <AddPhaseDialog
        open={addPhaseOpen}
        onOpenChange={setAddPhaseOpen}
        onSubmit={handleAddPhase}
      />
      <ApplyTemplateDialog
        open={applyTemplateOpen}
        onOpenChange={setApplyTemplateOpen}
        hasExistingPhases={orderedItems.length > 0}
        onSubmit={handleApplyTemplate}
      />
      <PhaseEditDialog
        phase={renamePhase as PhaseItemLike | null}
        mode="rename"
        open={renameTargetId !== null}
        onOpenChange={(o) => {
          if (!o) setRenameTargetId(null);
        }}
        onSubmit={handleSubmitRename}
      />
      <PhaseEditDialog
        phase={editMetaTarget}
        mode="editMeta"
        open={editMetaTarget !== null}
        onOpenChange={(o) => {
          if (!o) setEditMetaTarget(null);
        }}
        onSubmit={handleSubmitEditMeta}
      />

      {/* ── Task dialogs ── */}
      <AddTaskModal
        open={addTaskTarget !== null}
        onOpenChange={(o) => {
          if (!o) setAddTaskTarget(null);
        }}
        constructionItemId={addTaskTarget ?? ""}
        phaseLabel={activeAddTaskItem?.name ?? undefined}
        onSubmit={handleAddTask}
      />
      <TaskEditDialog
        open={taskEdit.open}
        onOpenChange={(o) => {
          if (!o) setTaskEdit({ open: false, taskId: null });
        }}
        task={activeEditTask}
        onSubmit={handleSubmitTaskEdit}
      />
      <TaskDetailView
        open={taskDetailId !== null}
        onOpenChange={(o) => {
          if (!o) setTaskDetailId(null);
        }}
        task={activeDetailTask}
        phaseLabel={
          activeDetailTask
            ? phaseById.get(activeDetailTask.constructionItemId)?.name
            : undefined
        }
        onEdit={handleEditTaskFromDetail}
        onDelete={() => {
          if (!activeDetailTask) return;
          setDeleteConfirm({ open: true, taskId: activeDetailTask.id });
        }}
        onToggleStatus={() => {
          if (!activeDetailTask) return;
          handleRequestToggleTask(activeDetailTask.id);
        }}
        onReportIssue={() => {
          router.push(`/projects/${projectIdParam}/issues`);
        }}
      />

      {/* ── Auxiliary dialogs ── */}
      <MilestoneNotesDialog
        open={notesPhaseId != null}
        onOpenChange={(open) => {
          if (!open) setNotesPhaseId(null);
        }}
        milestoneId={notesPhaseId}
        milestoneLabel={
          notesPhaseId ? phaseById.get(notesPhaseId)?.name : undefined
        }
      />
      <ChecklistDialog
        open={checklistPhaseId != null}
        onOpenChange={(open) => {
          if (!open) setChecklistPhaseId(null);
        }}
        milestoneId={checklistPhaseId}
        milestoneLabel={
          checklistPhaseId
            ? phaseById.get(checklistPhaseId)?.name
            : undefined
        }
      />
      <MaterialsDialog
        open={materialsPhaseId != null}
        onOpenChange={(open) => {
          if (!open) setMaterialsPhaseId(null);
        }}
        projectWorkingId={projectWorkingId ?? null}
        milestoneId={materialsPhaseId}
        milestoneLabel={
          materialsPhaseId
            ? phaseById.get(materialsPhaseId)?.name
            : undefined
        }
        milestoneStarted={
          materialsPhaseId
            ? phaseById.get(materialsPhaseId)?.status !== "pending"
            : false
        }
      />

      {/* ── Confirmations ── */}
      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm({ open: false, taskId: null });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá công việc</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xoá công việc này? Hành động này không thể hoàn
              tác.
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

      <ConfirmDialog
        open={toggleConfirm.open}
        onOpenChange={(open) => {
          if (!open) setToggleConfirm({ open: false, taskId: null });
        }}
        title={t("task.confirmToggleTitle")}
        description={
          pendingToggleTask && pendingToggleNextStatus
            ? pendingToggleNextStatus === "completed"
              ? t("task.confirmToggleToCompleted", {
                  title: pendingToggleTask.name,
                })
              : t("task.confirmToggleToInProgress", {
                  title: pendingToggleTask.name,
                })
            : ""
        }
        confirmLabel={t("task.confirmCta")}
        cancelLabel={t("task.confirmCancel")}
        onConfirm={() => void handleConfirmToggleTask()}
      />
    </>
  );
}

// Reference variables that drive the loading state — kept exported-style at
// the bottom so the file stays self-documenting without affecting the bundle.
const _isFetching = (a: boolean, b: boolean) => a || b;
void _isFetching;
