import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  ApplyToPostPayload,
  ApplyResponse,
  AppliesListResponse,
  ProjectApplication,
  UpdateApplyProposalPayload,
} from "./project-application-types";

/**
 * Apply to an open marketplace post on behalf of the current provider.
 *
 * Endpoint: `POST /api/applies/apply`
 *
 * Authorization:
 *   The Bearer access token is attached automatically by the axios
 *   request interceptor (`lib/http/axios.ts`). We do NOT pass the token
 *   manually — passing `skipAuth: true` here would intentionally bypass
 *   that, and the server would 401 because apply is an authenticated
 *   action.
 */
export async function applyToPostApi(
  payload: ApplyToPostPayload,
  config?: RequestConfig,
): Promise<ProjectApplication> {
  const response = await api.post<ProjectApplication>(
    "/api/applies/apply",
    payload,
    config,
  );
  return response.data;
}

/**
 * Get applies for a provider filtered by serviceProviderProfileId.
 *
 * Endpoint: `GET /api/applies`
 *
 * Query params:
 *   - serviceProviderProfileId: filter by provider profile
 *   - postId: filter by post
 *   - status: filter by status (pending, accepted, rejected, withdrawn)
 *   - projectShopOwnerId: filter by project
 *
 * Authorization:
 *   Bearer access token required. Returns only applies for the
 *   authenticated provider (or all if admin).
 */
export async function getAppliesApi(
  params: {
    serviceProviderProfileId?: string;
    postId?: string;
    status?: string;
    projectShopOwnerId?: string;
    pageNumber?: number;
    pageSize?: number;
  } = {},
  config?: RequestConfig,
): Promise<AppliesListResponse> {
  const searchParams = new URLSearchParams();

  if (params.serviceProviderProfileId !== undefined) {
    searchParams.set("serviceProviderProfileId", String(params.serviceProviderProfileId));
  }
  if (params.postId !== undefined) {
    searchParams.set("postId", String(params.postId));
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.projectShopOwnerId !== undefined) {
    searchParams.set("projectShopOwnerId", String(params.projectShopOwnerId));
  }
  if (params.pageNumber !== undefined) {
    searchParams.set("pageNumber", String(params.pageNumber));
  }
  if (params.pageSize !== undefined) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  const queryString = searchParams.toString();
  const url = queryString ? `/api/applies?${queryString}` : "/api/applies";

  const response = await api.get<AppliesListResponse>(url, config);
  return response.data;
}

/**
 * Get a single apply by ID.
 *
 * Endpoint: `GET /api/applies/{id}`
 */
export async function getApplyApi(
  applyId: string,
  config?: RequestConfig,
): Promise<ApplyResponse> {
  const response = await api.get<ApplyResponse>(
    `/api/applies/${applyId}`,
    config,
  );
  return response.data;
}

/**
 * Revise a proposal the owner hasn't answered yet.
 *
 * Endpoint: `PUT /api/applies/{id}/proposal`
 *
 * Both payload fields are optional — the server writes only what's
 * present, so this works as a partial update.
 *
 * Authorization:
 *   Bearer access token required.
 *
 * Errors worth handling on the FE:
 *   - 404 the application no longer exists (e.g. already withdrawn from
 *     another tab).
 *   - 409 "Apply đang ở trạng thái '…', chỉ sửa được khi pending." — the
 *     owner accepted or rejected it while the dialog was open. Surface the
 *     server's Vietnamese message and refetch.
 */
export async function updateApplyProposalApi(
  applyId: string,
  payload: UpdateApplyProposalPayload,
  config?: RequestConfig,
): Promise<ApplyResponse> {
  const response = await api.put<ApplyResponse>(
    `/api/applies/${applyId}/proposal`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Withdraw a pending application.
 *
 * Endpoint: `DELETE /api/applies/{id}/withdraw`
 *
 * Returns `204 No Content` and **hard-deletes** the row — there is no
 * `withdrawn` status to read back afterwards, so callers must drop the
 * application from their cache rather than expecting a status change.
 *
 * Authorization:
 *   Bearer access token required.
 *
 * Errors worth handling on the FE:
 *   - 404 already gone — safe to treat as success (the user's intent is
 *     satisfied either way).
 *   - 409 the owner already accepted or rejected it; only `pending`
 *     applications can be withdrawn.
 */
export async function withdrawApplyApi(
  applyId: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete<void>(`/api/applies/${applyId}/withdraw`, config);
}
