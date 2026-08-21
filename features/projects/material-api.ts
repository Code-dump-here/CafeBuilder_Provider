import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  ConstructionMaterial,
  CreateConstructionMaterialPayload,
  CreateMaterialPayload,
  Material,
  MaterialCostSummary,
  MaterialListResponse,
  UpdateConstructionMaterialPayload,
  UpdateMaterialPayload,
} from "./material-types";

// ─── Price list ──────────────────────────────────────────────────────────────

/**
 * Materials published for an engagement.
 *
 * Endpoint: `GET /api/materials?projectWorkingId=&pageNumber=&pageSize=`
 *
 * The default page size is 50 rather than the API's 10: a price list is read
 * as a whole (you pick a row out of it), so paging it hides options behind an
 * interaction nobody expects on a lookup table.
 */
export async function getMaterialsApi(
  projectWorkingId: string,
  options?: { pageNumber?: number; pageSize?: number },
  config?: RequestConfig,
): Promise<MaterialListResponse> {
  const params = new URLSearchParams();
  params.set("projectWorkingId", projectWorkingId);
  params.set("pageSize", String(options?.pageSize ?? 50));
  if (options?.pageNumber) params.set("pageNumber", String(options.pageNumber));

  const response = await api.get<MaterialListResponse>(
    `/api/materials?${params.toString()}`,
    config,
  );
  return response.data;
}

/** Endpoint: `POST /api/materials` */
export async function createMaterialApi(
  payload: CreateMaterialPayload,
  config?: RequestConfig,
): Promise<Material> {
  const response = await api.post<Material>("/api/materials", payload, config);
  return response.data;
}

/** Endpoint: `PUT /api/materials/{id}` */
export async function updateMaterialApi(
  id: string,
  payload: UpdateMaterialPayload,
  config?: RequestConfig,
): Promise<Material> {
  const response = await api.put<Material>(`/api/materials/${id}`, payload, config);
  return response.data;
}

/**
 * Endpoint: `DELETE /api/materials/{id}`
 *
 * Refused with 409 while any milestone or task still references the material.
 */
export async function deleteMaterialApi(
  id: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/materials/${id}`, config);
}

// ─── Usage ───────────────────────────────────────────────────────────────────

/**
 * Material lines for one milestone or one task.
 *
 * Endpoint: `GET /api/materials/usages?constructionItemId=|constructionTaskId=`
 */
export async function getConstructionMaterialsApi(
  target: { constructionItemId?: string; constructionTaskId?: string },
  config?: RequestConfig,
): Promise<ConstructionMaterial[]> {
  const params = new URLSearchParams();
  if (target.constructionItemId) {
    params.set("constructionItemId", target.constructionItemId);
  }
  if (target.constructionTaskId) {
    params.set("constructionTaskId", target.constructionTaskId);
  }

  const response = await api.get<ConstructionMaterial[]>(
    `/api/materials/usages?${params.toString()}`,
    config,
  );
  return response.data;
}

/** Endpoint: `POST /api/materials/usages` */
export async function addConstructionMaterialApi(
  payload: CreateConstructionMaterialPayload,
  config?: RequestConfig,
): Promise<ConstructionMaterial> {
  const response = await api.post<ConstructionMaterial>(
    "/api/materials/usages",
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `PUT /api/materials/usages/{id}` */
export async function updateConstructionMaterialApi(
  id: string,
  payload: UpdateConstructionMaterialPayload,
  config?: RequestConfig,
): Promise<ConstructionMaterial> {
  const response = await api.put<ConstructionMaterial>(
    `/api/materials/usages/${id}`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `DELETE /api/materials/usages/{id}` */
export async function removeConstructionMaterialApi(
  id: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/materials/usages/${id}`, config);
}

/**
 * Milestone cost roll-up (own lines + every child task's).
 *
 * Endpoint: `GET /api/materials/cost/construction-items/{constructionItemId}`
 */
export async function getMaterialCostApi(
  constructionItemId: string,
  config?: RequestConfig,
): Promise<MaterialCostSummary> {
  const response = await api.get<MaterialCostSummary>(
    `/api/materials/cost/construction-items/${constructionItemId}`,
    config,
  );
  return response.data;
}
