"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  applyConstructionTemplateApi,
  createConstructionTemplateApi,
  deleteConstructionTemplateApi,
  getConstructionTemplatesApi,
  reorderConstructionTemplateItemsApi,
} from "./construction-template-api";
import type {
  ApplyConstructionTemplatePayload,
  ApplyConstructionTemplateResult,
  ConstructionTemplate,
  ConstructionTemplateListResponse,
  CreateConstructionTemplatePayload,
  ReorderConstructionTemplateItemsPayload,
  TemplateServiceKind,
} from "./construction-template-types";

const TOAST = {
  createSuccess: "Đã lưu mẫu quy trình.",
  deleteSuccess: "Đã xoá mẫu quy trình.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy mẫu quy trình.",
  generic: "Không thể thực hiện. Vui lòng thử lại sau.",
} as const;

/**
 * Prefer the server's sentence. On this endpoint it is the only text that says
 * *why* a template was refused — no signed contract, or a start date in the
 * past — and a generic fallback would leave the provider guessing.
 */
function resolveErrorMessage(error: AppError): string {
  if (error.isNetworkError) return TOAST.network;
  if (error.isTimeout) return TOAST.timeout;

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

/**
 * The templates this provider can pick from: the system's public ones plus
 * their own.
 *
 * `staleTime` is generous — the public set is seeded, and a provider's own
 * templates only change when they edit them in this same app, which
 * invalidates the key anyway.
 */
export function useConstructionTemplates(options?: {
  serviceKind?: TemplateServiceKind;
  enabled?: boolean;
}) {
  const serviceKind = options?.serviceKind;

  const query = useQuery<ConstructionTemplateListResponse, Error>({
    queryKey: ["construction-templates", { serviceKind }],
    queryFn: async ({ signal }) =>
      getConstructionTemplatesApi({ serviceKind }, { signal }),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });

  return {
    templates: query.data?.items ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

interface UseApplyConstructionTemplateOptions {
  onSuccessMessage?: string | null;
  onSuccessSideEffect?: (result: ApplyConstructionTemplateResult) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

/**
 * Copy a template's phases and tasks onto an engagement.
 *
 * Invalidates by key PREFIX rather than an exact key: this writes an unknown
 * number of rows into both lists, and the milestones page holds those queries
 * under keys carrying `status` and `pageSize` that this hook has no way to
 * know. Matching the prefix refreshes whichever variants are mounted.
 */
export function useApplyConstructionTemplateMutation(
  options: UseApplyConstructionTemplateOptions = {},
) {
  const queryClient = useQueryClient();

  return useMutation<
    ApplyConstructionTemplateResult,
    AppError,
    { id: string; payload: ApplyConstructionTemplatePayload }
  >({
    mutationFn: ({ id, payload }) => applyConstructionTemplateApi(id, payload),

    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["construction-items"] });
      void queryClient.invalidateQueries({ queryKey: ["construction-tasks"] });

      if (options.onSuccessMessage !== null) {
        notifySuccess(
          options.onSuccessMessage ??
            `Đã tạo ${result.createdItems} hạng mục và ${result.createdTasks} công việc từ mẫu.`,
        );
      }
      options.onSuccessSideEffect?.(result);
    },

    onError: (error) => {
      notifyError(resolveErrorMessage(error));
      options.onErrorSideEffect?.(error);
    },
  });
}

/**
 * Persist a new order for a template's phases.
 *
 * Quiet on success — the rows have already moved on screen. Invalidates the
 * template list so every other copy of it picks the new order up.
 */
export function useReorderConstructionTemplateItemsMutation(options: {
  onSuccessSideEffect?: (template: ConstructionTemplate) => void;
  onErrorSideEffect?: (error: AppError) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation<
    ConstructionTemplate,
    AppError,
    { id: string; payload: ReorderConstructionTemplateItemsPayload }
  >({
    mutationFn: ({ id, payload }) =>
      reorderConstructionTemplateItemsApi(id, payload),

    onSuccess: (template) => {
      void queryClient.invalidateQueries({ queryKey: ["construction-templates"] });
      options.onSuccessSideEffect?.(template);
    },

    onError: (error) => {
      notifyError(resolveErrorMessage(error));
      options.onErrorSideEffect?.(error);
    },
  });
}

export function useCreateConstructionTemplateMutation(options: {
  onSuccessSideEffect?: (template: ConstructionTemplate) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation<ConstructionTemplate, AppError, CreateConstructionTemplatePayload>({
    mutationFn: (payload) => createConstructionTemplateApi(payload),

    onSuccess: (template) => {
      void queryClient.invalidateQueries({ queryKey: ["construction-templates"] });
      notifySuccess(TOAST.createSuccess);
      options.onSuccessSideEffect?.(template);
    },

    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useDeleteConstructionTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, AppError, string>({
    mutationFn: (id) => deleteConstructionTemplateApi(id),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["construction-templates"] });
      notifySuccess(TOAST.deleteSuccess);
    },

    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}
