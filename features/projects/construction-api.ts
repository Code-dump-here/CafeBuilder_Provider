import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  ConstructionItem,
  ConstructionItemListResponse,
  CreateConstructionItemPayload,
  UpdateConstructionItemPayload,
  SetConstructionItemStatusPayload,
  ConstructionTask,
  ConstructionTaskListResponse,
  CreateConstructionTaskPayload,
  UpdateConstructionTaskPayload,
  SetConstructionTaskStatusPayload,
} from "./construction-types";

// ─── Construction Items (Milestones) ─────────────────────────────────────────

/**
 * Create a new construction item (milestone).
 *
 * Endpoint: `POST /api/construction-items`
 */
export async function createConstructionItemApi(
  payload: CreateConstructionItemPayload,
  config?: RequestConfig,
): Promise<ConstructionItem> {
  const response = await api.post<ConstructionItem>(
    "/api/construction-items",
    payload,
    config,
  );
  return response.data;
}

/**
 * Get construction items (milestones) for a project engagement.
 *
 * Endpoint: `GET /api/construction-items?projectWorkingId=&parentId=&status=`
 */
export async function getConstructionItemsApi(
  projectWorkingId: string,
  options?: {
    parentId?: string | null;
    status?: string;
    pageNumber?: number;
    pageSize?: number;
  },
  config?: RequestConfig,
): Promise<ConstructionItemListResponse> {
  const params = new URLSearchParams();
  params.set("projectWorkingId", String(projectWorkingId));
  if (options?.parentId !== undefined) {
    // Only include parentId if explicitly provided
    params.set("parentId", String(options.parentId ?? ""));
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

  const response = await api.get<ConstructionItemListResponse>(
    `/api/construction-items?${params.toString()}`,
    config,
  );
  return response.data;
}

/**
 * Get a single construction item by ID.
 *
 * Endpoint: `GET /api/construction-items/{id}`
 */
export async function getConstructionItemApi(
  id: string,
  config?: RequestConfig,
): Promise<ConstructionItem> {
  const response = await api.get<ConstructionItem>(
    `/api/construction-items/${id}`,
    config,
  );
  return response.data;
}

/**
 * Update a construction item.
 *
 * Endpoint: `PUT /api/construction-items/{id}`
 */
export async function updateConstructionItemApi(
  id: string,
  payload: UpdateConstructionItemPayload,
  config?: RequestConfig,
): Promise<ConstructionItem> {
  const response = await api.put<ConstructionItem>(
    `/api/construction-items/${id}`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Update construction item status.
 *
 * Endpoint: `PUT /api/construction-items/{id}/status`
 */
export async function setConstructionItemStatusApi(
  id: string,
  payload: SetConstructionItemStatusPayload,
  config?: RequestConfig,
): Promise<ConstructionItem> {
  const response = await api.put<ConstructionItem>(
    `/api/construction-items/${id}/status`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Delete a construction item.
 *
 * Endpoint: `DELETE /api/construction-items/{id}`
 */
export async function deleteConstructionItemApi(
  id: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/construction-items/${id}`, config);
}

// ─── Construction Tasks ───────────────────────────────────────────────────────

/**
 * Create a new construction task.
 *
 * Endpoint: `POST /api/construction-tasks`
 */
export async function createConstructionTaskApi(
  payload: CreateConstructionTaskPayload,
  config?: RequestConfig,
): Promise<ConstructionTask> {
  const response = await api.post<ConstructionTask>(
    "/api/construction-tasks",
    payload,
    config,
  );
  return response.data;
}

/**
 * Get construction tasks.
 *
 * Endpoint: `GET /api/construction-tasks?constructionItemId=&projectWorkingId=&status=`
 *
 * A task carries no engagement id of its own — the backend reaches it
 * through the parent milestone — so `projectWorkingId` is the only way to
 * ask for "this project's tasks". Without it the server's only filter is
 * visibility, i.e. every task on every engagement the caller can see.
 */
export async function getConstructionTasksApi(
  options?: {
    constructionItemId?: string;
    projectWorkingId?: string;
    status?: string;
    pageNumber?: number;
    pageSize?: number;
  },
  config?: RequestConfig,
): Promise<ConstructionTaskListResponse> {
  const params = new URLSearchParams();
  if (options?.constructionItemId) {
    params.set("constructionItemId", String(options.constructionItemId));
  }
  if (options?.projectWorkingId) {
    params.set("projectWorkingId", String(options.projectWorkingId));
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

  const response = await api.get<ConstructionTaskListResponse>(
    `/api/construction-tasks?${params.toString()}`,
    config,
  );
  return response.data;
}

/**
 * Get a single construction task by ID.
 *
 * Endpoint: `GET /api/construction-tasks/{id}`
 */
export async function getConstructionTaskApi(
  id: string,
  config?: RequestConfig,
): Promise<ConstructionTask> {
  const response = await api.get<ConstructionTask>(
    `/api/construction-tasks/${id}`,
    config,
  );
  return response.data;
}

/**
 * Update a construction task.
 *
 * Endpoint: `PUT /api/construction-tasks/{id}`
 */
export async function updateConstructionTaskApi(
  id: string,
  payload: UpdateConstructionTaskPayload,
  config?: RequestConfig,
): Promise<ConstructionTask> {
  const response = await api.put<ConstructionTask>(
    `/api/construction-tasks/${id}`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Update construction task status.
 *
 * Endpoint: `PUT /api/construction-tasks/{id}/status`
 */
export async function setConstructionTaskStatusApi(
  id: string,
  payload: SetConstructionTaskStatusPayload,
  config?: RequestConfig,
): Promise<ConstructionTask> {
  const response = await api.put<ConstructionTask>(
    `/api/construction-tasks/${id}/status`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Delete a construction task.
 *
 * Endpoint: `DELETE /api/construction-tasks/{id}`
 */
export async function deleteConstructionTaskApi(
  id: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/construction-tasks/${id}`, config);
}
