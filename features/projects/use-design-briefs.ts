"use client";

import * as React from "react";
import {
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { tokenStore } from "@/features/auth/token-store";

import {
  DEFAULT_DESIGN_BRIEFS_FILTERS,
  DEFAULT_DESIGN_BRIEFS_PAGE_SIZE,
} from "./design-brief-list-types";
import {
  fetchDesignBriefs,
  type PagedDesignBriefs,
} from "./design-briefs-api";

// ---------------------------------------------------------------------------
// Hydration gate
//
// The persisted Bearer access token is restored from `localStorage` at
// module-load time of `lib/auth/token-store`. On the very first render
// after a page reload, that hydration may not have happened yet — so we
// gate React Query on `tokenStore.isHydrated()` to guarantee the first
// outbound request ships with the Authorization header (no 401 round
// trip). Mirrors the pattern used by `useMarketplacePosts`.

function useAuthHydrated(): boolean {
  return React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.isHydrated(),
    () => true,
  );
}

// ---------------------------------------------------------------------------
// Empty page placeholder

const EMPTY_RESPONSE: PagedDesignBriefs = {
  items: [],
  pageNumber: DEFAULT_DESIGN_BRIEFS_FILTERS.pageNumber,
  pageSize: DEFAULT_DESIGN_BRIEFS_FILTERS.pageSize,
  totalItems: 0,
  totalPages: 1,
  hasPrevious: false,
  hasNext: false,
};

// ---------------------------------------------------------------------------
// Hook result

export interface UseDesignBriefsResult {
  data: PagedDesignBriefs;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Hook

export interface UseDesignBriefsArgs {
  /** Project id (string for URL parity — backend accepts numbers too). */
  projectId: string;
  /** Optional override for page number. Defaults to 1. */
  pageNumber?: number;
  /** Optional override for page size. Defaults to DEFAULT_DESIGN_BRIEFS_PAGE_SIZE. */
  pageSize?: number;
}

/**
 * Load the (paged) design briefs for a project.
 *
 * Calls `GET /api/design-briefs?projectId={id}&pageNumber={n}&pageSize={m}`.
 * The shared `api` axios instance already attaches the Bearer access token
 * via the request interceptor — no manual header wiring needed here.
 *
 * - Gated on `tokenStore.isHydrated()` so the first request after a hard
 *   reload doesn't race token hydration and ship without Authorization.
 * - Returns a stable empty paged response while loading so consumers
 *   never have to optional-chain `data?.items`.
 * - Uses `keepPreviousData` so pagination feels smooth — previous page
 *   stays mounted while the next request is in flight.
 *
 * When `projectId` is empty, the query is disabled and the empty
 * placeholder is returned.
 */
export function useDesignBriefs(
  args: UseDesignBriefsArgs,
): UseDesignBriefsResult {
  const {
    projectId,
    pageNumber = DEFAULT_DESIGN_BRIEFS_FILTERS.pageNumber,
    pageSize = DEFAULT_DESIGN_BRIEFS_PAGE_SIZE,
  } = args;

  const hydrated = useAuthHydrated();
  const trimmedId = projectId.trim();
  // A uuid is usable when it is simply non-empty — there is nothing numeric
  // left to validate.
  const hasValidProjectId = trimmedId.length > 0;
  const enabled = hydrated && hasValidProjectId;

  const query = useQuery<PagedDesignBriefs, Error>({
    queryKey: queryKeys.projects.designBriefs(trimmedId || "unknown", {
      pageNumber,
      pageSize,
    }),
    queryFn: ({ signal }) =>
      fetchDesignBriefs(
        {
          projectId: trimmedId,
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
