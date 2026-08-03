"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import { AppError } from "@/lib/http/errors";
import { queryKeys } from "@/lib/react-query/keys";

import {
  cancelProjectApi,
  completeProjectApi,
} from "./project-detail-api";
import type { ProjectDetail } from "./project-detail-types";

// ─── Toast messages ──────────────────────────────────────────────────────────

const TOAST = {
  completeSuccess: "Đã đóng dự án — cảm ơn bạn đã hoàn tất.",
  cancelSuccess: "Đã huỷ dự án. Các hợp tác & bài đăng cũng đã được đóng.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy dự án.",
  validation: "Thông tin chưa hợp lệ.",
  generic: "Không thể cập nhật dự án. Vui lòng thử lại sau.",
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

// ─── Close / Cancel project mutations ───────────────────────────────────────

export interface CloseProjectVariables {
  projectId: string | number;
}

export interface UseCloseProjectOptions {
  onSuccessMessage?: string | ((project: ProjectDetail) => string) | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (project: ProjectDetail) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

/**
 * Owner closes a project (`a.md` §4.5).
 *
 * Endpoint: `POST /api/project-shop-owners/{projectId}/complete`.
 *
 * On success the project cache entry is replaced with the latest payload
 * (status → `completed`, open posts cascaded to `closed`) and any cached
 * provider `myProjects.list*` entries are dropped so the next visit to
 * `/my-projects` shows the correct status flips.
 */
export function useCompleteProjectMutation(
  options: UseCloseProjectOptions = {},
) {
  const queryClient = useQueryClient();

  return useMutation<
    ProjectDetail,
    AppError,
    CloseProjectVariables
  >({
    mutationFn: ({ projectId }) => completeProjectApi(projectId),

    onSuccess: (project) => {
      if (options.onSuccessMessage !== null) {
        const message =
          typeof options.onSuccessMessage === "function"
            ? options.onSuccessMessage(project)
            : options.onSuccessMessage ?? TOAST.completeSuccess;
        toast.success(message);
      }

      // Refresh the project page itself + any list pages that may be
      // caching this id (admin project lists, marketplace, etc.).
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(String(project.id)),
      });
      // Broader sweep — any other listing that uses the project detail.
      void queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      // Provider MyProjects pages for everyone currently engaged on
      // this project will see a status change once they refetch.
      void queryClient.invalidateQueries({
        queryKey: ["myProjects"],
      });

      options.onSuccessSideEffect?.(project);
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

/**
 * Owner cancels a project (`a.md` §4.6).
 *
 * Endpoint: `POST /api/project-shop-owners/{projectId}/cancel`.
 *
 * On success:
 *   - `projects.detail` invalidated (status → `cancelled`).
 *   - `myProjects.list*` invalidated so providers whose engagements were
 *     cascade-`terminated` see the new state.
 *   - open post caches invalidated (open posts → closed).
 */
export function useCancelProjectMutation(
  options: UseCloseProjectOptions = {},
) {
  const queryClient = useQueryClient();

  return useMutation<
    ProjectDetail,
    AppError,
    CloseProjectVariables
  >({
    mutationFn: ({ projectId }) => cancelProjectApi(projectId),

    onSuccess: (project) => {
      if (options.onSuccessMessage !== null) {
        const message =
          typeof options.onSuccessMessage === "function"
            ? options.onSuccessMessage(project)
            : options.onSuccessMessage ?? TOAST.cancelSuccess;
        toast.success(message);
      }

      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(String(project.id)),
      });
      void queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["myProjects"],
      });

      options.onSuccessSideEffect?.(project);
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
