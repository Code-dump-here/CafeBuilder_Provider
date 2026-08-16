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
import type {
  DesignVersionSnapshot,
  DesignVersionSnapshotPage,
} from "./design-version-types";

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

  // The `api` instance defaults Content-Type to application/json, which
  // merges into every request. For FormData we must explicitly clear it
  // (not just omit an override) so the client sets it itself with the
  // multipart boundary — see the identical fix in lib/http/file-upload-api.ts.
  const response = await api.post<DesignImageUploadResponse>(
    `/api/designs/${designId}/files`,
    form,
    {
      ...config,
      headers: { ...config?.headers, "Content-Type": undefined },
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

// ─── Design Version Snapshots (Full History) ────────────────────────────────
//
// Each `submit` / `approve` on the backend creates a NEW immutable
// snapshot of the design's metadata + images. We expose two endpoints:
//
//   1. `GET /api/designs/{id}/versions`        — paged list (audit log).
//   2. `GET /api/designs/{id}/versions/{vid}`  — single snapshot detail
//      (includes the images copied at that point in time).
//
// Pages are sorted `snapshottedAt DESC` so the freshest snapshot is
// always at the top of the list.

// ─── Wire types ─────────────────────────────────────────────────────────────

interface RawDesignVersionImage {
  id: number;
  originalImageId: number | null;
  imageUrl: string;
  caption: string | null;
  uploadedBy: number;
  uploadedAt: string;
}

interface RawDesignVersionSnapshot {
  id: number;
  designId: number;
  snapshotKind: "submitted" | "approved" | "revision";
  version: string;
  title: string | null;
  type: Design["type"];
  status: Design["status"];
  reason: string | null;
  createdBy: number | null;
  snapshottedBy: number | null;
  createdAt: string;
  snapshottedAt: string;
  images: RawDesignVersionImage[];
}

interface RawDesignVersionSnapshotPage {
  items: RawDesignVersionSnapshot[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// ─── Normalization ──────────────────────────────────────────────────────────

function normalizeSnapshot(
  raw: RawDesignVersionSnapshot,
): DesignVersionSnapshot {
  return {
    id: raw.id,
    designId: raw.designId,
    snapshotKind: raw.snapshotKind,
    version: raw.version,
    title: raw.title,
    type: raw.type,
    status: raw.status,
    reason: raw.reason,
    createdBy: raw.createdBy,
    snapshottedBy: raw.snapshottedBy,
    createdAt: new Date(raw.createdAt),
    snapshottedAt: new Date(raw.snapshottedAt),
    images: raw.images.map((img) => ({
      id: img.id,
      originalImageId: img.originalImageId,
      imageUrl: img.imageUrl,
      caption: img.caption,
      uploadedBy: img.uploadedBy,
      uploadedAt: new Date(img.uploadedAt),
    })),
  };
}

function normalizeSnapshotPage(
  raw: RawDesignVersionSnapshotPage,
): DesignVersionSnapshotPage {
  return {
    items: raw.items.map(normalizeSnapshot),
    pageNumber: raw.pageNumber,
    pageSize: raw.pageSize,
    totalItems: raw.totalItems,
    totalPages: raw.totalPages,
    hasPrevious: raw.hasPrevious,
    hasNext: raw.hasNext,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface ListDesignVersionsParams {
  designId: number;
  pageNumber?: number;
  pageSize?: number;
}

/**
 * `GET /api/designs/{id}/versions?pageNumber=&pageSize=`
 *
 * Returns the paged full-history list of snapshots for a single design.
 * The backend orders by `snapshottedAt DESC` so the most recent
 * submit / approve surfaces first.
 */
export async function getDesignVersionsApi(
  params: ListDesignVersionsParams,
  config?: RequestConfig,
): Promise<DesignVersionSnapshotPage> {
  const search = new URLSearchParams();
  if (params.pageNumber !== undefined) {
    search.set("pageNumber", String(params.pageNumber));
  }
  if (params.pageSize !== undefined) {
    search.set("pageSize", String(params.pageSize));
  }
  const response = await api.get<RawDesignVersionSnapshotPage>(
    `/api/designs/${params.designId}/versions${
      search.toString() ? `?${search.toString()}` : ""
    }`,
    config,
  );
  return normalizeSnapshotPage(response.data);
}

/**
 * `GET /api/designs/{id}/versions/{versionId}`
 *
 * Returns a single snapshot detail (with images). 404 if the version
 * belongs to a different design — the caller doesn't need to scope
 * further, the backend enforces it.
 */
export async function getDesignVersionApi(
  designId: number,
  versionId: number,
  config?: RequestConfig,
): Promise<DesignVersionSnapshot> {
  const response = await api.get<RawDesignVersionSnapshot>(
    `/api/designs/${designId}/versions/${versionId}`,
    config,
  );
  return normalizeSnapshot(response.data);
}
