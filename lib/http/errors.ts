import axios, { AxiosError } from "axios";
import type { ApiErrorPayload } from "./types";

/**
 * Subset of RFC 7807 ProblemDetails the backend uses for validation /
 * auth errors. Recognized here so we can surface a useful message instead
 * of falling back to axios's generic "Request failed with status code 401".
 *
 * Example payload:
 *   {
 *     "title": "Unauthorized",
 *     "status": 401,
 *     "detail": "IDX10223: Lifetime validation failed. The token is expired.",
 *     "instance": "GET /api/project-posts"
 *   }
 */
interface ProblemDetailsPayload {
  title?: string;
  detail?: string;
  instance?: string;
}

export class AppError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly isNetworkError?: boolean;
  public readonly isTimeout?: boolean;
  public readonly isCanceled?: boolean;

  constructor(params: {
    message: string;
    status?: number;
    code?: string;
    details?: unknown;
    isNetworkError?: boolean;
    isTimeout?: boolean;
    isCanceled?: boolean;
  }) {
    super(params.message);
    this.name = "AppError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
    this.isNetworkError = params.isNetworkError;
    this.isTimeout = params.isTimeout;
    this.isCanceled = params.isCanceled;
  }
}

/**
 * Pick the most user-meaningful message from a heterogeneous error body.
 * Backend may return any of:
 *   1. `{ message }` — custom shape used by our login / register responses.
 *   2. RFC 7807 ProblemDetails — `{ title, detail, instance }` — used by
 *      ASP.NET Core for 401 / 400 / 404 by default.
 *   3. Validation errors — `{ errors: { field: ["msg1", ...] } }` —
 *      flattened into the message.
 *
 * Preference order: explicit `message` → `detail` (ProblemDetails) →
 * `title` → flattened `errors` → fallback (caller supplies).
 */
function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as ApiErrorPayload & ProblemDetailsPayload;

  if (typeof obj.message === "string" && obj.message.trim().length > 0) {
    return obj.message;
  }
  if (typeof obj.detail === "string" && obj.detail.trim().length > 0) {
    return obj.detail;
  }
  if (typeof obj.title === "string" && obj.title.trim().length > 0) {
    return obj.title;
  }
  if (obj.errors && typeof obj.errors === "object") {
    const flat = Object.entries(obj.errors)
      .flatMap(([field, messages]) => {
        if (Array.isArray(messages)) {
          return messages.map((m) => `${field}: ${m}`);
        }
        if (typeof messages === "string") return [`${field}: ${messages}`];
        return [];
      })
      .filter((line) => line.length > 0);
    if (flat.length > 0) return flat.join("; ");
  }
  return null;
}

export function normalizeAxiosError(error: unknown): AppError {
  if (!axios.isAxiosError<ApiErrorPayload | ProblemDetailsPayload>(error)) {
    return new AppError({ message: "Unexpected error", details: error });
  }

  const axiosError = error as AxiosError<
    ApiErrorPayload | ProblemDetailsPayload
  >;
  const status = axiosError.response?.status;
  const payload = axiosError.response?.data;
  const code = (payload as ApiErrorPayload | undefined)?.code ?? axiosError.code;
  const canceled = axiosError.code === "ERR_CANCELED";
  const timeout =
    axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT";
  const network = !axiosError.response && !!axiosError.request;

  const message =
    extractErrorMessage(payload) ?? axiosError.message ?? "Request failed";

  return new AppError({
    message,
    status,
    code,
    details: payload ?? null,
    isCanceled: canceled,
    isTimeout: timeout,
    isNetworkError: network,
  });
}