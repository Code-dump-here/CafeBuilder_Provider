"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  confirmPaymentBatchApi,
  getPaymentBatchApi,
  getPaymentBatchesApi,
  linkPaymentBatchConstructionItemApi,
  rejectPaymentBatchApi,
  submitPaymentProofApi,
} from "./payment-batch-api";
import {
  summarizePaymentBatches,
  type LinkConstructionItemPayload,
  type PaymentBatch,
  type PaymentBatchListResponse,
  type PaymentBatchStatus,
  type RejectPaymentBatchPayload,
  type SubmitPaymentProofPayload,
} from "./payment-batch-types";

const TOAST = {
  proofSuccess: "Đã gửi minh chứng thanh toán.",
  confirmSuccess: "Đã xác nhận nhận đủ tiền.",
  rejectSuccess: "Đã bác minh chứng — chủ quán sẽ gửi lại.",
  linkSuccess: "Đã gắn đợt thanh toán vào hạng mục.",
  unlinkSuccess: "Đã gỡ liên kết hạng mục.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy đợt thanh toán.",
  generic: "Không thể thực hiện. Vui lòng thử lại sau.",
} as const;

function resolveErrorMessage(error: AppError): string {
  if (error.isNetworkError) return TOAST.network;
  if (error.isTimeout) return TOAST.timeout;

  // The server explains which transition was refused — e.g. only a batch
  // awaiting reconciliation can be rejected. That beats any generic sentence.
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

export function usePaymentBatches(options: {
  contractId?: string | null;
  projectWorkingId?: string | null;
  status?: PaymentBatchStatus;
  enabled?: boolean;
}) {
  const contractId = options.contractId ? String(options.contractId) : undefined;
  const projectWorkingId = options.projectWorkingId
    ? String(options.projectWorkingId)
    : undefined;

  const query = useQuery<PaymentBatchListResponse, Error>({
    queryKey: [
      "payment-batches",
      { contractId, projectWorkingId, status: options.status },
    ],
    queryFn: async ({ signal }) =>
      getPaymentBatchesApi(
        { contractId, projectWorkingId },
        { status: options.status },
        { signal },
      ),
    enabled: (options.enabled ?? true) && Boolean(contractId || projectWorkingId),
    staleTime: 30 * 1000,
  });

  const batches = query.data?.items ?? [];

  return {
    batches,
    summary: summarizePaymentBatches(batches),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function usePaymentBatch(id: string | null | undefined) {
  const batchId = id ? String(id) : undefined;

  const query = useQuery<PaymentBatch, Error>({
    queryKey: ["payment-batch", batchId],
    queryFn: async ({ signal }) => getPaymentBatchApi(batchId!, { signal }),
    enabled: Boolean(batchId),
    staleTime: 30 * 1000,
  });

  return {
    batch: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Confirming a batch flips `isPaid` on the linked construction item, so the
 * milestone views have to be refetched too — otherwise the payment page says
 * "confirmed" while the milestone still shows "chưa thanh toán" until reload.
 * Change orders share the same batches, hence the third key.
 */
function usePaymentBatchInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["payment-batches"] });
    void queryClient.invalidateQueries({ queryKey: ["payment-batch"] });
    void queryClient.invalidateQueries({ queryKey: ["construction-items"] });
    void queryClient.invalidateQueries({ queryKey: ["change-orders"] });
    void queryClient.invalidateQueries({ queryKey: ["cost-summary"] });
  };
}

/** Owner-only; kept here because the feature module serves both apps' types. */
export function useSubmitPaymentProofMutation() {
  const invalidate = usePaymentBatchInvalidator();

  return useMutation<
    PaymentBatch,
    AppError,
    { id: string; payload: SubmitPaymentProofPayload }
  >({
    mutationFn: ({ id, payload }) => submitPaymentProofApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.proofSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useConfirmPaymentBatchMutation() {
  const invalidate = usePaymentBatchInvalidator();

  return useMutation<PaymentBatch, AppError, string>({
    mutationFn: (id) => confirmPaymentBatchApi(id),
    onSuccess: () => {
      notifySuccess(TOAST.confirmSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useRejectPaymentBatchMutation() {
  const invalidate = usePaymentBatchInvalidator();

  return useMutation<
    PaymentBatch,
    AppError,
    { id: string; payload: RejectPaymentBatchPayload }
  >({
    mutationFn: ({ id, payload }) => rejectPaymentBatchApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.rejectSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useLinkPaymentBatchItemMutation() {
  const invalidate = usePaymentBatchInvalidator();

  return useMutation<
    PaymentBatch,
    AppError,
    { id: string; payload: LinkConstructionItemPayload }
  >({
    mutationFn: ({ id, payload }) =>
      linkPaymentBatchConstructionItemApi(id, payload),
    onSuccess: (_data, variables) => {
      notifySuccess(
        variables.payload.constructionItemId
          ? TOAST.linkSuccess
          : TOAST.unlinkSuccess,
      );
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}
