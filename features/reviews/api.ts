import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type { ProviderRatingSummary, ReviewListResponse } from "./types";

/**
 * Reviews a provider has received.
 *
 * Endpoint: `GET /api/reviews?serviceProviderProfileId=`
 *
 * Reading is open to any signed-in account on purpose: a shop owner has to be
 * able to judge a provider *before* hiring one, so gating this behind an
 * engagement would make it useless.
 */
export async function getProviderReviewsApi(
  serviceProviderProfileId: string,
  options?: { pageNumber?: number; pageSize?: number },
  config?: RequestConfig,
): Promise<ReviewListResponse> {
  const params = new URLSearchParams({
    serviceProviderProfileId,
    pageSize: String(options?.pageSize ?? 20),
  });
  if (options?.pageNumber) params.set("pageNumber", String(options.pageNumber));

  const response = await api.get<ReviewListResponse>(
    `/api/reviews?${params.toString()}`,
    config,
  );
  return response.data;
}

/**
 * Aggregated rating: overall average plus the average of every criterion.
 *
 * Endpoint: `GET /api/reviews/providers/{id}/summary`
 *
 * Kept separate from the list because the averages are computed over *all*
 * reviews, not just the page currently on screen — deriving them from
 * `getProviderReviewsApi` would silently report the first 20 only.
 */
export async function getProviderRatingSummaryApi(
  serviceProviderProfileId: string,
  config?: RequestConfig,
): Promise<ProviderRatingSummary> {
  const response = await api.get<ProviderRatingSummary>(
    `/api/reviews/providers/${serviceProviderProfileId}/summary`,
    config,
  );
  return response.data;
}
