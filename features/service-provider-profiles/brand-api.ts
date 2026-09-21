import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  ProviderBrand,
  ProviderCertificate,
  ProviderCertificatePayload,
  ProviderServiceArea,
  ProviderServiceAreaPayload,
  ProviderSocialLink,
  ProviderSocialLinkPayload,
  UpdateProviderBrandPayload,
} from "./brand-types";

/**
 * A provider's public brand, with social links, service areas and certificates.
 *
 * Endpoint: `GET /api/provider-brands/{serviceProviderProfileId}`
 *
 * Readable by any signed-in account — an owner comparing bids needs this
 * before there is any engagement between them.
 */
export async function getProviderBrandApi(
  serviceProviderProfileId: string,
  config?: RequestConfig,
): Promise<ProviderBrand> {
  const response = await api.get<ProviderBrand>(
    `/api/provider-brands/${serviceProviderProfileId}`,
    config,
  );
  return response.data;
}

/**
 * Endpoint: `PUT /api/provider-brands/{serviceProviderProfileId}`
 *
 * Provider-only, and only their own profile: writing to someone else's is a
 * 401 regardless of role.
 */
export async function updateProviderBrandApi(
  serviceProviderProfileId: string,
  payload: UpdateProviderBrandPayload,
  config?: RequestConfig,
): Promise<ProviderBrand> {
  const response = await api.put<ProviderBrand>(
    `/api/provider-brands/${serviceProviderProfileId}`,
    payload,
    config,
  );
  return response.data;
}

// ─── Social links ────────────────────────────────────────────────────────────

/** Endpoint: `POST /api/provider-brands/{id}/social-links` */
export async function addProviderSocialLinkApi(
  serviceProviderProfileId: string,
  payload: ProviderSocialLinkPayload,
  config?: RequestConfig,
): Promise<ProviderSocialLink> {
  const response = await api.post<ProviderSocialLink>(
    `/api/provider-brands/${serviceProviderProfileId}/social-links`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `PUT /api/provider-brands/social-links/{linkId}` */
export async function updateProviderSocialLinkApi(
  linkId: string,
  payload: ProviderSocialLinkPayload,
  config?: RequestConfig,
): Promise<ProviderSocialLink> {
  const response = await api.put<ProviderSocialLink>(
    `/api/provider-brands/social-links/${linkId}`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `DELETE /api/provider-brands/social-links/{linkId}` */
export async function removeProviderSocialLinkApi(
  linkId: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/provider-brands/social-links/${linkId}`, config);
}

// ─── Service areas ───────────────────────────────────────────────────────────

/** Endpoint: `POST /api/provider-brands/{id}/service-areas` */
export async function addProviderServiceAreaApi(
  serviceProviderProfileId: string,
  payload: ProviderServiceAreaPayload,
  config?: RequestConfig,
): Promise<ProviderServiceArea> {
  const response = await api.post<ProviderServiceArea>(
    `/api/provider-brands/${serviceProviderProfileId}/service-areas`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `DELETE /api/provider-brands/service-areas/{areaId}` */
export async function removeProviderServiceAreaApi(
  areaId: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/provider-brands/service-areas/${areaId}`, config);
}

// ─── Certificates ────────────────────────────────────────────────────────────

/** Endpoint: `POST /api/provider-brands/{id}/certificates` */
export async function addProviderCertificateApi(
  serviceProviderProfileId: string,
  payload: ProviderCertificatePayload,
  config?: RequestConfig,
): Promise<ProviderCertificate> {
  const response = await api.post<ProviderCertificate>(
    `/api/provider-brands/${serviceProviderProfileId}/certificates`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `PUT /api/provider-brands/certificates/{certificateId}` */
export async function updateProviderCertificateApi(
  certificateId: string,
  payload: ProviderCertificatePayload,
  config?: RequestConfig,
): Promise<ProviderCertificate> {
  const response = await api.put<ProviderCertificate>(
    `/api/provider-brands/certificates/${certificateId}`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `DELETE /api/provider-brands/certificates/{certificateId}` */
export async function removeProviderCertificateApi(
  certificateId: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/provider-brands/certificates/${certificateId}`, config);
}
