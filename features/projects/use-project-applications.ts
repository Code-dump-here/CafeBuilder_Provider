"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { tokenStore } from "@/features/auth/token-store";
import { AppError } from "@/lib/http/errors";
import { projectActionToast } from "@/components/project-overview/project-action-toast";

import { useCurrentUser } from "@/features/auth/user-context";

import {
  applyToPostApi,
  getAppliesApi,
  updateApplyProposalApi,
  withdrawApplyApi,
} from "./project-application-api";
import type {
  ApplyToPostPayload,
  ApplyResponse,
  AppliesListResponse,
  ProjectApplication,
  UpdateApplyProposalPayload,
} from "./project-application-types";

// ─── Toast messages ─────────────────────────────────────────────────────────
//
// Kept in-module (not in i18n) because:
//   1. They are short user-facing strings — the i18n JSON would just
//      duplicate them with no extra structure.
//   2. `projectActionToast` only logs + screen-reader announces today;
//      when a real toast library (sonner / radix-toast) is wired in,
//      these constants move to i18n keys in one PR.
//   3. The pattern matches how `version-list-table.tsx` already passes
//      raw strings into `projectActionToast`.

const TOAST = {
  success: "Đã gửi hồ sơ ứng tuyển. Chủ dự án sẽ phản hồi sớm.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Tài khoản của bạn không có quyền ứng tuyển dự án này.",
  notFound: "Bài đăng không tồn tại hoặc đã đóng.",
  conflict: "Bạn đã ứng tuyển bài đăng này trước đó.",
  validation: "Thông tin ứng tuyển chưa hợp lệ.",
  generic: "Không thể gửi hồ sơ. Vui lòng thử lại sau.",
} as const;

/**
 * Revise / withdraw share the shape of the apply toasts but not the copy —
 * "Bạn đã ứng tuyển bài đăng này trước đó" makes no sense as the answer to
 * a withdraw request. The 404/409 cases are the interesting ones: both mean
 * the application moved on while the UI was showing a stale snapshot.
 */
const UPDATE_TOAST = {
  success: "Đã cập nhật hồ sơ ứng tuyển.",
  notFound: "Hồ sơ không còn tồn tại — có thể bạn đã rút trước đó.",
  conflict: "Chủ dự án đã phản hồi hồ sơ này, không sửa được nữa.",
  generic: "Không thể cập nhật hồ sơ. Vui lòng thử lại sau.",
} as const;

const WITHDRAW_TOAST = {
  success: "Đã rút hồ sơ ứng tuyển.",
  conflict: "Chủ dự án đã phản hồi hồ sơ này, không rút được nữa.",
  generic: "Không thể rút hồ sơ. Vui lòng thử lại sau.",
} as const;

export interface ApplyToPostMutationOptions {
  /**
   * Override the success toast. Pass a string to use it verbatim, or a
   * function to derive the message from the returned application.
   * `null` suppresses the toast entirely (the call site will render its
   * own success UI, e.g. an inline state change in an apply dialog).
   */
  onSuccessMessage?: string | ((application: ProjectApplication) => string) | null;
  /**
   * Override the error toast. Pass a string to use it verbatim, or a
   * function to derive the message from the `AppError`. `null` suppresses
   * the toast (call site renders its own error UI).
   */
  onErrorMessage?: string | ((error: AppError) => string) | null;
  /**
   * Extra side-effects to run on success — e.g. close a dialog, navigate,
   * reset a form. Runs AFTER the cache invalidation and AFTER the toast.
   */
  onSuccessSideEffect?: (application: ProjectApplication) => void;
  /** Same idea for the error path. */
  onErrorSideEffect?: (error: AppError) => void;
}

/**
 * React Query mutation hook for `POST /api/applies/apply`.
 *
 * Always toasts a success/failure message via `projectActionToast` (the
 * project-wide toast placeholder). Callers can:
 *   - Override or suppress the message via `options.onSuccessMessage` /
 *     `options.onErrorMessage`.
 *   - Layer extra side-effects (close dialog, navigate, etc.) via
 *     `options.onSuccessSideEffect` / `options.onErrorSideEffect`.
 *
 * The axios interceptor attaches the Bearer access token automatically,
 * so callers don't need to pass anything auth-related.
 */
export function useApplyToPostMutation(options: ApplyToPostMutationOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<ProjectApplication, AppError, ApplyToPostPayload>({
    mutationFn: (payload) => applyToPostApi(payload),

    onSuccess: (application) => {
      // Invalidate the marketplace list so any "applied" badge / count
      // refetches. The list endpoint itself doesn't change, but derived
      // selectors that depend on `hasApplied(postId)` will be stale.
      void queryClient.invalidateQueries({
        queryKey: ["marketplace"],
        exact: false,
      });
      void queryClient.invalidateQueries({
        queryKey: ["marketplace", "post", application.postId],
        exact: false,
      });

      // Refresh the current provider's applies list so anything that
      // derives `hasAppliedToPost` (e.g. the "Apply" CTA on the project
      // overview card) flips into the "Application submitted" state
      // without requiring a full page reload.
      void queryClient.invalidateQueries({
        queryKey: ["applies"],
        exact: false,
      });

      // Toast — configurable per call site.
      if (options.onSuccessMessage !== null) {
        const message =
          typeof options.onSuccessMessage === "function"
            ? options.onSuccessMessage(application)
            : options.onSuccessMessage ?? TOAST.success;
        projectActionToast(message);
      }

      options.onSuccessSideEffect?.(application);
    },

    onError: (error) => {
      // Translate the typed `AppError` into a user-facing toast. Prefer
      // status-specific copy when the backend gave us one; fall back to
      // the server's `message` field if it's meaningful, else generic.
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        projectActionToast(message);
      }

      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Revise / withdraw ──────────────────────────────────────────────────────

export interface UpdateApplyProposalVariables {
  applyId: string;
  payload: UpdateApplyProposalPayload;
}

export interface ApplyMutationOptions<TResult> {
  /** Pass `null` to suppress the toast and render your own feedback. */
  onSuccessMessage?: string | ((result: TResult) => string) | null;
  /** Pass `null` to suppress the toast and render your own error UI. */
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (result: TResult) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

/**
 * Everything that can display an application is keyed under `["applies"]`
 * (the provider list) or `["marketplace"]` (post cards showing an
 * "applied" badge). Both go stale the moment an application is revised or
 * withdrawn, so the two mutations below invalidate the same pair.
 */
function invalidateApplyCaches(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["applies"], exact: false });
  void queryClient.invalidateQueries({
    queryKey: ["marketplace"],
    exact: false,
  });
}

/**
 * React Query mutation for `PUT /api/applies/{id}/proposal`.
 *
 * Only valid while the application is `pending` — the server returns 409
 * once the owner has answered, which `resolveUpdateErrorMessage` turns
 * into a "chủ dự án đã phản hồi" toast rather than a generic failure.
 */
export function useUpdateApplyProposalMutation(
  options: ApplyMutationOptions<ApplyResponse> = {},
) {
  const queryClient = useQueryClient();

  return useMutation<ApplyResponse, AppError, UpdateApplyProposalVariables>({
    mutationFn: ({ applyId, payload }) =>
      updateApplyProposalApi(applyId, payload),

    onSuccess: (application) => {
      invalidateApplyCaches(queryClient);

      if (options.onSuccessMessage !== null) {
        const message =
          typeof options.onSuccessMessage === "function"
            ? options.onSuccessMessage(application)
            : options.onSuccessMessage ?? UPDATE_TOAST.success;
        projectActionToast(message);
      }

      options.onSuccessSideEffect?.(application);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveUpdateErrorMessage(error);
        projectActionToast(message);
      }

      options.onErrorSideEffect?.(error);
    },
  });
}

/**
 * React Query mutation for `DELETE /api/applies/{id}/withdraw`.
 *
 * The endpoint hard-deletes the row, so there is no updated record to read
 * back — success is signalled by the invalidation alone, after which the
 * application simply stops appearing in the provider's list.
 *
 * A 404 is treated as success: the row is gone, which is exactly what the
 * user asked for (they likely withdrew it in another tab).
 */
export function useWithdrawApplyMutation(
  // The mutation resolves to the withdrawn application's id, which is a uuid.
  options: ApplyMutationOptions<string> = {},
) {
  const queryClient = useQueryClient();

  return useMutation<string, AppError, string>({
    mutationFn: async (applyId) => {
      try {
        await withdrawApplyApi(applyId);
      } catch (error) {
        if (error instanceof AppError && error.status === 404) {
          return applyId;
        }
        throw error;
      }
      return applyId;
    },

    onSuccess: (applyId) => {
      invalidateApplyCaches(queryClient);

      if (options.onSuccessMessage !== null) {
        const message =
          typeof options.onSuccessMessage === "function"
            ? options.onSuccessMessage(applyId)
            : options.onSuccessMessage ?? WITHDRAW_TOAST.success;
        projectActionToast(message);
      }

      options.onSuccessSideEffect?.(applyId);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveWithdrawErrorMessage(error);
        projectActionToast(message);
      }

      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Map an `AppError` to the most informative Vietnamese toast string.
 *
 * Preference order:
 *   1. Network / timeout — these are infrastructure-level; the user
 *      should retry regardless of what the server would have said.
 *   2. Status-specific copy — backend gives the strongest signal here.
 *   3. Server's own message — covers anything we forgot to enumerate.
 *   4. Generic fallback.
 */
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
    case 409:
      // 409 isn't only "you already applied" — a capability mismatch or a
      // slot that filled up between browse and submit hits this same
      // status. The backend's own message names the real reason; falling
      // back to a generic "already applied" here previously made those
      // failures look like a harmless duplicate instead of the actual
      // problem.
      return preferServerMessage(error, TOAST.conflict);
    default:
      // Use the server's own message when it looks meaningful (non-empty,
      // not axios's boilerplate "Request failed with status code XXX").
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

/** Same preference order as `resolveErrorMessage`, revise-specific copy. */
function resolveUpdateErrorMessage(error: AppError): string {
  if (error.isNetworkError) return TOAST.network;
  if (error.isTimeout) return TOAST.timeout;

  switch (error.status) {
    case 400:
      return TOAST.validation;
    case 401:
      return TOAST.unauthorized;
    case 404:
      return UPDATE_TOAST.notFound;
    case 409:
      return preferServerMessage(error, UPDATE_TOAST.conflict);
    default:
      return preferServerMessage(error, UPDATE_TOAST.generic);
  }
}

/** Same preference order as `resolveErrorMessage`, withdraw-specific copy. */
function resolveWithdrawErrorMessage(error: AppError): string {
  if (error.isNetworkError) return TOAST.network;
  if (error.isTimeout) return TOAST.timeout;

  switch (error.status) {
    case 401:
      return TOAST.unauthorized;
    case 409:
      return preferServerMessage(error, WITHDRAW_TOAST.conflict);
    default:
      return preferServerMessage(error, WITHDRAW_TOAST.generic);
  }
}

/**
 * Use the server's own message when it looks meaningful — non-empty and not
 * axios's boilerplate "Request failed with status code XXX". The backend
 * writes actionable Vietnamese for most 4xx cases, so it beats our fallback.
 */
function preferServerMessage(error: AppError, fallback: string): string {
  if (
    error.message &&
    error.message.trim().length > 0 &&
    !/^Request failed/i.test(error.message)
  ) {
    return error.message;
  }
  return fallback;
}

// ─── Query hooks ─────────────────────────────────────────────────────────────

export interface UseProviderAppliesOptions {
  /** Filter by project (projectShopOwnerId) */
  projectShopOwnerId?: string;
  /** Filter by post */
  postId?: string;
  /** Filter by status */
  status?: string;
  /** Page size - default to 50 to get all applies in most cases */
  pageSize?: number;
  /** Enable the query - default true when provider has token */
  enabled?: boolean;
}

export interface UseProviderAppliesResult {
  /** All applies matching the filters */
  applies: ApplyResponse[];
  /** Find if provider has applied to a specific post */
  hasAppliedToPost: (targetPostId: string) => boolean;
  /** Get the apply for a specific post */
  getApplyForPost: (targetPostId: string) => ApplyResponse | undefined;
  /**
   * The provider's own application on a project, whichever post it went to.
   * For callers that hold a project id rather than a post id — the survey
   * page, which needs the application a bidding-stage survey hangs off.
   */
  getApplyForProject: (targetProjectId: string) => ApplyResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * Fetch applies for the current provider, filtered by project and/or post.
 *
 * This hook checks if the user has a token (is logged in as provider)
 * and only enables the query when they are.
 *
 * Query: `GET /api/applies` with `serviceProviderProfileId` from the
 * authenticated user's account data.
 */
export function useProviderApplies(
  options: UseProviderAppliesOptions = {},
): UseProviderAppliesResult {
  const hasToken = tokenStore.hasAccessToken();
  const { account } = useCurrentUser();

  // `GET /api/applies` filters on the `serviceProviderProfileId` QUERY
  // PARAM — `ApplyService.GetAllAsync` never looks at the JWT. Omitting it
  // returns *every provider's* applications, which made `hasAppliedToPost`
  // fire on strangers' bids and would have offered this user a Withdraw
  // button for an application that isn't theirs.
  const serviceProviderProfileId =
    account?.role === "provider" ? account.serviceProvider?.id ?? null : null;

  const {
    projectShopOwnerId,
    postId,
    status,
    pageSize = 50,
    // Without a profile id the request can't be scoped, so don't make it.
    enabled = hasToken && serviceProviderProfileId != null,
  } = options;

  const query = useQuery<AppliesListResponse, Error>({
    queryKey: [
      "applies",
      "provider",
      {
        serviceProviderProfileId,
        projectShopOwnerId,
        postId,
        status,
        pageSize,
      },
    ],
    queryFn: async ({ signal }) => {
      return getAppliesApi(
        {
          serviceProviderProfileId: serviceProviderProfileId ?? undefined,
          projectShopOwnerId:
            projectShopOwnerId !== undefined
              ? projectShopOwnerId
              : undefined,
          postId:
            postId !== undefined ? postId : undefined,
          status,
          pageSize,
        },
        { signal },
      );
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds - applies don't change frequently
  });

  const applies = query.data?.items ?? [];

  const hasAppliedToPost = React.useCallback(
    (targetPostId: string): boolean => {
      return applies.some((apply) => apply.postId === targetPostId);
    },
    [applies],
  );

  const getApplyForPost = React.useCallback(
    (targetPostId: string): ApplyResponse | undefined => {
      return applies.find((apply) => apply.postId === targetPostId);
    },
    [applies],
  );

  // `GET /api/applies` has no project filter (the `projectShopOwnerId` param
  // above is ignored by the controller), so the match happens here against the
  // id the response carries. Prefer a live application: a project can hold an
  // older rejected bid alongside the current pending one.
  const getApplyForProject = React.useCallback(
    (targetProjectId: string): ApplyResponse | undefined => {
      const mine = applies.filter((a) => a.projectShopOwnerId === targetProjectId);
      return mine.find((a) => a.status === "pending") ?? mine[0];
    },
    [applies],
  );

  return {
    applies,
    hasAppliedToPost,
    getApplyForPost,
    getApplyForProject,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
