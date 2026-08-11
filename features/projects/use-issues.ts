"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import { useMe } from "@/features/auth/use-me";
import { notifySuccess, notifyError } from "@/lib/notify";
import {
  createIssueApi,
  getIssuesApi,
  getIssueApi,
  updateIssueApi,
  setIssueStatusApi,
  deleteIssueApi,
  getIssueTypesApi,
} from "./issue-api";
import type {
  Issue,
  IssueListResponse,
  CreateIssuePayload,
  UpdateIssuePayload,
  SetIssueStatusPayload,
  IssueStatus,
  IssueType,
} from "./issue-types";

// ─── Error messages ───────────────────────────────────────────────────────────

const TOAST = {
  createSuccess: "Đã tạo vấn đề.",
  updateSuccess: "Đã cập nhật vấn đề.",
  deleteSuccess: "Đã xóa vấn đề.",
  statusSuccess: "Đã cập nhật trạng thái vấn đề.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy vấn đề.",
  validation: "Thông tin chưa hợp lệ.",
  generic: "Không thể thực hiện. Vui lòng thử lại sau.",
} as const;

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

// ─── Get Issues ───────────────────────────────────────────────────────────────

export interface UseIssuesOptions {
  projectWorkingId?: number | string;
  constructionItemId?: number | string;
  status?: IssueStatus;
  enabled?: boolean;
}

export interface UseIssuesResult {
  items: Issue[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useIssues(options: UseIssuesOptions = {}): UseIssuesResult {
  const { projectWorkingId, constructionItemId, status, enabled = true } =
    options;

  const query = useQuery<IssueListResponse, Error>({
    queryKey: [
      "issues",
      { projectWorkingId, constructionItemId, status },
    ],
    queryFn: async ({ signal }) =>
      getIssuesApi(
        {
          projectWorkingId: projectWorkingId ? Number(projectWorkingId) : undefined,
          constructionItemId: constructionItemId
            ? Number(constructionItemId)
            : undefined,
          status,
        },
        { signal },
      ),
    enabled: enabled && Boolean(projectWorkingId),
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

// ─── Get Single Issue ─────────────────────────────────────────────────────────

export interface UseIssueOptions {
  id: number | string;
  enabled?: boolean;
}

export interface UseIssueResult {
  item: Issue | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useIssue(options: UseIssueOptions): UseIssueResult {
  const { id, enabled = true } = options;

  const query = useQuery<Issue, Error>({
    queryKey: ["issues", "detail", { id }],
    queryFn: async ({ signal }) => getIssueApi(Number(id), { signal }),
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

// ─── Get Issue Types (catalog) ────────────────────────────────────────────────

export interface UseIssueTypesResult {
  items: IssueType[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * Catalog of issue types — loaded once per session, cached aggressively.
 */
export function useIssueTypes(options: { enabled?: boolean } = {}): UseIssueTypesResult {
  const { enabled = true } = options;

  const query = useQuery<IssueType[], Error>({
    queryKey: ["issue-types"],
    queryFn: async ({ signal }) => getIssueTypesApi({ signal }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes — catalog rarely changes
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Create Issue Mutation ────────────────────────────────────────────────────

export interface UseCreateIssueOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (issue: Issue) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useCreateIssueMutation(
  options: UseCreateIssueOptions = {},
) {
  const { data: me } = useMe();

  return useMutation<Issue, AppError, Omit<CreateIssuePayload, "createdBy">>({
    mutationFn: (payload) =>
      createIssueApi({ ...payload, createdBy: me?.id ?? 0 }),

    onSuccess: (issue) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.createSuccess;
        notifySuccess(message);
      }
      options.onSuccessSideEffect?.(issue);
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

// ─── Update Issue Mutation ────────────────────────────────────────────────────

export interface UseUpdateIssueOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (issue: Issue) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useUpdateIssueMutation(
  options: UseUpdateIssueOptions = {},
) {
  return useMutation<
    Issue,
    AppError,
    { id: number; payload: UpdateIssuePayload }
  >({
    mutationFn: ({ id, payload }) => updateIssueApi(id, payload),

    onSuccess: (issue) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.updateSuccess;
        notifySuccess(message);
      }
      options.onSuccessSideEffect?.(issue);
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

// ─── Set Issue Status Mutation ────────────────────────────────────────────────

export interface UseSetIssueStatusOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (issue: Issue) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useSetIssueStatusMutation(
  options: UseSetIssueStatusOptions = {},
) {
  return useMutation<
    Issue,
    AppError,
    { id: number; payload: SetIssueStatusPayload }
  >({
    mutationFn: ({ id, payload }) => setIssueStatusApi(id, payload),

    onSuccess: (issue) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.statusSuccess;
        notifySuccess(message);
      }
      options.onSuccessSideEffect?.(issue);
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

// ─── Delete Issue Mutation ────────────────────────────────────────────────────

export interface UseDeleteIssueOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: () => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useDeleteIssueMutation(
  options: UseDeleteIssueOptions = {},
) {
  return useMutation<void, AppError, number>({
    mutationFn: (id) => deleteIssueApi(id),

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
