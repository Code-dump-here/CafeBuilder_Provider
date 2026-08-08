"use client";

import * as React from "react";
import {
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { tokenStore } from "@/features/auth/token-store";

import {
  getDesignVersionApi,
  getDesignVersionsApi,
} from "./design-api";
import type {
  DesignVersionSnapshot,
  DesignVersionSnapshotPage,
} from "./design-version-types";

// ─── Constants ──────────────────────────────────────────────────────────────

export const DEFAULT_DESIGN_VERSIONS_PAGE_NUMBER = 1;
export const DEFAULT_DESIGN_VERSIONS_PAGE_SIZE = 20;

// ─── Empty placeholder ──────────────────────────────────────────────────────
//
// Stable shape so consumers never need to optional-chain
// `data?.items` while the first request is in flight.

const EMPTY_PAGE: DesignVersionSnapshotPage = {
  items: [],
  pageNumber: DEFAULT_DESIGN_VERSIONS_PAGE_NUMBER,
  pageSize: DEFAULT_DESIGN_VERSIONS_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
  hasPrevious: false,
  hasNext: false,
};

// ─── Hydration gate ─────────────────────────────────────────────────────────
//
// Mirrors the pattern used by `useMarketplacePosts` / `useConversations`.
// We don't ship the first outbound request until `tokenStore` is
// hydrated — otherwise the very first query after a hard reload could
// race the token-store restore and ship without Authorization.

function useAuthHydrated(): boolean {
  return React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.isHydrated(),
    () => true,
  );
}

// ─── List snapshots ─────────────────────────────────────────────────────────

export interface UseDesignVersionsOptions {
  designId: number | null;
  pageNumber?: number;
  pageSize?: number;
  /** Skip the fetch (used when the design hasn't loaded yet). */
  enabled?: boolean;
}

export interface UseDesignVersionsResult {
  data: DesignVersionSnapshotPage;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * Subscribe to the full-history snapshot list for a single design.
 *
 * Endpoint: `GET /api/designs/{id}/versions?pageNumber=&pageSize=`
 *
 * Pages are returned sorted `snapshottedAt DESC` (newest first). Use
 * `pageNumber` / `pageSize` for the timeline pager; the page size
 * defaults to 20 to keep the panel light even for designs that have
 * gone through many revisions.
 *
 * Invalidation target after every submit / approve / request-revision /
 * start-revision mutation — `invalidateQueries(["designs", ...])` is
 * already wired in `use-designs.ts`, and we listen for the same key.
 */
export function useDesignVersions(
  options: UseDesignVersionsOptions,
): UseDesignVersionsResult {
  const {
    designId,
    pageNumber = DEFAULT_DESIGN_VERSIONS_PAGE_NUMBER,
    pageSize = DEFAULT_DESIGN_VERSIONS_PAGE_SIZE,
    enabled = true,
  } = options;

  const hydrated = useAuthHydrated();
  const hasDesignId = typeof designId === "number" && Number.isFinite(designId);

  const query = useQuery<DesignVersionSnapshotPage, Error>({
    queryKey: hasDesignId
      ? queryKeys.designs.versions(designId, {
          pageNumber,
          pageSize,
        })
      : ["designs", "versions", "pending", pageNumber, pageSize],
    queryFn: ({ signal }) => {
      if (!hasDesignId) return Promise.resolve(EMPTY_PAGE);
      return getDesignVersionsApi(
        { designId, pageNumber, pageSize },
        { signal },
      );
    },
    enabled: hydrated && enabled && hasDesignId,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      // Don't retry auth / not-found errors — surface them immediately.
      const status =
        (error as Error & { status?: number }).status ?? undefined;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
    staleTime: 30_000,
  });

  return {
    data: query.data ?? EMPTY_PAGE,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Single snapshot detail ─────────────────────────────────────────────────

export interface UseDesignVersionSnapshotOptions {
  designId: number | null;
  versionId: number | null;
  enabled?: boolean;
}

export interface UseDesignVersionSnapshotResult {
  snapshot: DesignVersionSnapshot | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * Subscribe to a single snapshot's detail (used by the "view images as
 * they were at submission X" affordance on the design detail page).
 *
 * Endpoint: `GET /api/designs/{id}/versions/{versionId}`
 */
export function useDesignVersionSnapshot(
  options: UseDesignVersionSnapshotOptions,
): UseDesignVersionSnapshotResult {
  const { designId, versionId, enabled = true } = options;
  const hydrated = useAuthHydrated();
  const enabledNow =
    hydrated &&
    enabled &&
    typeof designId === "number" &&
    Number.isFinite(designId) &&
    typeof versionId === "number" &&
    Number.isFinite(versionId);

  const query = useQuery<DesignVersionSnapshot, Error>({
    queryKey:
      designId != null && versionId != null
        ? queryKeys.designs.versionSnapshot(designId, versionId)
        : ["designs", "versionSnapshot", "pending"],
    queryFn: ({ signal }) => {
      if (designId == null || versionId == null) {
        return Promise.reject(new Error("designId/versionId required"));
      }
      return getDesignVersionApi(designId, versionId, { signal });
    },
    enabled: enabledNow,
    staleTime: 30_000,
  });

  return {
    snapshot: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
