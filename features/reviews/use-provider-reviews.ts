"use client";

import { useQuery } from "@tanstack/react-query";

import { getProviderRatingSummaryApi, getProviderReviewsApi } from "./api";
import type { ProviderRatingSummary, ReviewListResponse } from "./types";

/** Reviews a provider has received, newest first as the API orders them. */
export function useProviderReviews(serviceProviderProfileId: string | undefined) {
  return useQuery<ReviewListResponse>({
    queryKey: ["reviews", "provider", serviceProviderProfileId],
    queryFn: ({ signal }) =>
      getProviderReviewsApi(serviceProviderProfileId!, undefined, { signal }),
    enabled: Boolean(serviceProviderProfileId),
  });
}

/**
 * Overall average and the per-criterion averages.
 *
 * Fetched alongside the list rather than derived from it: the averages cover
 * every review, while the list is paginated.
 */
export function useProviderRatingSummary(
  serviceProviderProfileId: string | undefined,
) {
  return useQuery<ProviderRatingSummary>({
    queryKey: ["reviews", "provider", serviceProviderProfileId, "summary"],
    queryFn: ({ signal }) =>
      getProviderRatingSummaryApi(serviceProviderProfileId!, { signal }),
    enabled: Boolean(serviceProviderProfileId),
  });
}
