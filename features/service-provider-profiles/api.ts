import { api } from "@/lib/http/axios";
import type {
  RequestConfig,
} from "@/lib/http/types";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Mirrors the backend `ProviderType` enum. Lowercase strings — the wire
 * format the backend accepts on POST.
 */
export type ProviderType = "individual" | "company";

/**
 * Mirrors the backend `Capability` enum. Lowercase strings.
 */
export type Capability = "designer" | "constructor" | "both";

/**
 * POST /api/service-provider-profiles body.
 *
 * Required: `accountId`, `displayName`, `providerType`, `capability`.
 * Everything else is optional — server fills sensible defaults.
 *
 * `accountId` is sent automatically from the auth context at submit time;
 * the form doesn't collect it.
 */
export interface CreateServiceProviderProfilePayload {
  accountId: string;
  displayName: string;
  providerType: ProviderType;
  capability: Capability;
  bio?: string;
  companyTaxCode?: string;
  yearsExperience?: number;
  portfolioHeadline?: string;
}

/**
 * PUT /api/service-provider-profiles/{id} body.
 *
 * Mirrors `CreateServiceProviderProfilePayload` minus `accountId` (the
 * path already identifies the target profile) and plus `isVerified`
 * (admin-only in practice, included for type completeness). Every field
 * is optional so the form can ship a partial update.
 */
export interface UpdateServiceProviderProfilePayload {
  displayName?: string;
  providerType?: ProviderType;
  capability?: Capability;
  bio?: string;
  companyTaxCode?: string;
  yearsExperience?: number;
  portfolioHeadline?: string;
  isVerified?: boolean;
}

/**
 * Shape returned by `POST /api/service-provider-profiles`. Mirrors the
 * `GET /api/auth/me` payload's `serviceProvider` block so the two are
 * interchangeable on the client side.
 *
 * We only model the fields the UI cares about right now — full profile
 * (designer / constructor sub-profiles) will be added when those pages
 * are wired up.
 */
export interface ServiceProviderProfileCreated {
  id: string;
  accountId: string;
  displayName: string;
  providerType: ProviderType;
  capability: Capability;
  bio: string | null;
  companyTaxCode: string | null;
  yearsExperience: number | null;
  portfolioHeadline: string | null;
  isVerified: boolean;
  avgRating: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Public, full-shape profile returned by
 * `GET /api/service-provider-profiles/{id}`. Adds the cover image,
 * logo, and intro-video URLs so the owner-facing profile page can
 * render a hero without a second round-trip to `/api/provider-brands`.
 */
export interface ServiceProviderProfileDetail extends ServiceProviderProfileCreated {
  logoUrl: string | null;
  logoViewUrl: string | null;
  coverImageUrl: string | null;
  coverImageViewUrl: string | null;
  introVideoUrl: string | null;
  introVideoViewUrl: string | null;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

/**
 * POST /api/service-provider-profiles — finish onboarding for a provider
 * account. Authenticated (request interceptor attaches the Bearer token).
 *
 * The backend returns this DTO flat — there is no `{ data, … }` envelope
 * anywhere in the API, so unwrapping `.data.data` yielded `undefined`.
 */
export async function createServiceProviderProfileApi(
  payload: CreateServiceProviderProfilePayload,
  config?: RequestConfig,
): Promise<ServiceProviderProfileCreated> {
  const response = await api.post<ServiceProviderProfileCreated>(
    "/api/service-provider-profiles",
    payload,
    config,
  );
  return response.data;
}

/**
 * PUT /api/service-provider-profiles/{id} — update an existing profile.
 *
 * The API doc specifies the same fields as the create payload, all optional
 * (the backend merges partial updates), plus `isVerified` (admin-only on
 * the wire but accepted here so the type mirrors `POST`).
 *
 * The auth interceptor attaches the Bearer token automatically; the
 * backend's authorization layer is responsible for rejecting edits from
 * accounts that aren't the profile owner (or an admin).
 */
export async function updateServiceProviderProfileApi(
  id: string,
  payload: UpdateServiceProviderProfilePayload,
  config?: RequestConfig,
): Promise<ServiceProviderProfileCreated> {
  const response = await api.put<ServiceProviderProfileCreated>(
    `/api/service-provider-profiles/${id}`,
    payload,
    config,
  );
  return response.data;
}

/**
 * GET /api/service-provider-profiles/{id} — full public profile.
 *
 * Used by the provider detail page (`/providers/{id}`). Includes brand
 * URLs (logo, cover, intro video) so the page can paint a hero without
 * a second request to `/api/provider-brands`.
 */
export async function getServiceProviderProfileApi(
  id: string,
  config?: RequestConfig,
): Promise<ServiceProviderProfileDetail> {
  const response = await api.get<ServiceProviderProfileDetail>(
    `/api/service-provider-profiles/${id}`,
    config,
  );
  return response.data;
}