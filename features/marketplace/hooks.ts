"use client";

import * as React from "react";
import {
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { tokenStore } from "@/features/auth/token-store";

import {
  DEFAULT_FILTERS,
  type MarketplaceFilters,
  type MarketplacePost,
  type PagedResponse,
} from "./types";
import {
  fetchMarketplacePosts,
  fetchOpenMarketplacePostCount,
} from "./api";

// ---------------------------------------------------------------------------
// Default page response — used while a query is loading or hasn't yet
// resolved. Keeping a stable shape lets the page read `data.items` /
// `data.totalItems` without optional-chaining everywhere.

const EMPTY_RESPONSE: PagedResponse<MarketplacePost> = {
  items: [],
  pageNumber: 1,
  pageSize: DEFAULT_FILTERS.pageSize,
  totalItems: 0,
  totalPages: 1,
  hasPrevious: false,
  hasNext: false,
};

/**
 * Result of `useMarketplacePosts`. Wraps the raw React Query result so
 * `data` is always a fully-typed `PagedResponse` (placeholder while
 * loading) — the page can render skeletons / error states off `isLoading`
 * / `error` without optional-chaining `data?.items`.
 */
export interface UseMarketplacePostsResult {
  data: PagedResponse<MarketplacePost>;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * Subscribe to the token store's hydration state. Returns `true` as soon
 * as `tokenStore.hydrate()` runs (module-load hydration guarantees this
 * is true on the very first render in the browser). SSR returns `true`
 * so queries don't pend forever on the server.
 *
 * Used to gate React Query fetches that depend on the persisted access
 * token — without this, the first request after a page reload could fire
 * BEFORE the token is restored from `localStorage`.
 */
function useAuthHydrated(): boolean {
  return React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.isHydrated(),
    () => true,
  );
}

/**
 * Load the marketplace post list for the given filters.
 *
 * Wraps the real `GET /api/posts` call behind a React Query so the
 * page gets caching, refetch-on-revalidate, and devtools support for free.
 * `placeholderData: keepPreviousData` keeps the previous page visible
 * while the next request is in flight (snappier feel than a full
 * skeleton on every filter change).
 *
 * The query is `enabled: isHydrated` so the first request never ships
 * without the persisted Bearer token (avoids a 401 on hard reload).
 */
export function useMarketplacePosts(
  filters: MarketplaceFilters = DEFAULT_FILTERS,
): UseMarketplacePostsResult {
  // `toMarketplaceQueryParams` strips `sort` (UI-only) and `all`-valued
  // sentinels so the cache key doesn't churn on cosmetic changes.
  const queryKey = queryKeys.marketplace.list(stableKeyFromFilters(filters));
  const hydrated = useAuthHydrated();

  const query = useQuery<PagedResponse<MarketplacePost>, Error>({
    queryKey,
    queryFn: ({ signal }) => fetchMarketplacePosts(filters, { signal }),
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

/**
 * Count of open briefs across the platform. Used by the marketplace hero
 * as a "live" stat — kept as a separate query so it has its own cache
 * lifetime (longer stale time is fine since it's a headline number).
 */
export function useOpenMarketplacePostCount(): number {
  const hydrated = useAuthHydrated();
  const { data } = useQuery<number, Error>({
    queryKey: queryKeys.marketplace.openCount(),
    queryFn: ({ signal }) => fetchOpenMarketplacePostCount({ signal }),
    staleTime: 60 * 1000,
    enabled: hydrated,
  });
  return data ?? 0;
}

// ---------------------------------------------------------------------------
// Helpers

/**
 * Build a stable object for the React Query key. Drops `undefined` values
 * and only includes fields that actually affect the server response —
 * `sort` is UI-only and intentionally excluded so toggling the dropdown
 * doesn't churn the cache when the backend doesn't honor it.
 */
function stableKeyFromFilters(
  filters: MarketplaceFilters,
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  if (filters.projectShopOwnerId != null) flat.projectShopOwnerId = filters.projectShopOwnerId;
  if (filters.serviceKind !== "all") flat.serviceKind = filters.serviceKind;
  if (filters.status !== "all") flat.status = filters.status;
  if (filters.query.trim()) flat.query = filters.query.trim();
  flat.pageNumber = filters.pageNumber;
  flat.pageSize = filters.pageSize;
  return flat;
}
