"use client";

import * as React from "react";
import {
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { tokenStore } from "@/features/auth/token-store";

import {
  fetchAiRecommendations,
  type PagedAiRecommendations,
} from "./ai-recommendations-api";

// ---------------------------------------------------------------------------
// Hydration gate
//
// The persisted Bearer access token is restored from `localStorage` at
// module-load time of `lib/auth/token-store`. On the very first render
// after a page reload, that hydration may not have happened yet — so we
// gate React Query on `tokenStore.isHydrated()` to guarantee the first
// outbound request ships with the Authorization header (no 401 round
// trip). Mirrors the pattern used by `useMarketplacePosts` and
// `useDesignBriefs`.

function useAuthHydrated(): boolean {
  return React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.isHydrated(),
    () => true,
  );
}

// ---------------------------------------------------------------------------
// Defaults

export const DEFAULT_AI_RECOMMENDATIONS_PAGE_SIZE = 10;
export const DEFAULT_AI_RECOMMENDATIONS_PAGE_NUMBER = 1;

// ---------------------------------------------------------------------------
// Empty page placeholder

const EMPTY_RESPONSE: PagedAiRecommendations = {
  items: [],
  pageNumber: DEFAULT_AI_RECOMMENDATIONS_PAGE_NUMBER,
  pageSize: DEFAULT_AI_RECOMMENDATIONS_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
  hasPrevious: false,
  hasNext: false,
};

// ---------------------------------------------------------------------------
// Hook result

export interface UseAiRecommendationsResult {
  data: PagedAiRecommendations;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Hook

export interface UseAiRecommendationsArgs {
  /**
   * Design brief id. Pass `null` (or `0`) while the brief is still
   * loading — the query is disabled in that case so we don't hit the
   * backend with a `briefId=0` placeholder request.
   */
  briefId: string | null;
  pageNumber?: number;
  pageSize?: number;
}

/**
 * Load the (paged) AI design recommendations for a single brief.
 *
 * Calls `GET /api/ai-recommendations?briefId={id}&pageNumber={n}&pageSize={m}`.
 * The shared `api` axios instance already attaches the Bearer access
 * token via the request interceptor — no manual header wiring needed.
 *
 * - Gated on `tokenStore.isHydrated()` so the first request after a
 *   hard reload doesn't race token hydration and ship without
 *   Authorization.
 * - Gated on a finite `briefId` so the query stays idle while the
 *   upstream `useDesignBriefs` is still loading.
 * - Returns a stable empty paged response while loading so consumers
 *   never have to optional-chain `data?.items`.
 * - Uses `keepPreviousData` so pagination feels smooth — previous
 *   page stays mounted while the next request is in flight.
 */
export function useAiRecommendations(
  args: UseAiRecommendationsArgs,
): UseAiRecommendationsResult {
  const {
    briefId,
    pageNumber = DEFAULT_AI_RECOMMENDATIONS_PAGE_NUMBER,
    pageSize = DEFAULT_AI_RECOMMENDATIONS_PAGE_SIZE,
  } = args;

  const hydrated = useAuthHydrated();
  const enabled =
    hydrated &&
    briefId != null &&
    briefId !== "";

  const query = useQuery<PagedAiRecommendations, Error>({
    queryKey: queryKeys.projects.aiRecommendations(briefId ?? "", {
      pageNumber,
      pageSize,
    }),
    queryFn: ({ signal }) =>
      fetchAiRecommendations(
        {
          briefId: briefId as string,
          pageNumber,
          pageSize,
        },
        { signal },
      ),
    enabled,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      // Don't retry 401/403/404 — surface them to the user immediately.
      const status =
        (error as Error & { response?: { status?: number } })?.response
          ?.status ?? undefined;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
    staleTime: 30_000,
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
