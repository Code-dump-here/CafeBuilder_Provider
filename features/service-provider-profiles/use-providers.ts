"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { tokenStore } from "@/features/auth/token-store";

import {
  getServiceProviderProfileApi,
  type ServiceProviderProfileDetail,
} from "./api";
import {
  getProviderRatingSummaryApi,
  type ProviderRatingSummary,
} from "./rating-summary";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
