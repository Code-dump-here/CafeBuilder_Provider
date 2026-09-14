import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  ConstructionItem,
  ConstructionItemListResponse,
  CreateConstructionItemPayload,
  UpdateConstructionItemPayload,
  ReorderConstructionItemsPayload,
  SetConstructionItemStatusPayload,
  ConstructionTask,
  ConstructionTaskListResponse,
  CreateConstructionTaskPayload,
  UpdateConstructionTaskPayload,
  SetConstructionTaskStatusPayload,
} from "./construction-types";
import type {
  ConstructionCostSummary,
  EngagementCostSummary,
} from "./cost-summary-types";

// ─── Construction Items (Milestones) ─────────────────────────────────────────

/**
 * Create a new construction item (milestone).
 *
 * Endpoint: `POST /api/construction-items`
 *
 * The engagement must be `accepted` with a `confirmed` contract of type
 * `construction` (or `both`). `estimateAt`, if provided, must not be in the
 * past. `parentId`, if provided, must point at a root milestone of the same
 * engagement.
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
 *
 * `parentId` accepts:
 *   • undefined — no filter is sent (server returns both roots and children).
 *   • null — filter to top-level milestones only.
 *   • a milestone id — filter to that milestone's children.
 *
 * NOTE: the BE only treats the literal `parentId=null` query value as
 * "roots only"; anything else (omitted or empty string) means "no filter".
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
    // Only `null` is encoded as the literal string "null" so the BE
    // distinguishes "roots only" from "no filter".
    params.set("parentId", options.parentId === null ? "null" : options.parentId);
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
 *
 * Status transitions go through `/status` (see `setConstructionItemStatusApi`).
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
 * Reorder a sibling group of construction items (milestones).
 *
 * Endpoint: `PUT /api/construction-items/reorder`
 *
 * The body must contain every id of the targeted group, in the wanted order.
 * The server rejects a partial list (400) and rejects any order that would
 * move completed milestones relative to each other (409). Send only the
 * non-completed ids; completed ones are implicitly pinned in their positions.
 */
export async function reorderConstructionItemsApi(
  payload: ReorderConstructionItemsPayload,
  config?: RequestConfig,
): Promise<ConstructionItem[]> {
  const response = await api.put<ConstructionItem[]>(
    "/api/construction-items/reorder",
    payload,
    config,
  );
  return response.data;
}

/**
 * Update construction item status.
 *
 * Endpoint: `PUT /api/construction-items/{id}/status`
 *
 * Transition `→ completed` requires every child task AND every child
 * milestone to already be `completed`; otherwise the server returns 409.
 * The error body lists the unfinished counts so the client can show them.
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
 *
 * The server may refuse (409) if children or material usages still point at
 * this milestone. The error body is the source of truth for the policy.
 */
export async function deleteConstructionItemApi(
  id: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/construction-items/${id}`, config);
}

/**
 * Cost summary for a single milestone — own + nested + material roll-ups.
 *
 * Endpoint: `GET /api/construction-items/{id}/cost-summary`
 *
 * `actual*` fields are `null` (not `0`) while any line still lacks
 * reconciled actuals — see `cost-summary-types.ts`.
 */
export async function getConstructionItemCostSummaryApi(
  itemId: string,
  config?: RequestConfig,
): Promise<ConstructionCostSummary> {
  const response = await api.get<ConstructionCostSummary>(
    `/api/construction-items/${itemId}/cost-summary`,
    config,
  );
  return response.data;
}

/**
 * Cost summary across an entire engagement — every root milestone + change
 * orders.
 *
 * Endpoint: `GET /api/construction-items/cost-summary?projectWorkingId=`
 *
 * `projectWorkingId` is required by the server.
 */
export async function getEngagementCostSummaryApi(
  projectWorkingId: string,
  config?: RequestConfig,
): Promise<EngagementCostSummary> {
  const params = new URLSearchParams();
  params.set("projectWorkingId", String(projectWorkingId));
  const response = await api.get<EngagementCostSummary>(
    `/api/construction-items/cost-summary?${params.toString()}`,
    config,
  );
  return response.data;
}

// ─── Construction Tasks ───────────────────────────────────────────────────────

/**
 * Create a new construction task.
 *
 * Endpoint: `POST /api/construction-tasks`
 *
 * The parent milestone must belong to the caller's engagement. `estimateAt`,
 * if provided, must not be in the past.
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
 * ⚠ When the caller wants "the tasks of ONE project", `projectWorkingId` is
 * required — the backend cannot scope by milestone alone because the same
 * provider may have other engagements; without it, the response crosses
 * engagement boundaries and the totals look wrong. The XML doc on the
 * server-side endpoint calls this out explicitly.
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
 *
 * Status transitions go through `/status`.
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
 *
 * Tasks are leaves — there is no "all children completed" gate to clear
 * before going to `completed`.
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
