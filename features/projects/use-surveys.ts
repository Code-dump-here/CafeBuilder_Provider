"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import { notifySuccess, notifyError } from "@/lib/notify";
import {
  createSurveyApi,
  getSurveysApi,
  getSurveyApi,
  updateSurveyApi,
} from "./survey-api";
import type {
  CreateSurveyPayload,
  Survey,
  SurveyListResponse,
  UpdateSurveyPayload,
} from "./survey-types";

// ─── Toast messages ─────────────────────────────────────────────────────────

const TOAST = {
  success: "Khảo sát đã được lưu thành công.",
  updateSuccess: "Khảo sát đã được cập nhật.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy khảo sát.",
  validation: "Thông tin chưa hợp lệ.",
  generic: "Không thể lưu khảo sát. Vui lòng thử lại sau.",
} as const;

// ─── Create Survey Mutation ───────────────────────────────────────────────────

export interface CreateSurveyOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (survey: Survey) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useCreateSurveyMutation(options: CreateSurveyOptions = {}) {
  return useMutation<Survey, AppError, CreateSurveyPayload>({
    mutationFn: (payload) => createSurveyApi(payload),

    onSuccess: (survey) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.success;
        notifySuccess(message);
      }
      options.onSuccessSideEffect?.(survey);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        notifyError(message);
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Update Survey Mutation ───────────────────────────────────────────────────

export interface UpdateSurveyOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (survey: Survey) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useUpdateSurveyMutation(options: UpdateSurveyOptions = {}) {
  return useMutation<Survey, AppError, { surveyId: number; payload: UpdateSurveyPayload }>({
    mutationFn: ({ surveyId, payload }) => updateSurveyApi(surveyId, payload),

    onSuccess: (survey) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.updateSuccess;
        notifySuccess(message);
      }
      options.onSuccessSideEffect?.(survey);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        notifyError(message);
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Get Surveys Query ───────────────────────────────────────────────────────

export interface UseSurveysOptions {
  projectWorkingId: number | string;
  enabled?: boolean;
}

export interface UseSurveysResult {
  surveys: Survey[];
  latestSurvey: Survey | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useSurveys(options: UseSurveysOptions): UseSurveysResult {
  const { projectWorkingId, enabled = true } = options;

  const query = useQuery<SurveyListResponse, Error>({
    queryKey: ["surveys", { projectWorkingId }],
    queryFn: async ({ signal }) => {
      return getSurveysApi(Number(projectWorkingId), { signal });
    },
    enabled: enabled && Boolean(projectWorkingId),
    staleTime: 30 * 1000,
  });

  const surveys = query.data?.items ?? [];

  // Most recently filed survey. Ordered by createdAt rather than by version:
  // version is being retired, and once the API stops sending it every
  // comparison here would be NaN and the "latest" survey arbitrary.
  const latestSurvey = React.useMemo(() => {
    if (surveys.length === 0) return null;
    return [...surveys].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  }, [surveys]);

  return {
    surveys,
    latestSurvey,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Get Single Survey Query ─────────────────────────────────────────────────

export interface UseSurveyOptions {
  surveyId: number | string;
  enabled?: boolean;
}

export interface UseSurveyResult {
  survey: Survey | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useSurvey(options: UseSurveyOptions): UseSurveyResult {
  const { surveyId, enabled = true } = options;

  const query = useQuery<Survey, Error>({
    queryKey: ["surveys", "detail", { surveyId }],
    queryFn: async ({ signal }) => {
      return getSurveyApi(Number(surveyId), { signal });
    },
    enabled: enabled && Boolean(surveyId),
    staleTime: 30 * 1000,
  });

  return {
    survey: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
