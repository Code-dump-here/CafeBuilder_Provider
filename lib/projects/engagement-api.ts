import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  Engagement,
  EngagementListResponse,
  EngagementOverview,
  EngagementWithProvider,
  UpdateEngagementStatusPayload,
} from "./engagement-types";

/**
 * Get engagements for a project (by projectShopOwnerId) or provider (by serviceProviderProfileId).
 *
 * Endpoint: `GET /api/project-workings`
 *
 * Query params:
 *   - projectShopOwnerId: filter by project
 *   - serviceProviderProfileId: filter by provider
 *   - status: filter by status (requested, accepted, rejected, completed, terminated)
 *
 * Authorization:
 *   Bearer access token required.
 */
export async function getEngagementsApi(
  params: {
    projectShopOwnerId?: number | string;
    serviceProviderProfileId?: number | string;
    status?: string;
    pageNumber?: number;
    pageSize?: number;
  } = {},
  config?: RequestConfig,
): Promise<EngagementListResponse> {
  const searchParams = new URLSearchParams();

  if (params.projectShopOwnerId !== undefined) {
    searchParams.set("projectShopOwnerId", String(params.projectShopOwnerId));
  }
  if (params.serviceProviderProfileId !== undefined) {
    searchParams.set(
      "serviceProviderProfileId",
      String(params.serviceProviderProfileId),
    );
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.pageNumber !== undefined) {
    searchParams.set("pageNumber", String(params.pageNumber));
  }
  if (params.pageSize !== undefined) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  const queryString = searchParams.toString();
  const url = queryString
    ? `/api/project-workings?${queryString}`
    : "/api/project-workings";

  const response = await api.get<EngagementListResponse>(url, config);
  return response.data;
}

/**
 * Get a single engagement by ID.
 *
 * Endpoint: `GET /api/project-workings/{id}`
 *
 * Authorization:
 *   Bearer access token required.
 */
export async function getEngagementApi(
  engagementId: number,
  config?: RequestConfig,
): Promise<Engagement> {
  const response = await api.get<Engagement>(
    `/api/project-workings/${engagementId}`,
    config,
  );
  return response.data;
}

/**
 * Get engagement overview (includes project, brief, AI recommendations, designs).
 *
 * Endpoint: `GET /api/project-workings/{id}/overview`
 *
 * Authorization:
 *   Bearer access token required.
 */
export async function getEngagementOverviewApi(
  engagementId: number,
  config?: RequestConfig,
): Promise<EngagementOverview> {
  const response = await api.get<EngagementOverview>(
    `/api/project-workings/${engagementId}/overview`,
    config,
  );
  return response.data;
}

/**
 * Get the owner's design brief for an engagement (provider view).
 *
 * Endpoint: `GET /api/project-workings/{id}/brief`
 *
 * Authorization:
 *   Bearer access token required. Provider can view from `requested` status;
 *   blocked if rejected or terminated.
 */
export async function getEngagementBriefApi(
  engagementId: number,
  config?: RequestConfig,
): Promise<unknown> {
  const response = await api.get(
    `/api/project-workings/${engagementId}/brief`,
    config,
  );
  return response.data;
}

/**
 * Update engagement status.
 *
 * Endpoint: `PUT /api/project-workings/{id}/status`
 *
 * Authorization:
 *   Bearer access token required. Only owner can mark as `completed`
 *   (requires confirmed contract). Both owner and provider can `terminate`.
 */
export async function updateEngagementStatusApi(
  engagementId: number,
  payload: UpdateEngagementStatusPayload,
  config?: RequestConfig,
): Promise<Engagement> {
  const response = await api.put<Engagement>(
    `/api/project-workings/${engagementId}/status`,
    payload,
    config,
  );
  return response.data;
}
