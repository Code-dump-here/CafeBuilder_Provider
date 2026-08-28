"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  acceptQuotationApi,
  addQuotationAttachmentApi,
  createQuotationApi,
  deleteQuotationApi,
  getQuotationApi,
  getQuotationsApi,
  rejectQuotationApi,
  removeQuotationAttachmentApi,
  requestQuotationRevisionApi,
  sendQuotationApi,
  updateQuotationApi,
} from "./quotation-api";
import type {
  AcceptQuotationResponse,
  AddQuotationAttachmentPayload,
  CreateQuotationPayload,
  Quotation,
  QuotationListResponse,
  QuotationStatus,
  RespondQuotationPayload,
  UpdateQuotationPayload,
} from "./quotation-types";

const TOAST = {
  createSuccess: "Đã tạo bản nháp báo giá.",
  updateSuccess: "Đã lưu báo giá.",
  sendSuccess: "Đã gửi báo giá cho chủ quán.",
  deleteSuccess: "Đã xoá bản nháp.",
  acceptSuccess: "Đã duyệt báo giá — provider này được chọn cho dự án.",
  rejectSuccess: "Đã từ chối báo giá.",
  revisionSuccess: "Đã yêu cầu provider gửi bản khác.",
  attachSuccess: "Đã đính kèm file.",
  detachSuccess: "Đã gỡ file đính kèm.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy báo giá.",
  generic: "Không thể thực hiện. Vui lòng thử lại sau.",
} as const;

/**
 * Prefer the server's sentence: it is the only place that says *which*
 * transition was refused ("báo giá đang ở trạng thái 'accepted'…"), and a
 * generic fallback would throw that away.
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

export function useQuotations(options: {
  applyId?: string | null;
  projectWorkingId?: string | null;
  postId?: string | null;
  status?: QuotationStatus;
  enabled?: boolean;
}) {
  const applyId = options.applyId ? String(options.applyId) : undefined;
  const projectWorkingId = options.projectWorkingId
    ? String(options.projectWorkingId)
    : undefined;
  const postId = options.postId ? String(options.postId) : undefined;

  const query = useQuery<QuotationListResponse, Error>({
    queryKey: [
      "quotations",
      { applyId, projectWorkingId, postId, status: options.status },
    ],
    queryFn: async ({ signal }) =>
      getQuotationsApi(
        { applyId, projectWorkingId, postId },
        { status: options.status },
        { signal },
      ),
    // Unfiltered, the endpoint returns every quotation the account can see —
    // useful to nobody, and expensive on a busy account.
    enabled:
      (options.enabled ?? true) &&
      Boolean(applyId || projectWorkingId || postId),
    staleTime: 30 * 1000,
  });

  return {
    quotations: query.data?.items ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useQuotation(id: string | null | undefined) {
  const quotationId = id ? String(id) : undefined;

  const query = useQuery<Quotation, Error>({
    queryKey: ["quotation", quotationId],
    queryFn: async ({ signal }) => getQuotationApi(quotationId!, { signal }),
    enabled: Boolean(quotationId),
    staleTime: 30 * 1000,
  });

  return {
    quotation: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Approving a quotation reaches well past the quotation list: it accepts an
 * application, opens an engagement and closes the post. Everything that shows
 * any of those has to be invalidated, or the app keeps offering "apply" on a
 * post that has just been awarded.
 */
function useQuotationInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["quotations"] });
    void queryClient.invalidateQueries({ queryKey: ["quotation"] });
    void queryClient.invalidateQueries({ queryKey: ["project-applications"] });
    void queryClient.invalidateQueries({ queryKey: ["engagements"] });
    void queryClient.invalidateQueries({ queryKey: ["my-project-workings"] });
    void queryClient.invalidateQueries({ queryKey: ["marketplace"] });
  };
}

export function useCreateQuotationMutation() {
  const invalidate = useQuotationInvalidator();

  return useMutation<Quotation, AppError, CreateQuotationPayload>({
    mutationFn: (payload) => createQuotationApi(payload),
    onSuccess: () => {
      notifySuccess(TOAST.createSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useUpdateQuotationMutation() {
  const invalidate = useQuotationInvalidator();

  return useMutation<
    Quotation,
    AppError,
    { id: string; payload: UpdateQuotationPayload }
  >({
    mutationFn: ({ id, payload }) => updateQuotationApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.updateSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useSendQuotationMutation() {
  const invalidate = useQuotationInvalidator();

  return useMutation<Quotation, AppError, string>({
    mutationFn: (id) => sendQuotationApi(id),
    onSuccess: () => {
      notifySuccess(TOAST.sendSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useDeleteQuotationMutation() {
  const invalidate = useQuotationInvalidator();

  return useMutation<void, AppError, string>({
    mutationFn: (id) => deleteQuotationApi(id),
    onSuccess: () => {
      notifySuccess(TOAST.deleteSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

/**
 * Owner-only actions. They live here because the feature module is shared, and
 * the provider UI simply never renders a control that calls them.
 */
export function useAcceptQuotationMutation() {
  const invalidate = useQuotationInvalidator();

  return useMutation<AcceptQuotationResponse, AppError, string>({
    mutationFn: (id) => acceptQuotationApi(id),
    onSuccess: () => {
      notifySuccess(TOAST.acceptSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useRejectQuotationMutation() {
  const invalidate = useQuotationInvalidator();

  return useMutation<
    Quotation,
    AppError,
    { id: string; payload: RespondQuotationPayload }
  >({
    mutationFn: ({ id, payload }) => rejectQuotationApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.rejectSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useRequestQuotationRevisionMutation() {
  const invalidate = useQuotationInvalidator();

  return useMutation<
    Quotation,
    AppError,
    { id: string; payload: RespondQuotationPayload }
  >({
    mutationFn: ({ id, payload }) => requestQuotationRevisionApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.revisionSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useAddQuotationAttachmentMutation() {
  const invalidate = useQuotationInvalidator();

  return useMutation<
    Quotation,
    AppError,
    { id: string; payload: AddQuotationAttachmentPayload }
  >({
    mutationFn: ({ id, payload }) => addQuotationAttachmentApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.attachSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useRemoveQuotationAttachmentMutation() {
  const invalidate = useQuotationInvalidator();

  return useMutation<void, AppError, { id: string; attachmentId: string }>({
    mutationFn: ({ id, attachmentId }) =>
      removeQuotationAttachmentApi(id, attachmentId),
    onSuccess: () => {
      notifySuccess(TOAST.detachSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}
