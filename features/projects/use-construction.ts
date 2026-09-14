"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import { notifySuccess, notifyError } from "@/lib/notify";
import {
  createConstructionItemApi,
  getConstructionItemsApi,
  getConstructionItemApi,
  updateConstructionItemApi,
  reorderConstructionItemsApi,
  setConstructionItemStatusApi,
  deleteConstructionItemApi,
  getConstructionItemCostSummaryApi,
  getEngagementCostSummaryApi,
  createConstructionTaskApi,
  getConstructionTasksApi,
  updateConstructionTaskApi,
  setConstructionTaskStatusApi,
  deleteConstructionTaskApi,
} from "./construction-api";
import type {
  ConstructionItem,
  ConstructionItemListResponse,
  CreateConstructionItemPayload,
  UpdateConstructionItemPayload,
  ReorderConstructionItemsPayload,
  SetConstructionItemStatusPayload,
  ConstructionTask,
  ConstructionTaskListResponse,
  CreateConstructionTaskPayload,
  UpdateConstructionTaskPayload,
  SetConstructionTaskStatusPayload,
  ConstructionStatus,
} from "./construction-types";
import type {
  ConstructionCostSummary,
  EngagementCostSummary,
} from "./cost-summary-types";

// ─── Query keys ───────────────────────────────────────────────────────────────

/**
 * Centralised query keys so cache invalidation can reach every construction
 * query from one mutation handler without re-deriving the tuple shape each
 * time.
 */
export const constructionQueryKeys = {
  items: (params: {
    projectWorkingId: string;
    parentId?: string | null;
    status?: ConstructionStatus;
    pageSize?: number;
  }) =>
    [
      "construction-items",
      "list",
      {
        projectWorkingId: params.projectWorkingId,
        parentId: params.parentId ?? null,
        status: params.status ?? null,
        pageSize: params.pageSize ?? null,
      },
    ] as const,
  item: (id: string) => ["construction-items", "detail", { id }] as const,
  itemCostSummary: (id: string) =>
    ["construction-items", "cost-summary", { id }] as const,
  engagementCostSummary: (projectWorkingId: string) =>
    ["construction-items", "engagement-cost-summary", { projectWorkingId }] as const,
  tasks: (params: {
    constructionItemId?: string;
    projectWorkingId?: string;
    status?: ConstructionStatus;
    pageSize?: number;
  }) =>
    [
      "construction-tasks",
      "list",
      {
        constructionItemId: params.constructionItemId ?? null,
        projectWorkingId: params.projectWorkingId ?? null,
        status: params.status ?? null,
        pageSize: params.pageSize ?? null,
      },
    ] as const,
  task: (id: string) => ["construction-tasks", "detail", { id }] as const,
} as const;

// ─── Error messages ───────────────────────────────────────────────────────────

/**
 * Chronological order for anything that hangs on the construction schedule.
 *
 * The milestone screen reads as a plan, so it has to run forward in time — and
 * it cannot lean on the order rows arrive in. Applying a process template
 * writes a whole batch inside one transaction, which stamps every row with the
 * same `createdAt`; sorting on that column leaves the database free to hand
 * back "Sơn nước" before "Phần thô". The server now orders by `estimateAt`
 * too, but the screen states the requirement here rather than inheriting it,
 * so a paged or cache-merged response still renders in the right sequence.
 *
 * Undated rows sort last: they are not on the calendar yet.
 */
export function byScheduleDate(
  a: { estimateAt: string | null; createdAt: string; id: string },
  b: { estimateAt: string | null; createdAt: string; id: string },
): number {
  if (a.estimateAt !== b.estimateAt) {
    if (a.estimateAt === null) return 1;
    if (b.estimateAt === null) return -1;
    return a.estimateAt < b.estimateAt ? -1 : 1;
  }
  // Same target date — fall back to a stable tiebreak so the list does not
  // reshuffle between renders.
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * The order the plan is actually shown in: what the provider arranged, with the
 * schedule only breaking ties.
 *
 * `sortOrder` is what dragging a milestone writes, and the server sorts by it
 * first too. Re-sorting here by date alone would silently undo every drag as
 * soon as the list refetched.
 *
 * Rows saved before the column existed all read as 0, so they tie and fall
 * through to [byScheduleDate] — which is exactly how they sorted before.
 */
export function byPlanOrder(
  a: { sortOrder?: number; estimateAt: string | null; createdAt: string; id: string },
  b: { sortOrder?: number; estimateAt: string | null; createdAt: string; id: string },
): number {
  const aOrder = a.sortOrder ?? 0;
  const bOrder = b.sortOrder ?? 0;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return byScheduleDate(a, b);
}

const TOAST = {
  createSuccess: "Đã tạo mốc công việc.",
  updateSuccess: "Đã cập nhật mốc công việc.",
  deleteSuccess: "Đã xóa mốc công việc.",
  statusSuccess: "Đã cập nhật trạng thái.",
  createTaskSuccess: "Đã tạo công việc.",
  updateTaskSuccess: "Đã cập nhật công việc.",
  deleteTaskSuccess: "Đã xóa công việc.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy mốc công việc.",
  validation: "Thông tin chưa hợp lệ.",
  generic: "Không thể thực hiện. Vui lòng thử lại sau.",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Invalidate every cached view that could be affected by a write to a
 * milestone / task. Centralising the rules here keeps each mutation honest
 * — there is no way to forget a dependent key as long as the caller hands us
 * the ids.
 *
 * Cost summaries are also invalidated: a single edit can change the totals
 * on the parent milestone, on every ancestor, and on the whole engagement.
 */
function invalidateConstructionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  params: {
    projectWorkingId?: string | null;
    itemId?: string | null;
    taskId?: string | null;
  },
): void {
  const { projectWorkingId, itemId, taskId } = params;

  if (projectWorkingId) {
    // Every list call (different filters) for this engagement.
    queryClient.invalidateQueries({
      queryKey: ["construction-items", "list"],
      predicate: (q) => {
        const key = q.queryKey[2] as
          | { projectWorkingId?: string }
          | undefined;
        return key?.projectWorkingId === projectWorkingId;
      },
    });
    queryClient.invalidateQueries({
      queryKey: ["construction-tasks", "list"],
      predicate: (q) => {
        const key = q.queryKey[2] as
          | { projectWorkingId?: string }
          | undefined;
        return key?.projectWorkingId === projectWorkingId;
      },
    });
    queryClient.invalidateQueries({
      queryKey: constructionQueryKeys.engagementCostSummary(projectWorkingId),
    });
  }

  if (itemId) {
    queryClient.invalidateQueries({
      queryKey: constructionQueryKeys.item(itemId),
    });
    queryClient.invalidateQueries({
      queryKey: constructionQueryKeys.itemCostSummary(itemId),
    });
  }

  if (taskId) {
    queryClient.invalidateQueries({
      queryKey: constructionQueryKeys.task(taskId),
    });
  }
}

function resolveErrorMessage(error: AppError): string {
  if (error.isNetworkError) return TOAST.network;
  if (error.isTimeout) return TOAST.timeout;

  switch (error.status) {
    case 400:
      return TOAST.validation;
    case 401:
      return TOAST.unauthorized;
    case 403:
      return TOAST.forbidden;
    case 404:
      return TOAST.notFound;
    default:
      if (
        error.message &&
        error.message.trim().length > 0 &&
        !/^Request failed/i.test(error.message)
      ) {
        return error.message;
      }
      return TOAST.generic;
  }
}

// ─── Get Construction Items (Milestones) ─────────────────────────────────────

export interface UseConstructionItemsOptions {
  projectWorkingId: string;
  parentId?: string | null;
  status?: ConstructionStatus;
  enabled?: boolean;
  /** The backend defaults to 10 when omitted, silently hiding every
   * milestone past the first page. Callers that need the full list (e.g.
   * the milestones management page) should pass something larger. */
  pageSize?: number;
}

export interface UseConstructionItemsResult {
  items: ConstructionItem[];
  topLevelItems: ConstructionItem[];
  subItemsByParent: Record<string, ConstructionItem[]>;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useConstructionItems(
  options: UseConstructionItemsOptions,
): UseConstructionItemsResult {
  const { projectWorkingId, parentId, status, enabled = true, pageSize } = options;

  const query = useQuery<ConstructionItemListResponse, Error>({
    queryKey: constructionQueryKeys.items({
      projectWorkingId,
      parentId,
      status,
      pageSize,
    }),
    queryFn: async ({ signal }) =>
      getConstructionItemsApi(
        projectWorkingId,
        { status, pageSize, ...(parentId !== undefined ? { parentId } : {}) },
        { signal },
      ),
    enabled: enabled && Boolean(projectWorkingId),
    staleTime: 30 * 1000,
  });

  const items = React.useMemo(
    () => query.data?.items ?? [],
    [query.data?.items],
  );

  // Separate top-level milestones from sub-milestones, in schedule order
  const topLevelItems = React.useMemo(
    () => items.filter((item) => item.parentId === null).sort(byPlanOrder),
    [items],
  );

  // Group sub-items by parentId
  const subItemsByParent = React.useMemo(() => {
    const grouped: Record<string, ConstructionItem[]> = {};
    for (const item of items) {
      if (item.parentId !== null) {
        if (!grouped[item.parentId]) {
          grouped[item.parentId] = [];
        }
        grouped[item.parentId]!.push(item);
      }
    }
    for (const list of Object.values(grouped)) list.sort(byPlanOrder);
    return grouped;
  }, [items]);

  return {
    items,
    topLevelItems,
    subItemsByParent,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Get Single Construction Item ─────────────────────────────────────────────

export interface UseConstructionItemOptions {
  id: string;
  enabled?: boolean;
}

export interface UseConstructionItemResult {
  item: ConstructionItem | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useConstructionItem(
  options: UseConstructionItemOptions,
): UseConstructionItemResult {
  const { id, enabled = true } = options;

  const query = useQuery<ConstructionItem, Error>({
    queryKey: constructionQueryKeys.item(id),
    queryFn: async ({ signal }) => getConstructionItemApi(id, { signal }),
    enabled: enabled && Boolean(id),
    staleTime: 30 * 1000,
  });

  return {
    item: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Cost summary (single milestone) ──────────────────────────────────────────

export interface UseConstructionItemCostSummaryOptions {
  itemId: string;
  enabled?: boolean;
}

export interface UseConstructionItemCostSummaryResult {
  summary: ConstructionCostSummary | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * Cost roll-up for a single milestone (own labor + tasks + materials, plus
 * a recursive `children` tree). See `cost-summary-types.ts` for the
 * `null vs 0` rules — a `null` here means "not all actuals are in yet",
 * which is a state the UI must surface rather than hide.
 */
export function useConstructionItemCostSummary(
  options: UseConstructionItemCostSummaryOptions,
): UseConstructionItemCostSummaryResult {
  const { itemId, enabled = true } = options;

  const query = useQuery<ConstructionCostSummary, Error>({
    queryKey: constructionQueryKeys.itemCostSummary(itemId),
    queryFn: async ({ signal }) =>
      getConstructionItemCostSummaryApi(itemId, { signal }),
    enabled: enabled && Boolean(itemId),
    staleTime: 30 * 1000,
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Cost summary (whole engagement) ──────────────────────────────────────────

export interface UseEngagementCostSummaryOptions {
  projectWorkingId: string;
  enabled?: boolean;
}

export interface UseEngagementCostSummaryResult {
  summary: EngagementCostSummary | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * Engagement-wide roll-up: every root milestone + change-order amounts.
 * `enabled` defaults to `true` when an id is provided; pass `enabled: false`
 * to defer the request (e.g. while a parent engagement is still resolving).
 */
export function useEngagementCostSummary(
  options: UseEngagementCostSummaryOptions,
): UseEngagementCostSummaryResult {
  const { projectWorkingId, enabled = true } = options;

  const query = useQuery<EngagementCostSummary, Error>({
    queryKey: constructionQueryKeys.engagementCostSummary(projectWorkingId),
    queryFn: async ({ signal }) =>
      getEngagementCostSummaryApi(projectWorkingId, { signal }),
    enabled: enabled && Boolean(projectWorkingId),
    staleTime: 30 * 1000,
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Get Construction Tasks ───────────────────────────────────────────────────

export interface UseConstructionTasksOptions {
  constructionItemId?: string;
  /** Scope to one engagement. Without this the server returns every task
   * on every engagement the account can see, which made project-level
   * counters (e.g. the milestones toolbar) sum other projects' tasks. */
  projectWorkingId?: string;
  status?: ConstructionStatus;
  enabled?: boolean;
  /** The backend defaults to 10 when omitted, silently hiding every task
   * past the first page. Callers that need the full list should pass
   * something larger. */
  pageSize?: number;
}

export interface UseConstructionTasksResult {
  items: ConstructionTask[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useConstructionTasks(
  options: UseConstructionTasksOptions,
): UseConstructionTasksResult {
  const {
    constructionItemId,
    projectWorkingId,
    status,
    enabled = true,
    pageSize,
  } = options;

  const query = useQuery<ConstructionTaskListResponse, Error>({
    // `projectWorkingId` has to be part of the key: it changes the response,
    // so leaving it out would serve one project's tasks from cache while
    // viewing another.
    queryKey: constructionQueryKeys.tasks({
      constructionItemId,
      projectWorkingId,
      status,
      pageSize,
    }),
    queryFn: async ({ signal }) =>
      getConstructionTasksApi(
        {
          constructionItemId: constructionItemId
            ? constructionItemId
            : undefined,
          projectWorkingId: projectWorkingId
            ? projectWorkingId
            : undefined,
          status,
          pageSize,
        },
        { signal },
      ),
    // Only gate on `enabled` — `constructionItemId` is optional (null/undefined = fetch all tasks).
    enabled,
    staleTime: 30 * 1000,
  });

  return {
    items: query.data?.items ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Create Construction Item Mutation ─────────────────────────────────────────

export interface UseCreateConstructionItemOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (item: ConstructionItem) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useCreateConstructionItemMutation(
  options: UseCreateConstructionItemOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<ConstructionItem, AppError, CreateConstructionItemPayload>({
    mutationFn: (payload) => createConstructionItemApi(payload),

    onSuccess: (item) => {
      invalidateConstructionQueries(queryClient, {
        projectWorkingId: item.projectWorkingId,
        itemId: item.parentId,
      });
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.createSuccess;
        notifySuccess(message);
      }
      options.onSuccessSideEffect?.(item);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        notifyError(message);
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Update Construction Item Mutation ─────────────────────────────────────────

export interface UseUpdateConstructionItemOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (item: ConstructionItem) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useUpdateConstructionItemMutation(
  options: UseUpdateConstructionItemOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    ConstructionItem,
    AppError,
    { id: string; payload: UpdateConstructionItemPayload }
  >({
    mutationFn: ({ id, payload }) => updateConstructionItemApi(id, payload),

    onSuccess: (item) => {
      invalidateConstructionQueries(queryClient, {
        projectWorkingId: item.projectWorkingId,
        itemId: item.id,
        taskId: null,
      });
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.updateSuccess;
        notifySuccess(message);
      }
      options.onSuccessSideEffect?.(item);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        notifyError(message);
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Reorder Construction Items Mutation ──────────────────────────────────────

export interface UseReorderConstructionItemsOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (items: ConstructionItem[]) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

/**
 * Persist a new milestone order.
 *
 * Success is deliberately quiet by default: reordering shows its own result on
 * screen the moment the rows move, and a toast per drag would be noise.
 * Failures still speak up — the list snaps back and the user needs to know why.
 */
export function useReorderConstructionItemsMutation(
  options: UseReorderConstructionItemsOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<ConstructionItem[], AppError, ReorderConstructionItemsPayload>({
    mutationFn: (payload) => reorderConstructionItemsApi(payload),

    onSuccess: (items, variables) => {
      invalidateConstructionQueries(queryClient, {
        projectWorkingId: variables.projectWorkingId,
      });
      if (options.onSuccessMessage) {
        notifySuccess(options.onSuccessMessage);
      }
      options.onSuccessSideEffect?.(items);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        notifyError(message);
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Set Construction Item Status Mutation ─────────────────────────────────────

export interface UseSetConstructionItemStatusOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (item: ConstructionItem) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useSetConstructionItemStatusMutation(
  options: UseSetConstructionItemStatusOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    ConstructionItem,
    AppError,
    { id: string; payload: SetConstructionItemStatusPayload }
  >({
    mutationFn: ({ id, payload }) => setConstructionItemStatusApi(id, payload),

    onSuccess: (item) => {
      invalidateConstructionQueries(queryClient, {
        projectWorkingId: item.projectWorkingId,
        itemId: item.id,
      });
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.statusSuccess;
        notifySuccess(message);
      }
      options.onSuccessSideEffect?.(item);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        notifyError(message);
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Delete Construction Item Mutation ────────────────────────────────────────

export interface UseDeleteConstructionItemOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: () => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useDeleteConstructionItemMutation(
  options: UseDeleteConstructionItemOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    AppError,
    { id: string; projectWorkingId: string }
  >({
    mutationFn: ({ id }) => deleteConstructionItemApi(id),

    onSuccess: (_void, variables) => {
      invalidateConstructionQueries(queryClient, {
        projectWorkingId: variables.projectWorkingId,
        itemId: variables.id,
      });
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.deleteSuccess;
        notifySuccess(message);
      }
      options.onSuccessSideEffect?.();
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        notifyError(message);
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Create Construction Task Mutation ─────────────────────────────────────────

export interface UseCreateConstructionTaskOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (task: ConstructionTask) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useCreateConstructionTaskMutation(
  options: UseCreateConstructionTaskOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    ConstructionTask,
    AppError,
    CreateConstructionTaskPayload & { projectWorkingId: string }
  >({
    mutationFn: (input) => {
      const { projectWorkingId: _ignore, ...payload } = input;
      void _ignore;
      return createConstructionTaskApi(payload);
    },

    onSuccess: (task, variables) => {
      invalidateConstructionQueries(queryClient, {
        projectWorkingId: variables.projectWorkingId,
        itemId: task.constructionItemId,
      });
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.createTaskSuccess;
        notifySuccess(message);
      }
      options.onSuccessSideEffect?.(task);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        notifyError(message);
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Update Construction Task Mutation ─────────────────────────────────────────

export interface UseUpdateConstructionTaskOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (task: ConstructionTask) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useUpdateConstructionTaskMutation(
  options: UseUpdateConstructionTaskOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    ConstructionTask,
    AppError,
    {
      id: string;
      payload: UpdateConstructionTaskPayload;
      projectWorkingId: string;
    }
  >({
    mutationFn: ({ id, payload }) => updateConstructionTaskApi(id, payload),

    onSuccess: (task, variables) => {
      invalidateConstructionQueries(queryClient, {
        projectWorkingId: variables.projectWorkingId,
        itemId: task.constructionItemId,
        taskId: task.id,
      });
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.updateTaskSuccess;
        notifySuccess(message);
      }
      options.onSuccessSideEffect?.(task);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        notifyError(message);
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Set Construction Task Status Mutation ─────────────────────────────────────

export interface UseSetConstructionTaskStatusOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (task: ConstructionTask) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useSetConstructionTaskStatusMutation(
  options: UseSetConstructionTaskStatusOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    ConstructionTask,
    AppError,
    {
      id: string;
      payload: SetConstructionTaskStatusPayload;
      projectWorkingId: string;
    }
  >({
    mutationFn: ({ id, payload }) => setConstructionTaskStatusApi(id, payload),

    onSuccess: (task, variables) => {
      invalidateConstructionQueries(queryClient, {
        projectWorkingId: variables.projectWorkingId,
        itemId: task.constructionItemId,
        taskId: task.id,
      });
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.statusSuccess;
        notifySuccess(message);
      }
      options.onSuccessSideEffect?.(task);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        notifyError(message);
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Delete Construction Task Mutation ─────────────────────────────────────────

export interface UseDeleteConstructionTaskOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: () => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useDeleteConstructionTaskMutation(
  options: UseDeleteConstructionTaskOptions = {},
) {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    AppError,
    {
      id: string;
      projectWorkingId: string;
      constructionItemId: string;
    }
  >({
    mutationFn: ({ id }) => deleteConstructionTaskApi(id),

    onSuccess: (_void, variables) => {
      invalidateConstructionQueries(queryClient, {
        projectWorkingId: variables.projectWorkingId,
        itemId: variables.constructionItemId,
        taskId: variables.id,
      });
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.deleteTaskSuccess;
        notifySuccess(message);
      }
      options.onSuccessSideEffect?.();
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        notifyError(message);
      }
      options.onErrorSideEffect?.(error);
    },
  });
}
