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
 * Query shape for `GET /api/service-provider-profiles`.
 *
 * Sort is fixed server-side (`AvgRating DESC, CreatedAt DESC`) so we
 * don't expose a `sort` knob here — it would just be ignored on the
 * wire. `capability` filtering includes providers whose own
 * `capability` is `both`, so an owner searching for `designer` will
 * see designers and "both-capability" studios.
 */
export interface ServiceProviderProfileFilters {
  pageNumber: number;
  pageSize: number;
  capability?: Exclude<Capability, "both"> | "all";
  isVerified?: boolean | null;
  search?: string;
}

export const DEFAULT_PROVIDER_FILTERS: ServiceProviderProfileFilters = {
  pageNumber: 1,
  pageSize: 12,
  capability: "all",
  isVerified: null,
  search: "",
};

/**
 * Wire shape returned by the GET list endpoint. The backend sends a
 * paged response; we type just enough of it to render the browse view.
 */
export interface ServiceProviderProfileSummary {
  id: string;
  displayName: string;
  providerType: ProviderType;
  capability: Capability;
  bio: string | null;
  yearsExperience: number | null;
  portfolioHeadline: string | null;
  isVerified: boolean;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
  /** Optional brand cover so the card can paint a hero without a
   *  second round-trip. May be `null` for providers who never edited
   *  their brand tab. */
  coverImageViewUrl: string | null;
  /** First few service areas so the card can hint at geography. */
  serviceAreas: { province: string; district: string | null }[];
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
 * Map the UI filter shape to the query string the backend expects.
 *
 * Sends only the keys whose value is meaningful — empty `search`,
 * `null` `isVerified`, and `"all"` `capability` are dropped so the cache
 * key doesn't churn on cosmetic changes.
 */
export function toProviderListQueryParams(
  filters: ServiceProviderProfileFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("pageNumber", String(filters.pageNumber));
  params.set("pageSize", String(filters.pageSize));

  if (filters.capability && filters.capability !== "all") {
    params.set("capability", filters.capability);
  }

  if (filters.isVerified === true) {
    params.set("isVerified", "true");
  } else if (filters.isVerified === false) {
    params.set("isVerified", "false");
  }

  if (filters.search && filters.search.trim().length > 0) {
    params.set("search", filters.search.trim());
  }

  return params;
}

/** Paged envelope for the browse endpoint. */
export interface PagedServiceProviderProfiles {
  items: ServiceProviderProfileSummary[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * GET /api/service-provider-profiles — the owner-facing browse list.
 *
 * Used by the providers directory page (`/providers`). Auth required;
 * the response is scoped server-side to providers whose profile isn't
 * soft-deleted, sorted by `AvgRating DESC, CreatedAt DESC`.
 */
export async function getServiceProviderProfilesApi(
  filters: ServiceProviderProfileFilters = DEFAULT_PROVIDER_FILTERS,
  config?: RequestConfig,
): Promise<PagedServiceProviderProfiles> {
  const params = toProviderListQueryParams(filters);
  const response = await api.get<PagedServiceProviderProfiles>(
    `/api/service-provider-profiles?${params.toString()}`,
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