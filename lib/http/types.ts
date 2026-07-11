import type { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

export type ApiSuccessResponse<T> = {
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
};

export type ApiErrorPayload = {
  message?: string;
  code?: string;
  errors?: Record<string, string[] | string>;
  statusCode?: number;
};

export type RetryableAxiosRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuth?: boolean;
  skipRefresh?: boolean;
  requestId?: string;
};

export type RequestConfig = AxiosRequestConfig & {
  skipAuth?: boolean;
  skipRefresh?: boolean;
};
