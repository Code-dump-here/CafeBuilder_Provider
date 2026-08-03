import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  Engagement,
  EngagementListResponse,
  EngagementOverview,
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
 *
 * Note: as of the `a.md` rollout, the "close collaboration" flow is
 * driven by the dedicated endpoints below — this generic PUT remains
 * available for legacy callers but the new code paths should prefer
 * `requestCompletion` / `completeEngagement` / `terminateEngagement`.
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

/**
 * Provider taps "Báo hoàn thành".
 *
 * Endpoint: `POST /api/project-workings/{engagementId}/request-completion`
 *
 * Authorization:
 *   Bearer token required; **must be the engaged provider**. A 401 is
 *   returned by the backend if the caller is the owner or a stranger.
 *
 * Body:
 *   `{ note?: string }`. `note` is optional and capped at 1000 chars; an
 *   empty body `{}` is also valid (provider just wants to flag the
 *   "request" without supplying any commentary).
 *
 * Idempotency:
 *   The backend accepts repeated calls — the note and `completionRequestedAt`
 *   are rewritten each time. The UI may re-call this to update the note
 *   while `status` is still `accepted`.
 *
 * Errors worth handling on the FE:
 *   - 409 deliverable not finished — message already Vietnamese, just toast.
 */
export async function requestCompletionApi(
  engagementId: number,
  payload: { note?: string } = {},
  config?: RequestConfig,
): Promise<Engagement> {
  const response = await api.post<Engagement>(
    `/api/project-workings/${engagementId}/request-completion`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Owner taps "Nghiệm thu" (accepts the provider's completion).
 *
 * Endpoint: `POST /api/project-workings/{engagementId}/complete`
 *
 * Authorization:
 *   Bearer token required; **must be the project owner**. Provider
 *   token → 401.
 *
 * No body. The backend inspects the deliverable per `a.md` §4.2
 * (design approvals / construction items). When neither the provider
 * has requested completion nor the deliverable is finished, a 409 is
 * returned with a Vietnamese message asking the caller to wait for the
 * provider's request or finish the deliverable first.
 */
export async function completeEngagementApi(
  engagementId: number,
  config?: RequestConfig,
): Promise<Engagement> {
  const response = await api.post<Engagement>(
    `/api/project-workings/${engagementId}/complete`,
    undefined,
    config,
  );
  return response.data;
}

/**
 * Either side taps "Huỷ ngang hợp tác" (terminate).
 *
 * Endpoint: `POST /api/project-workings/{engagementId}/terminate`
 *
 * Authorization:
 *   Bearer token required; **either the project owner or the engaged
 *   provider** may call this. Admin may too.
 *
 * No body. Backend clears `completionRequestedAt` on success (the
 * "wait for acceptance" flag is reset).
 */
export async function terminateEngagementApi(
  engagementId: number,
  config?: RequestConfig,
): Promise<Engagement> {
  const response = await api.post<Engagement>(
    `/api/project-workings/${engagementId}/terminate`,
    undefined,
    config,
  );
  return response.data;
}
