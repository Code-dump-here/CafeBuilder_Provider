import { api } from "@/lib/http/axios";
import type {
  ApiSuccessResponse,
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
  accountId: number;
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
  id: number;
  accountId: number;
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

// ─── Endpoints ───────────────────────────────────────────────────────────────

/**
 * POST /api/service-provider-profiles — finish onboarding for a provider
 * account. Authenticated (request interceptor attaches the Bearer token).
 *
 * Backend returns the standard `{ data, message?, meta? }` envelope so we
 * unwrap `.data` before returning.
 */
export async function createServiceProviderProfileApi(
  payload: CreateServiceProviderProfilePayload,
  config?: RequestConfig,
): Promise<ServiceProviderProfileCreated> {
  const response = await api.post<ApiSuccessResponse<ServiceProviderProfileCreated>>(
    "/api/service-provider-profiles",
    payload,
    config,
  );
  return response.data.data;
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
  id: number,
  payload: UpdateServiceProviderProfilePayload,
  config?: RequestConfig,
): Promise<ServiceProviderProfileCreated> {
  const response = await api.put<ApiSuccessResponse<ServiceProviderProfileCreated>>(
    `/api/service-provider-profiles/${id}`,
    payload,
    config,
  );
  return response.data.data;
}