"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { tokenStore } from "@/features/auth/token-store";

import {
  DEFAULT_PROVIDER_FILTERS,
  getServiceProviderProfileApi,
  getServiceProviderProfilesApi,
  type PagedServiceProviderProfiles,
  type ServiceProviderProfileDetail,
  type ServiceProviderProfileFilters,
} from "./api";
import {
  getProviderRatingSummaryApi,
  type ProviderRatingSummary,
} from "./rating-summary";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_RESPONSE: PagedServiceProviderProfiles = {
  items: [],
  pageNumber: 1,
  pageSize: DEFAULT_PROVIDER_FILTERS.pageSize,
  totalItems: 0,
  totalPages: 1,
  hasPrevious: false,
  hasNext: false,
};

/**
 * Subscribe to the token store's hydration state. Returns `true` as
 * soon as `tokenStore.hydrate()` runs (module-load hydration in the
 * browser). SSR returns `true` so queries don't pend on the server.
 */
function useAuthHydrated(): boolean {
  return React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.isHydrated(),
    () => true,
  );
}

/**
 * Strip "all"-valued / empty sentinels so the cache key doesn't churn
 * on cosmetic changes (e.g. toggling a filter back and forth).
 */
function stableListKey(filters: ServiceProviderProfileFilters) {
  const capability =
    filters.capability && filters.capability !== "all"
      ? filters.capability
      : undefined;
  const search =
    filters.search && filters.search.trim().length > 0
      ? filters.search.trim()
      : undefined;
  return {
    pageNumber: filters.pageNumber,
    pageSize: filters.pageSize,
    capability,
    isVerified: filters.isVerified ?? undefined,
    search,
  };
}

// ─── List ─────────────────────────────────────────────────────────────────────

export interface UseServiceProviderProfilesResult {
  data: PagedServiceProviderProfiles;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * GET /api/service-provider-profiles — owner-facing browse list.
 *
 * Sort is fixed server-side (`AvgRating DESC, CreatedAt DESC`), so
 * this hook only exposes the filter knobs the backend accepts.
 * `keepPreviousData` keeps the previous page visible while the next
 * request is in flight.
 */
export function useServiceProviderProfiles(
  filters: ServiceProviderProfileFilters = DEFAULT_PROVIDER_FILTERS,
): UseServiceProviderProfilesResult {
  const stable = stableListKey(filters);
  const queryKey = queryKeys.serviceProviderProfiles.list(stable);
  const hydrated = useAuthHydrated();

  const query = useQuery<PagedServiceProviderProfiles, Error>({
    queryKey,
    queryFn: ({ signal }) =>
      getServiceProviderProfilesApi(filters, { signal }),
    placeholderData: keepPreviousData,
    enabled: hydrated,
  });

  return {
    data: query.data ?? EMPTY_RESPONSE,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export interface UseServiceProviderProfileResult {
  profile: ServiceProviderProfileDetail | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * GET /api/service-provider-profiles/{id} — single profile for the
 * owner-facing detail page.
 */
export function useServiceProviderProfile(
  id: string | null | undefined,
): UseServiceProviderProfileResult {
  const safeId = id ?? "";
  const hydrated = useAuthHydrated();

  const query = useQuery<ServiceProviderProfileDetail, Error>({
    queryKey: queryKeys.serviceProviderProfiles.detail(safeId),
    queryFn: ({ signal }) =>
      getServiceProviderProfileApi(safeId, { signal }),
    enabled: hydrated && safeId.length > 0,
    staleTime: 60 * 1000,
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Rating summary ───────────────────────────────────────────────────────────

export interface UseProviderRatingSummaryResult {
  summary: ProviderRatingSummary | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * GET /api/reviews/providers/{id}/summary
 *
 * Returns `null` when the provider has no reviews yet. The hook
 * mirrors that: callers can render an empty-state off `summary ===
 * null` without checking `isError`.
 */
export function useProviderRatingSummary(
  id: string | null | undefined,
): UseProviderRatingSummaryResult {
  const safeId = id ?? "";
  const hydrated = useAuthHydrated();

  const query = useQuery<ProviderRatingSummary | null, Error>({
    queryKey: queryKeys.serviceProviderProfiles.ratingSummary(safeId),
    queryFn: async ({ signal }) => {
      if (!safeId) return null;
      return getProviderRatingSummaryApi(safeId, { signal });
    },
    enabled: hydrated && safeId.length > 0,
    staleTime: 60 * 1000,
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
