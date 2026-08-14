"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import { useMe } from "@/features/auth/use-me";
import { notifySuccess, notifyError } from "@/lib/notify";
import {
  createConstructionItemApi,
  getConstructionItemsApi,
  getConstructionItemApi,
  updateConstructionItemApi,
  setConstructionItemStatusApi,
  deleteConstructionItemApi,
  createConstructionTaskApi,
  getConstructionTasksApi,
  getConstructionTaskApi,
  updateConstructionTaskApi,
  setConstructionTaskStatusApi,
  deleteConstructionTaskApi,
} from "./construction-api";
import type {
  ConstructionItem,
  ConstructionItemListResponse,
  CreateConstructionItemPayload,
  UpdateConstructionItemPayload,
  SetConstructionItemStatusPayload,
  ConstructionTask,
  ConstructionTaskListResponse,
  CreateConstructionTaskPayload,
  UpdateConstructionTaskPayload,
  SetConstructionTaskStatusPayload,
  ConstructionStatus,
} from "./construction-types";

// ─── Error messages ───────────────────────────────────────────────────────────

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
  projectWorkingId: number | string;
  parentId?: number | null;
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
  subItemsByParent: Record<number, ConstructionItem[]>;
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
    queryKey: ["construction-items", { projectWorkingId, status, pageSize }],
    queryFn: async ({ signal }) =>
      getConstructionItemsApi(
        Number(projectWorkingId),
        { status, pageSize, ...(parentId !== undefined ? { parentId } : {}) },
        { signal },
      ),
    enabled: enabled && Boolean(projectWorkingId),
    staleTime: 30 * 1000,
  });

  const items = query.data?.items ?? [];

  // Separate top-level milestones from sub-milestones
  const topLevelItems = React.useMemo(
    () => items.filter((item) => item.parentId === null),
    [items],
  );

  // Group sub-items by parentId
  const subItemsByParent = React.useMemo(() => {
    const grouped: Record<number, ConstructionItem[]> = {};
    for (const item of items) {
      if (item.parentId !== null) {
        if (!grouped[item.parentId]) {
          grouped[item.parentId] = [];
        }
        grouped[item.parentId]!.push(item);
      }
    }
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
  id: number | string;
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
    queryKey: ["construction-items", "detail", { id }],
    queryFn: async ({ signal }) => getConstructionItemApi(Number(id), { signal }),
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

// ─── Get Construction Tasks ───────────────────────────────────────────────────

export interface UseConstructionTasksOptions {
  constructionItemId?: number | string;
  status?: ConstructionStatus;
  enabled?: boolean;
  /** The backend defaults to 10 when omitted, silently hiding every task
   * past the first page — worse here than on items, since this call has no
   * constructionItemId filter option at the milestones-page call site, so
   * it's paging across every task the account can see, not just this
   * project's. Callers that need the full list should pass something
   * larger. */
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
  const { constructionItemId, status, enabled = true, pageSize } = options;

  const query = useQuery<ConstructionTaskListResponse, Error>({
    queryKey: ["construction-tasks", { constructionItemId, status, pageSize }],
    queryFn: async ({ signal }) =>
      getConstructionTasksApi(
        {
          constructionItemId: constructionItemId
            ? Number(constructionItemId)
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
  const { data: me } = useMe();

  return useMutation<ConstructionItem, AppError, Omit<CreateConstructionItemPayload, "createdBy">>({
    mutationFn: (payload) =>
      createConstructionItemApi({ ...payload, createdBy: me?.id ?? 0 }),

    onSuccess: (item) => {
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
  return useMutation<
    ConstructionItem,
    AppError,
    { id: number; payload: UpdateConstructionItemPayload }
  >({
    mutationFn: ({ id, payload }) => updateConstructionItemApi(id, payload),

    onSuccess: (item) => {
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
  return useMutation<
    ConstructionItem,
    AppError,
    { id: number; payload: SetConstructionItemStatusPayload }
  >({
    mutationFn: ({ id, payload }) => setConstructionItemStatusApi(id, payload),

    onSuccess: (item) => {
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
  return useMutation<void, AppError, number>({
    mutationFn: (id) => deleteConstructionItemApi(id),

    onSuccess: () => {
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
  const { data: me } = useMe();

  return useMutation<ConstructionTask, AppError, Omit<CreateConstructionTaskPayload, "createdBy">>({
    mutationFn: (payload) =>
      createConstructionTaskApi({ ...payload, createdBy: me?.id ?? 0 }),

    onSuccess: (task) => {
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
  return useMutation<
    ConstructionTask,
    AppError,
    { id: number; payload: UpdateConstructionTaskPayload }
  >({
    mutationFn: ({ id, payload }) => updateConstructionTaskApi(id, payload),

    onSuccess: (task) => {
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
  return useMutation<
    ConstructionTask,
    AppError,
    { id: number; payload: SetConstructionTaskStatusPayload }
  >({
    mutationFn: ({ id, payload }) => setConstructionTaskStatusApi(id, payload),

    onSuccess: (task) => {
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
  return useMutation<void, AppError, number>({
    mutationFn: (id) => deleteConstructionTaskApi(id),

    onSuccess: () => {
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
