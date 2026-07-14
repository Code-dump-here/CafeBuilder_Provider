"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { tokenStore } from "@/lib/auth/token-store";

import {
  createEmptyProjectDetail,
  type ProjectDetail,
} from "./project-detail-types";
import { fetchProjectDetail } from "./project-detail-api";

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
// Hook result

export interface UseProjectDetailResult {
  /**
   * Normalized detail record from the API. `null` only when the query
   * has never resolved successfully OR was just freshly fired (during
   * the very first load). On any subsequent render — including after
   * an error — consumers should read `project` for a stable shape.
   */
  detail: ProjectDetail | null;
  /**
   * `ProjectDetail` view of the project. Always non-null: a stable
   * empty shell is returned before the first successful fetch so
   * consumers never have to optional-chain.
   */
  project: ProjectDetail;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Hook

/**
 * Load a single project's full detail from `GET /api/projects/{id}`.
 *
 * Behavior:
 *   - Reads the persisted Bearer access token from `tokenStore` (already
 *     attached by the axios interceptor — no manual header wiring needed).
 *   - Gated on `tokenStore.isHydrated()` so the first request after a hard
 *     reload doesn't race token hydration and ship without Authorization.
 *   - Returns a stable empty shell while loading so consumers never see
 *     `undefined`. Components opt into their own loading state via
 *     `isLoading` / `isError` rather than crashing on missing data.
 *
 * When `projectId` is empty (e.g. before `useParams` resolves), the query
 * is disabled and only the empty shell is returned.
 */
export function useProjectDetail(projectId: string): UseProjectDetailResult {
  const hydrated = useAuthHydrated();
  const trimmedId = projectId.trim();
  const enabled = hydrated && trimmedId.length > 0;

  const query = useQuery<ProjectDetail, Error>({
    queryKey: queryKeys.projects.detail(trimmedId || "unknown"),
    queryFn: ({ signal }) => fetchProjectDetail(trimmedId, { signal }),
    enabled,
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

  const detail = query.data ?? null;

  const project = React.useMemo<ProjectDetail>(() => {
    if (detail == null) return createEmptyProjectDetail();
    return detail;
  }, [detail]);

  return {
    detail,
    project,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}