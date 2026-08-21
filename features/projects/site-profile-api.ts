import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  CreateSiteProfilePayload,
  SiteFloor,
  SiteFloorPayload,
  SiteOpening,
  SiteOpeningPayload,
  SiteProfile,
  UpdateSiteProfilePayload,
} from "./site-profile-types";

/**
 * The premises record for one project.
 *
 * Endpoint: `GET /api/site-profiles/by-project/{projectShopOwnerId}`
 *
 * 404 is the normal answer for a project nobody has measured yet, so callers
 * treat it as "no profile" rather than as an error — see `useSiteProfile`.
 */
export async function getSiteProfileByProjectApi(
  projectShopOwnerId: string,
  config?: RequestConfig,
): Promise<SiteProfile> {
  const response = await api.get<SiteProfile>(
    `/api/site-profiles/by-project/${projectShopOwnerId}`,
    config,
  );
  return response.data;
}

/**
 * Endpoint: `POST /api/site-profiles`
 *
 * Floors and openings can ride along in the same call, which is what the
 * "record the premises" form does — one round trip instead of N+1.
 */
export async function createSiteProfileApi(
  payload: CreateSiteProfilePayload,
  config?: RequestConfig,
): Promise<SiteProfile> {
  const response = await api.post<SiteProfile>("/api/site-profiles", payload, config);
  return response.data;
}

/** Endpoint: `PUT /api/site-profiles/{id}` */
export async function updateSiteProfileApi(
  id: string,
  payload: UpdateSiteProfilePayload,
  config?: RequestConfig,
): Promise<SiteProfile> {
  const response = await api.put<SiteProfile>(`/api/site-profiles/${id}`, payload, config);
  return response.data;
}

/** Endpoint: `DELETE /api/site-profiles/{id}` */
export async function deleteSiteProfileApi(
  id: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/site-profiles/${id}`, config);
}

// ─── Floors ──────────────────────────────────────────────────────────────────

/** Endpoint: `POST /api/site-profiles/{id}/floors` */
export async function addSiteFloorApi(
  siteProfileId: string,
  payload: SiteFloorPayload,
  config?: RequestConfig,
): Promise<SiteFloor> {
  const response = await api.post<SiteFloor>(
    `/api/site-profiles/${siteProfileId}/floors`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `PUT /api/site-profiles/floors/{floorId}` */
export async function updateSiteFloorApi(
  floorId: string,
  payload: SiteFloorPayload,
  config?: RequestConfig,
): Promise<SiteFloor> {
  const response = await api.put<SiteFloor>(
    `/api/site-profiles/floors/${floorId}`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `DELETE /api/site-profiles/floors/{floorId}` */
export async function removeSiteFloorApi(
  floorId: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/site-profiles/floors/${floorId}`, config);
}

// ─── Openings ────────────────────────────────────────────────────────────────

/** Endpoint: `POST /api/site-profiles/{id}/openings` */
export async function addSiteOpeningApi(
  siteProfileId: string,
  payload: SiteOpeningPayload,
  config?: RequestConfig,
): Promise<SiteOpening> {
  const response = await api.post<SiteOpening>(
    `/api/site-profiles/${siteProfileId}/openings`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `PUT /api/site-profiles/openings/{openingId}` */
export async function updateSiteOpeningApi(
  openingId: string,
  payload: SiteOpeningPayload,
  config?: RequestConfig,
): Promise<SiteOpening> {
  const response = await api.put<SiteOpening>(
    `/api/site-profiles/openings/${openingId}`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `DELETE /api/site-profiles/openings/{openingId}` */
export async function removeSiteOpeningApi(
  openingId: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/site-profiles/openings/${openingId}`, config);
}
