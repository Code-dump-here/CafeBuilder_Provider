import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  AttachChecklistEvidencePayload,
  CheckChecklistItemPayload,
  ChecklistItem,
  ChecklistItemListResponse,
  ChecklistStatus,
  CreateChecklistItemsPayload,
  UpdateChecklistItemPayload,
} from "./checklist-types";

/**
 * Checklist for one design or one milestone.
 *
 * Endpoint: `GET /api/checklist-items?designId=|constructionItemId=&status=`
 *
 * Page size defaults to 50: a checklist is read as a whole to judge whether
 * sign-off can proceed, and a second page would hide items that are actively
 * blocking it.
 */
export async function getChecklistItemsApi(
  target: { designId?: string; constructionItemId?: string },
  options?: { status?: ChecklistStatus; pageNumber?: number; pageSize?: number },
  config?: RequestConfig,
): Promise<ChecklistItemListResponse> {
  const params = new URLSearchParams();
  if (target.designId) params.set("designId", target.designId);
  if (target.constructionItemId) {
    params.set("constructionItemId", target.constructionItemId);
  }
  if (options?.status) params.set("status", options.status);
  params.set("pageSize", String(options?.pageSize ?? 50));
  if (options?.pageNumber) params.set("pageNumber", String(options.pageNumber));

  const response = await api.get<ChecklistItemListResponse>(
    `/api/checklist-items?${params.toString()}`,
    config,
  );
  return response.data;
}

/**
 * Add checklist lines. Provider only.
 *
 * Endpoint: `POST /api/checklist-items`
 */
export async function createChecklistItemsApi(
  payload: CreateChecklistItemsPayload,
  config?: RequestConfig,
): Promise<ChecklistItem[]> {
  const response = await api.post<ChecklistItem[]>(
    "/api/checklist-items",
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `PUT /api/checklist-items/{id}` */
export async function updateChecklistItemApi(
  id: string,
  payload: UpdateChecklistItemPayload,
  config?: RequestConfig,
): Promise<ChecklistItem> {
  const response = await api.put<ChecklistItem>(
    `/api/checklist-items/${id}`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Owner marks an item passed or failed. Re-gradeable: a failed item becomes
 * passed once the provider has fixed it.
 *
 * Endpoint: `POST /api/checklist-items/{id}/check`
 */
export async function checkChecklistItemApi(
  id: string,
  payload: CheckChecklistItemPayload,
  config?: RequestConfig,
): Promise<ChecklistItem> {
  const response = await api.post<ChecklistItem>(
    `/api/checklist-items/${id}/check`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Provider attaches evidence without grading.
 *
 * Endpoint: `POST /api/checklist-items/{id}/evidence`
 */
export async function attachChecklistEvidenceApi(
  id: string,
  payload: AttachChecklistEvidencePayload,
  config?: RequestConfig,
): Promise<ChecklistItem> {
  const response = await api.post<ChecklistItem>(
    `/api/checklist-items/${id}/evidence`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `DELETE /api/checklist-items/{id}` */
export async function deleteChecklistItemApi(
  id: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/checklist-items/${id}`, config);
}
