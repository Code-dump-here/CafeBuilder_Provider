"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import {
  getEngagementsApi,
  getEngagementApi,
  getEngagementOverviewApi,
  updateEngagementStatusApi,
} from "./engagement-api";
import type {
  Engagement,
  EngagementListResponse,
  EngagementOverview,
  UpdateEngagementStatusPayload,
} from "./engagement-types";

// ─── Toast messages ─────────────────────────────────────────────────────────

const TOAST = {
  statusUpdateSuccess: "Engagement status updated.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy hợp đồng.",
  validation: "Thông tin chưa hợp lệ.",
  generic: "Không thể cập nhật. Vui lòng thử lại sau.",
} as const;

// ─── Get Engagements Query ─────────────────────────────────────────────────

export interface UseEngagementsOptions {
  /** Filter by project ID (projectShopOwnerId) */
  projectId?: number | string;
  /** Filter by provider profile ID */
  providerId?: number | string;
  /** Filter by engagement status */
  status?: string;
  /** Page size */
  pageSize?: number;
  /** Enable the query */
  enabled?: boolean;
}

export interface UseEngagementsResult {
  engagements: Engagement[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useEngagements(
  options: UseEngagementsOptions = {},
): UseEngagementsResult {
  const {
    projectId,
    providerId,
    status,
    pageSize = 20,
    enabled = true,
  } = options;

  const query = useQuery<EngagementListResponse, Error>({
    queryKey: ["engagements", { projectId, providerId, status, pageSize }],
    queryFn: async ({ signal }) => {
      return getEngagementsApi(
        {
          projectShopOwnerId:
            projectId !== undefined ? Number(projectId) : undefined,
          serviceProviderProfileId:
            providerId !== undefined ? Number(providerId) : undefined,
          status,
          pageSize,
        },
        { signal },
      );
    },
    enabled: enabled && (Boolean(projectId) || Boolean(providerId)),
    staleTime: 30 * 1000,
  });

  const engagements = query.data?.items ?? [];

  return {
    engagements,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Get Single Engagement Query ────────────────────────────────────────────

export interface UseEngagementOptions {
  engagementId: number | string;
  enabled?: boolean;
}

export interface UseEngagementResult {
  engagement: Engagement | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useEngagement(
  options: UseEngagementOptions,
): UseEngagementResult {
  const { engagementId, enabled = true } = options;

  const query = useQuery<Engagement, Error>({
    queryKey: ["engagements", "detail", { engagementId }],
    queryFn: async ({ signal }) => {
      return getEngagementApi(Number(engagementId), { signal });
    },
    enabled: enabled && Boolean(engagementId),
    staleTime: 30 * 1000,
  });

  return {
    engagement: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Get Engagement Overview Query ──────────────────────────────────────────

export interface UseEngagementOverviewOptions {
  engagementId: number | string;
  enabled?: boolean;
}

export interface UseEngagementOverviewResult {
  overview: EngagementOverview | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useEngagementOverview(
  options: UseEngagementOverviewOptions,
): UseEngagementOverviewResult {
  const { engagementId, enabled = true } = options;

  const query = useQuery<EngagementOverview, Error>({
    queryKey: ["engagements", "overview", { engagementId }],
    queryFn: async ({ signal }) => {
      return getEngagementOverviewApi(Number(engagementId), { signal });
    },
    enabled: enabled && Boolean(engagementId),
    staleTime: 30 * 1000,
  });

  return {
    overview: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Update Engagement Status Mutation ──────────────────────────────────────

export interface UpdateEngagementStatusOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (engagement: Engagement) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useUpdateEngagementStatusMutation(
  options: UpdateEngagementStatusOptions = {},
) {
  return useMutation<
    Engagement,
    AppError,
    { engagementId: number; payload: UpdateEngagementStatusPayload }
  >({
    mutationFn: ({ engagementId, payload }) =>
      updateEngagementStatusApi(engagementId, payload),

    onSuccess: (engagement) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.statusUpdateSuccess;
        console.log(message); // TODO: wire to toast
      }
      options.onSuccessSideEffect?.(engagement);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        console.log(message); // TODO: wire to toast
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

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
