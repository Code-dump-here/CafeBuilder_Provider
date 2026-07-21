"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { tokenStore } from "@/lib/auth/token-store";
import { AppError } from "@/lib/http/errors";
import { projectActionToast } from "@/components/project-overview/project-action-toast";

import { applyToPostApi, getAppliesApi } from "./project-application-api";
import type {
  ApplyToPostPayload,
  ApplyResponse,
  AppliesListResponse,
  ProjectApplication,
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
      return TOAST.conflict;
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

// ─── Query hooks ─────────────────────────────────────────────────────────────

export interface UseProviderAppliesOptions {
  /** Filter by project (projectShopOwnerId) */
  projectShopOwnerId?: number | string;
  /** Filter by post */
  postId?: number | string;
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
  hasAppliedToPost: (targetPostId: number) => boolean;
  /** Get the apply for a specific post */
  getApplyForPost: (targetPostId: number) => ApplyResponse | undefined;
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

  const {
    projectShopOwnerId,
    postId,
    status,
    pageSize = 50,
    enabled = hasToken,
  } = options;

  const query = useQuery<AppliesListResponse, Error>({
    queryKey: [
      "applies",
      "provider",
      {
        projectShopOwnerId,
        postId,
        status,
        pageSize,
      },
    ],
    queryFn: async ({ signal }) => {
      // serviceProviderProfileId will be resolved by the API based on JWT
      // We just need to filter by what we need
      return getAppliesApi(
        {
          projectShopOwnerId:
            projectShopOwnerId !== undefined
              ? Number(projectShopOwnerId)
              : undefined,
          postId:
            postId !== undefined ? Number(postId) : undefined,
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
    (targetPostId: number): boolean => {
      return applies.some((apply) => apply.postId === targetPostId);
    },
    [applies],
  );

  const getApplyForPost = React.useCallback(
    (targetPostId: number): ApplyResponse | undefined => {
      return applies.find((apply) => apply.postId === targetPostId);
    },
    [applies],
  );

  return {
    applies,
    hasAppliedToPost,
    getApplyForPost,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}