import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  Issue,
  IssueListResponse,
  CreateIssuePayload,
  UpdateIssuePayload,
  SetIssueStatusPayload,
  IssueType,
  CreateIssueTypePayload,
} from "./issue-types";

// ─── Issues ──────────────────────────────────────────────────────────────────

/**
 * Create a new issue.
 *
 * Endpoint: `POST /api/issues`
 */
export async function createIssueApi(
  payload: CreateIssuePayload,
  config?: RequestConfig,
): Promise<Issue> {
  const response = await api.post<Issue>("/api/issues", payload, config);
  return response.data;
}

/**
 * Get issues with optional filters.
 *
 * Endpoint: `GET /api/issues?projectWorkingId=&constructionItemId=&status=`
 */
export async function getIssuesApi(
  options?: {
    projectWorkingId?: string;
    constructionItemId?: string;
    status?: string;
    pageNumber?: number;
    pageSize?: number;
  },
  config?: RequestConfig,
): Promise<IssueListResponse> {
  const params = new URLSearchParams();
  if (options?.projectWorkingId) {
    params.set("projectWorkingId", String(options.projectWorkingId));
  }
  if (options?.constructionItemId) {
    params.set("constructionItemId", String(options.constructionItemId));
  }
  if (options?.status) {
    params.set("status", options.status);
  }
  if (options?.pageNumber) {
    params.set("pageNumber", String(options.pageNumber));
  }
  if (options?.pageSize) {
    params.set("pageSize", String(options.pageSize));
  }

  const response = await api.get<IssueListResponse>(
    `/api/issues?${params.toString()}`,
    config,
  );
  return response.data;
}

/**
 * Get a single issue by ID.
 *
 * Endpoint: `GET /api/issues/{id}`
 */
export async function getIssueApi(
  id: string,
  config?: RequestConfig,
): Promise<Issue> {
  const response = await api.get<Issue>(`/api/issues/${id}`, config);
  return response.data;
}

/**
 * Update an issue.
 *
 * Endpoint: `PUT /api/issues/{id}`
 */
export async function updateIssueApi(
  id: string,
  payload: UpdateIssuePayload,
  config?: RequestConfig,
): Promise<Issue> {
  const response = await api.put<Issue>(`/api/issues/${id}`, payload, config);
  return response.data;
}

/**
 * Update issue status.
 *
 * Endpoint: `PUT /api/issues/{id}/status`
 */
export async function setIssueStatusApi(
  id: string,
  payload: SetIssueStatusPayload,
  config?: RequestConfig,
): Promise<Issue> {
  const response = await api.put<Issue>(
    `/api/issues/${id}/status`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Delete an issue.
 *
 * Endpoint: `DELETE /api/issues/{id}`
 */
export async function deleteIssueApi(
  id: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/issues/${id}`, config);
}

// ─── Issue Types (catalog) ───────────────────────────────────────────────────

/**
 * Get the issue-type catalog (no paging per spec).
 *
 * Endpoint: `GET /api/issue-types`
 */
export async function getIssueTypesApi(
  config?: RequestConfig,
): Promise<IssueType[]> {
  const response = await api.get<IssueType[]>("/api/issue-types", config);
  return response.data;
}

/**
 * Get a single issue type by ID.
 *
 * Endpoint: `GET /api/issue-types/{id}`
 */
export async function getIssueTypeApi(
  id: string,
  config?: RequestConfig,
): Promise<IssueType> {
  const response = await api.get<IssueType>(`/api/issue-types/${id}`, config);
  return response.data;
}

/**
 * Create an issue type (admin only).
 *
 * Endpoint: `POST /api/issue-types`
 */
export async function createIssueTypeApi(
  payload: CreateIssueTypePayload,
  config?: RequestConfig,
): Promise<IssueType> {
  const response = await api.post<IssueType>(
    "/api/issue-types",
    payload,
    config,
  );
  return response.data;
}

/**
 * Update an issue type (admin only).
 *
 * Endpoint: `PUT /api/issue-types/{id}`
 */
export async function updateIssueTypeApi(
  id: string,
  payload: { name: string },
  config?: RequestConfig,
): Promise<IssueType> {
  const response = await api.put<IssueType>(
    `/api/issue-types/${id}`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Delete an issue type (admin only).
 *
 * Endpoint: `DELETE /api/issue-types/{id}`
 */
export async function deleteIssueTypeApi(
  id: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/issue-types/${id}`, config);
}
