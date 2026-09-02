"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  createDailyLogApi,
  deleteDailyLogApi,
  getDailyLogApi,
  getDailyLogsApi,
  updateDailyLogApi,
} from "./daily-log-api";
import type {
  CreateDailyLogPayload,
  DailyLog,
  DailyLogListResponse,
  UpdateDailyLogPayload,
} from "./daily-log-types";

const TOAST = {
  createSuccess: "Đã ghi nhật ký thi công.",
  updateSuccess: "Đã cập nhật nhật ký.",
  deleteSuccess: "Đã xoá nhật ký.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy nhật ký.",
  generic: "Không thể thực hiện. Vui lòng thử lại sau.",
} as const;

function resolveErrorMessage(error: AppError): string {
  if (error.isNetworkError) return TOAST.network;
  if (error.isTimeout) return TOAST.timeout;

  // Worth keeping verbatim: the server explains date rules ("log date is after
  // today") and engagement-status refusals in a way no fallback can.
  if (
    error.message &&
    error.message.trim().length > 0 &&
    !/^Request failed/i.test(error.message)
  ) {
    return error.message;
  }

  switch (error.status) {
    case 401:
      return TOAST.unauthorized;
    case 403:
      return TOAST.forbidden;
    case 404:
      return TOAST.notFound;
    default:
      return TOAST.generic;
  }
}

export function useDailyLogs(options: {
  projectWorkingId?: string | null;
  constructionItemId?: string | null;
  constructionTaskId?: string | null;
  fromDate?: string;
  toDate?: string;
  pageSize?: number;
  enabled?: boolean;
}) {
  const projectWorkingId = options.projectWorkingId
    ? String(options.projectWorkingId)
    : undefined;
  const constructionItemId = options.constructionItemId
    ? String(options.constructionItemId)
    : undefined;
  const constructionTaskId = options.constructionTaskId
    ? String(options.constructionTaskId)
    : undefined;

  const query = useQuery<DailyLogListResponse, Error>({
    queryKey: [
      "daily-logs",
      {
        projectWorkingId,
        constructionItemId,
        constructionTaskId,
        fromDate: options.fromDate,
        toDate: options.toDate,
      },
    ],
    queryFn: async ({ signal }) =>
      getDailyLogsApi(
        {
          projectWorkingId,
          constructionItemId,
          constructionTaskId,
          fromDate: options.fromDate,
          toDate: options.toDate,
        },
        { pageSize: options.pageSize },
        { signal },
      ),
    enabled:
      (options.enabled ?? true) &&
      Boolean(projectWorkingId || constructionItemId || constructionTaskId),
    staleTime: 30 * 1000,
  });

  return {
    logs: query.data?.items ?? [],
    totalItems: query.data?.totalItems ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useDailyLog(id: string | null | undefined) {
  const logId = id ? String(id) : undefined;

  const query = useQuery<DailyLog, Error>({
    queryKey: ["daily-log", logId],
    queryFn: async ({ signal }) => getDailyLogApi(logId!, { signal }),
    enabled: Boolean(logId),
    staleTime: 30 * 1000,
  });

  return {
    log: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

function useDailyLogInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["daily-logs"] });
    void queryClient.invalidateQueries({ queryKey: ["daily-log"] });
  };
}

export function useCreateDailyLogMutation() {
  const invalidate = useDailyLogInvalidator();

  return useMutation<DailyLog, AppError, CreateDailyLogPayload>({
    mutationFn: (payload) => createDailyLogApi(payload),
    onSuccess: () => {
      notifySuccess(TOAST.createSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useUpdateDailyLogMutation() {
  const invalidate = useDailyLogInvalidator();

  return useMutation<
    DailyLog,
    AppError,
    { id: string; payload: UpdateDailyLogPayload }
  >({
    mutationFn: ({ id, payload }) => updateDailyLogApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.updateSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useDeleteDailyLogMutation() {
  const invalidate = useDailyLogInvalidator();

  return useMutation<void, AppError, string>({
    mutationFn: (id) => deleteDailyLogApi(id),
    onSuccess: () => {
      notifySuccess(TOAST.deleteSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}
