"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  attachChecklistEvidenceApi,
  checkChecklistItemApi,
  createChecklistItemsApi,
  deleteChecklistItemApi,
  getChecklistItemsApi,
  updateChecklistItemApi,
} from "./checklist-api";
import type {
  AttachChecklistEvidencePayload,
  CheckChecklistItemPayload,
  ChecklistItem,
  ChecklistItemListResponse,
  CreateChecklistItemsPayload,
  UpdateChecklistItemPayload,
} from "./checklist-types";

const TOAST = {
  createSuccess: "Đã thêm mục nghiệm thu.",
  updateSuccess: "Đã cập nhật mục nghiệm thu.",
  deleteSuccess: "Đã xoá mục nghiệm thu.",
  checkSuccess: "Đã chấm nghiệm thu.",
  evidenceSuccess: "Đã đính minh chứng.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy mục nghiệm thu.",
  generic: "Không thể thực hiện. Vui lòng thử lại sau.",
} as const;

/**
 * Prefer the server's sentence. It is the only place that says *which* items
 * are blocking and what needs fixing; a generic fallback would throw that away.
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

export function useChecklistItems(options: {
  designId?: string | null;
  constructionItemId?: string | null;
  enabled?: boolean;
}) {
  const designId = options.designId ? String(options.designId) : undefined;
  const constructionItemId = options.constructionItemId
    ? String(options.constructionItemId)
    : undefined;

  const query = useQuery<ChecklistItemListResponse, Error>({
    queryKey: ["checklist-items", { designId, constructionItemId }],
    queryFn: async ({ signal }) =>
      getChecklistItemsApi({ designId, constructionItemId }, undefined, { signal }),
    // Exactly one target; sending both is a 400, so don't fire.
    enabled:
      (options.enabled ?? true) && Boolean(designId) !== Boolean(constructionItemId),
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

/**
 * Checklist state decides whether a milestone can close and whether a design
 * can be approved, so a change here has to invalidate those views too —
 * otherwise the gate banner and the status buttons disagree until a reload.
 */
function useChecklistInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["checklist-items"] });
    void queryClient.invalidateQueries({ queryKey: ["construction-items"] });
    void queryClient.invalidateQueries({ queryKey: ["designs"] });
  };
}

export function useCreateChecklistItemsMutation() {
  const invalidate = useChecklistInvalidator();

  return useMutation<ChecklistItem[], AppError, CreateChecklistItemsPayload>({
    mutationFn: (payload) => createChecklistItemsApi(payload),
    onSuccess: () => {
      notifySuccess(TOAST.createSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useUpdateChecklistItemMutation() {
  const invalidate = useChecklistInvalidator();

  return useMutation<
    ChecklistItem,
    AppError,
    { id: string; payload: UpdateChecklistItemPayload }
  >({
    mutationFn: ({ id, payload }) => updateChecklistItemApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.updateSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useDeleteChecklistItemMutation() {
  const invalidate = useChecklistInvalidator();

  return useMutation<void, AppError, string>({
    mutationFn: (id) => deleteChecklistItemApi(id),
    onSuccess: () => {
      notifySuccess(TOAST.deleteSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

/**
 * Owner-only. Exposed here because the same feature module serves both apps'
 * shared types; the provider UI does not render a control that calls it.
 */
export function useCheckChecklistItemMutation() {
  const invalidate = useChecklistInvalidator();

  return useMutation<
    ChecklistItem,
    AppError,
    { id: string; payload: CheckChecklistItemPayload }
  >({
    mutationFn: ({ id, payload }) => checkChecklistItemApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.checkSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useAttachChecklistEvidenceMutation() {
  const invalidate = useChecklistInvalidator();

  return useMutation<
    ChecklistItem,
    AppError,
    { id: string; payload: AttachChecklistEvidencePayload }
  >({
    mutationFn: ({ id, payload }) => attachChecklistEvidenceApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.evidenceSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}
