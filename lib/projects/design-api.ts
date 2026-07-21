import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  CreateDesignPayload,
  Design,
  DesignImageUploadFields,
  DesignImageUploadResponse,
  DesignListResponse,
  RequestRevisionPayload,
  UpdateDesignPayload,
} from "./design-types";

/**
 * List designs for a project (engagement-scoped).
 *
 * Endpoint: `GET /api/designs?projectWorkingId=&status=&type=&pageNumber=&pageSize=`
 *
 * Authorization:
 *   Bearer access token required.
 *
 * All query params are optional — the backend applies them as filters
 * (AND semantics). When `projectWorkingId` is omitted the backend falls
 * back to the caller's visible scope, which is rarely what you want —
 * we always send it explicitly from the FE.
 */
export interface ListDesignsParams {
  projectWorkingId: number;
  status?: string;
  type?: string;
  pageNumber?: number;
  pageSize?: number;
}

export async function getDesignsApi(
  params: ListDesignsParams,
  config?: RequestConfig,
): Promise<DesignListResponse> {
  const search = new URLSearchParams();
  search.set("projectWorkingId", String(params.projectWorkingId));
  if (params.status) search.set("status", params.status);
  if (params.type) search.set("type", params.type);
  if (params.pageNumber !== undefined) {
    search.set("pageNumber", String(params.pageNumber));
  }
  if (params.pageSize !== undefined) {
    search.set("pageSize", String(params.pageSize));
  }
  const response = await api.get<DesignListResponse>(
    `/api/designs?${search.toString()}`,
    config,
  );
  return response.data;
}

/**
 * Get a single design by ID.
 *
 * Endpoint: `GET /api/designs/{id}`
 */
export async function getDesignApi(
  designId: number,
  config?: RequestConfig,
): Promise<Design> {
  const response = await api.get<Design>(
    `/api/designs/${designId}`,
    config,
  );
  return response.data;
}

/**
 * Create a new design (provider).
 *
 * Endpoint: `POST /api/designs`
 *
 * Authorization:
 *   Bearer access token required (provider with an `accepted` engagement
 *   on the targeted `projectWorkingId`).
 *
 * Body:
 *   - `projectWorkingId` (int) — engagement id the design belongs to.
 *   - `title` (string)         — human-friendly row title.
 *   - `type` (string)          — REVISION / FLOOR_PLAN / 3D / ELEVATION / SECTION.
 *   - `createdBy` (int)        — provider account id (creator).
 *
 * Effect:
 *   - Returns a `DesignResponse` with `status = "in_progress"` and
 *     `version = "0.1"`.
 *   - `images[]` is empty on first create.
 *
 * Error shape:
 *   - 400 — invalid body or missing required field.
 *   - 401 — no / expired access token.
 *   - 403 — caller is not a provider on this engagement, or contract not yet `confirmed`.
 *   - 404 — `projectWorkingId` not found.
 */
export async function createDesignApi(
  payload: CreateDesignPayload,
  config?: RequestConfig,
): Promise<Design> {
  const response = await api.post<Design>(
    "/api/designs",
    payload,
    config,
  );
  return response.data;
}

/**
 * Update a design (provider only, while `in_progress` or `revision`).
 *
 * Endpoint: `PUT /api/designs/{id}`
 */
export async function updateDesignApi(
  designId: number,
  payload: UpdateDesignPayload,
  config?: RequestConfig,
): Promise<Design> {
  const response = await api.put<Design>(
    `/api/designs/${designId}`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Submit a design for owner review (provider).
 *
 * Endpoint: `POST /api/designs/{id}/submit`
 *
 * Pre-condition:
 *   Design must have ≥1 uploaded file. Otherwise the backend returns 400.
 */
export async function submitDesignApi(
  designId: number,
  config?: RequestConfig,
): Promise<Design> {
  const response = await api.post<Design>(
    `/api/designs/${designId}/submit`,
    undefined,
    config,
  );
  return response.data;
}

/**
 * Approve a submitted design (owner).
 *
 * Endpoint: `POST /api/designs/{id}/approve`
 */
export async function approveDesignApi(
  designId: number,
  config?: RequestConfig,
): Promise<Design> {
  const response = await api.post<Design>(
    `/api/designs/${designId}/approve`,
    undefined,
    config,
  );
  return response.data;
}

/**
 * Ask for a revision (owner).
 *
 * Endpoint: `POST /api/designs/{id}/request-revision`
 *
 * Body: `{ reason }`
 */
export async function requestRevisionApi(
  designId: number,
  payload: RequestRevisionPayload,
  config?: RequestConfig,
): Promise<Design> {
  const response = await api.post<Design>(
    `/api/designs/${designId}/request-revision`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Re-open a `revision` design for further edits (provider).
 *
 * Endpoint: `POST /api/designs/{id}/start-revision`
 */
export async function startRevisionApi(
  designId: number,
  config?: RequestConfig,
): Promise<Design> {
  const response = await api.post<Design>(
    `/api/designs/${designId}/start-revision`,
    undefined,
    config,
  );
  return response.data;
}

/**
 * Upload a file to a design (provider).
 *
 * Endpoint: `POST /api/designs/{id}/files`
 *
 * Content-Type: `multipart/form-data`
 *
 * Body parts:
 *   - `file` (binary)  — image / PDF / office document.
 *   - `caption` (string, optional)
 *   - `uploadedBy` (int, required)
 *
 * Pre-condition: design status is NOT `approved`.
 *
 * Error cases:
 *   - 400: invalid file type / missing required field.
 *   - 403: design already approved.
 */
export async function uploadDesignImageApi(
  designId: number,
  file: File,
  fields: DesignImageUploadFields,
  config?: RequestConfig,
): Promise<DesignImageUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  if (fields.caption !== undefined) form.append("caption", fields.caption);
  form.append("uploadedBy", String(fields.uploadedBy));

  const response = await api.post<DesignImageUploadResponse>(
    `/api/designs/${designId}/files`,
    form,
    {
      ...config,
      headers: {
        "Content-Type": "multipart/form-data",
        ...config?.headers,
      } as Record<string, string>,
    },
  );
  return response.data;
}

/**
 * Delete a design image (provider / owner).
 *
 * Endpoint: `DELETE /api/designs/{id}/files/{fileId}`
 *
 * Pre-condition: design status is NOT `approved`.
 *
 * Returns 204 on success (empty body).
 */
export async function deleteDesignImageApi(
  designId: number,
  fileId: number,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/designs/${designId}/files/${fileId}`, config);
}