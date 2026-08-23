"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  acceptChangeOrderApi,
  createChangeOrderApi,
  getChangeOrderSummaryApi,
  getChangeOrdersApi,
  getRevisionQuotaApi,
  rejectChangeOrderApi,
  updateChangeOrderApi,
  withdrawChangeOrderApi,
} from "./change-order-api";
import type {
  ChangeOrder,
  ChangeOrderListResponse,
  ChangeOrderStatus,
  ChangeOrderSummary,
  CreateChangeOrderPayload,
  RevisionQuota,
  UpdateChangeOrderPayload,
} from "./change-order-types";

const TOAST = {
  createSuccess: "Đã gửi khoản phát sinh cho bên kia duyệt.",
  updateSuccess: "Đã cập nhật khoản phát sinh.",
  acceptSuccess: "Đã duyệt khoản phát sinh.",
  rejectSuccess: "Đã từ chối khoản phát sinh.",
  withdrawSuccess: "Đã rút lại khoản phát sinh.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy khoản phát sinh.",
  generic: "Không thể thực hiện. Vui lòng thử lại sau.",
} as const;

/**
 * The server's refusals here are the whole explanation — "khoản phát sinh do
 * chính bên bạn lập", "đã 'accepted' — mỗi khoản chỉ phản hồi được một lần".
 * Swapping them for a generic string would leave the user with no idea why the
 * button did nothing.
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
    case 403:
      return TOAST.unauthorized;
    case 404:
      return TOAST.notFound;
    default:
      return TOAST.generic;
  }
}

export function useChangeOrders(options: {
  projectWorkingId: string | null | undefined;
  status?: ChangeOrderStatus;
  enabled?: boolean;
}) {
  const projectWorkingId = options.projectWorkingId
    ? String(options.projectWorkingId)
    : "";
  const status = options.status;

  const query = useQuery<ChangeOrderListResponse, Error>({
    queryKey: ["change-orders", { projectWorkingId, status: status ?? null }],
    queryFn: async ({ signal }) =>
      getChangeOrdersApi(projectWorkingId, { status }, { signal }),
    enabled: (options.enabled ?? true) && Boolean(projectWorkingId),
    staleTime: 30 * 1000,
  });

  return {
    orders: query.data?.items ?? [],
    totalItems: query.data?.totalItems ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useChangeOrderSummary(options: {
  projectWorkingId: string | null | undefined;
  enabled?: boolean;
}) {
  const projectWorkingId = options.projectWorkingId
    ? String(options.projectWorkingId)
    : "";

  const query = useQuery<ChangeOrderSummary, Error>({
    queryKey: ["change-order-summary", { projectWorkingId }],
    queryFn: async ({ signal }) => getChangeOrderSummaryApi(projectWorkingId, { signal }),
    enabled: (options.enabled ?? true) && Boolean(projectWorkingId),
    staleTime: 30 * 1000,
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useRevisionQuota(options: {
  designId: string | null | undefined;
  enabled?: boolean;
}) {
  const designId = options.designId ? String(options.designId) : "";

  const query = useQuery<RevisionQuota, Error>({
    queryKey: ["revision-quota", { designId }],
    queryFn: async ({ signal }) => getRevisionQuotaApi(designId, { signal }),
    enabled: (options.enabled ?? true) && Boolean(designId),
    staleTime: 30 * 1000,
  });

  return {
    quota: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Everything money-shaped for this engagement. A decision on a change order
 * moves the committed total, so the summary has to go with the list.
 */
function useChangeOrderInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["change-orders"] });
    void queryClient.invalidateQueries({ queryKey: ["change-order-summary"] });
    void queryClient.invalidateQueries({ queryKey: ["revision-quota"] });
  };
}

export function useCreateChangeOrderMutation() {
  const invalidate = useChangeOrderInvalidator();

  return useMutation<ChangeOrder, AppError, CreateChangeOrderPayload>({
    mutationFn: (payload) => createChangeOrderApi(payload),
    onSuccess: () => {
      notifySuccess(TOAST.createSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useUpdateChangeOrderMutation() {
  const invalidate = useChangeOrderInvalidator();

  return useMutation<
    ChangeOrder,
    AppError,
    { id: string; payload: UpdateChangeOrderPayload }
  >({
    mutationFn: ({ id, payload }) => updateChangeOrderApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.updateSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useAcceptChangeOrderMutation() {
  const invalidate = useChangeOrderInvalidator();

  return useMutation<ChangeOrder, AppError, string>({
    mutationFn: (id) => acceptChangeOrderApi(id),
    onSuccess: () => {
      notifySuccess(TOAST.acceptSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useRejectChangeOrderMutation() {
  const invalidate = useChangeOrderInvalidator();

  return useMutation<ChangeOrder, AppError, { id: string; rejectReason: string }>({
    mutationFn: ({ id, rejectReason }) => rejectChangeOrderApi(id, rejectReason),
    onSuccess: () => {
      notifySuccess(TOAST.rejectSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useWithdrawChangeOrderMutation() {
  const invalidate = useChangeOrderInvalidator();

  return useMutation<void, AppError, string>({
    mutationFn: (id) => withdrawChangeOrderApi(id),
    onSuccess: () => {
      notifySuccess(TOAST.withdrawSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}
