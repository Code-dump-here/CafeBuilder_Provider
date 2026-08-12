"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AppError } from "@/lib/http/errors";
import {
  getEngagementsApi,
  getEngagementApi,
  getEngagementOverviewApi,
  requestCompletionApi,
  completeEngagementApi,
  terminateEngagementApi,
  updateEngagementStatusApi,
} from "./engagement-api";
import type {
  Engagement,
  EngagementListResponse,
  EngagementOverview,
  UpdateEngagementStatusPayload,
} from "./engagement-types";
import { queryKeys } from "@/lib/react-query/keys";

// ─── Toast messages ─────────────────────────────────────────────────────────

const TOAST = {
  statusUpdateSuccess: "Engagement status updated.",
  requestCompletionSuccess:
    "Đã gửi yêu cầu nghiệm thu — chờ chủ dự án xác nhận.",
  completeSuccess: "Đã nghiệm thu hợp tác.",
  /** Both sides agreed — the engagement really is over. */
  terminateSuccess: "Đã huỷ ngang hợp tác.",
  /**
   * Only our side has asked so far. `POST /terminate` is a one-touch gateway:
   * with no request pending it FILES one and the engagement stays `accepted`;
   * it only transitions to `terminated` when the other side had already asked
   * (or an admin calls it). Reporting "đã huỷ ngang" for the first tap told
   * the user the collaboration had ended when nothing had happened yet.
   */
  terminateRequestSent:
    "Đã gửi đề nghị huỷ ngang — chờ bên còn lại đồng ý.",
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
        toast.success(message);
      }
      options.onSuccessSideEffect?.(engagement);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        toast.error(message);
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Request Completion Mutation (provider) ─────────────────────────────────

export interface RequestCompletionVariables {
  engagementId: number;
  /** Optional note (≤ 1000 chars per backend). Pass `""` when no note. */
  note?: string;
}

export interface UseRequestCompletionOptions {
  /** Override the success toast message. Set to `null` to silence the toast. */
  onSuccessMessage?: string | ((engagement: Engagement) => string) | null;
  /** Override the error toast message. Defaults to `resolveErrorMessage`. */
  onErrorMessage?: string | ((error: AppError) => string) | null;
  /** Optional callback fired after the response is normalised. */
  onSuccessSideEffect?: (engagement: Engagement) => void;
  /** Optional callback fired when the API returns a non-2xx. */
  onErrorSideEffect?: (error: AppError) => void;
}

/**
 * Provider taps "Báo hoàn thành".
 *
 * Endpoint: `POST /api/project-workings/{engagementId}/request-completion`.
 *
 * Invalidates every cache entry tied to this engagement:
 *   - the single engagement (`engagement(id)`)
 *   - the project detail (provider row reflects the new status)
 *   - the provider's `myProjects.list*` (the badge on My Projects
 *     flips from "accepted" → still accepted but now `isAwaitingAcceptance`)
 */
export function useRequestCompletionMutation(
  options: UseRequestCompletionOptions = {},
) {
  const queryClient = useQueryClient();

  return useMutation<
    Engagement,
    AppError,
    RequestCompletionVariables
  >({
    mutationFn: ({ engagementId, note }) =>
      requestCompletionApi(engagementId, { note }),

    onSuccess: (engagement) => {
      if (options.onSuccessMessage !== null) {
        const message =
          typeof options.onSuccessMessage === "function"
            ? options.onSuccessMessage(engagement)
            : options.onSuccessMessage ?? TOAST.requestCompletionSuccess;
        toast.success(message);
      }

      // Invalidate everything that could show this engagement.
      void queryClient.invalidateQueries({
        queryKey: ["engagements", "detail", engagement.id],
      });
      if (engagement.projectShopOwnerId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(
            String(engagement.projectShopOwnerId),
          ),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.myProjects.listAll(
          engagement.serviceProviderProfileId,
        ),
      });

      options.onSuccessSideEffect?.(engagement);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        toast.error(message);
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Complete Engagement Mutation (owner) ───────────────────────────────────

export interface CompleteEngagementVariables {
  engagementId: number;
}

export interface UseCompleteEngagementOptions {
  onSuccessMessage?: string | ((engagement: Engagement) => string) | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (engagement: Engagement) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

/**
 * Owner taps "Nghiệm thu".
 *
 * Endpoint: `POST /api/project-workings/{engagementId}/complete`.
 *
 * NOTE: the web product line currently focuses on provider actions per
 * `a.md` scope decisions — owner nghiệm thu lives on mobile. The hook
 * is still exported because the same hook is the right primitive for
 * the mobile bundle and for any future web entry point.
 */
export function useCompleteEngagementMutation(
  options: UseCompleteEngagementOptions = {},
) {
  const queryClient = useQueryClient();

  return useMutation<
    Engagement,
    AppError,
    CompleteEngagementVariables
  >({
    mutationFn: ({ engagementId }) => completeEngagementApi(engagementId),

    onSuccess: (engagement) => {
      if (options.onSuccessMessage !== null) {
        const message =
          typeof options.onSuccessMessage === "function"
            ? options.onSuccessMessage(engagement)
            : options.onSuccessMessage ?? TOAST.completeSuccess;
        toast.success(message);
      }

      void queryClient.invalidateQueries({
        queryKey: ["engagements", "detail", engagement.id],
      });
      if (engagement.projectShopOwnerId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(
            String(engagement.projectShopOwnerId),
          ),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.myProjects.listAll(
          engagement.serviceProviderProfileId,
        ),
      });

      options.onSuccessSideEffect?.(engagement);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        toast.error(message);
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Terminate Engagement Mutation (owner or provider) ──────────────────────

export interface TerminateEngagementVariables {
  engagementId: number;
}

export interface UseTerminateEngagementOptions {
  onSuccessMessage?: string | ((engagement: Engagement) => string) | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (engagement: Engagement) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

/**
 * Either side taps "Huỷ ngang hợp tác".
 *
 * Endpoint: `POST /api/project-workings/{engagementId}/terminate`.
 *
 * On web we currently surface this affordance for the engaged provider
 * only — owner terminate lives on mobile.
 */
export function useTerminateEngagementMutation(
  options: UseTerminateEngagementOptions = {},
) {
  const queryClient = useQueryClient();

  return useMutation<
    Engagement,
    AppError,
    TerminateEngagementVariables
  >({
    mutationFn: ({ engagementId }) => terminateEngagementApi(engagementId),

    onSuccess: (engagement) => {
      if (options.onSuccessMessage !== null) {
        // Read the result rather than assuming the tap ended the engagement —
        // see `TOAST.terminateRequestSent`. `status` is the authority;
        // `isAwaitingTerminationApproval` is the server's derived flag for the
        // in-between state.
        const didEnd = engagement.status === "terminated";
        const fallback = didEnd
          ? TOAST.terminateSuccess
          : TOAST.terminateRequestSent;
        const message =
          typeof options.onSuccessMessage === "function"
            ? options.onSuccessMessage(engagement)
            : options.onSuccessMessage ?? fallback;
        toast.success(message);
      }

      void queryClient.invalidateQueries({
        queryKey: ["engagements", "detail", engagement.id],
      });
      if (engagement.projectShopOwnerId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(
            String(engagement.projectShopOwnerId),
          ),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.myProjects.listAll(
          engagement.serviceProviderProfileId,
        ),
      });

      options.onSuccessSideEffect?.(engagement);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        toast.error(message);
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
