"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { tokenStore } from "@/features/auth/token-store";
import { useCurrentUser } from "@/features/auth/user-context";

import { fetchMyProjectWorkings } from "./my-projects-api";
import type {
  MyProjectStatus,
  MyProjectWorking,
  MyProjectsQueryParams,
} from "./my-projects-types";
import type { PagedResponse } from "./marketplace-types";

// ---------------------------------------------------------------------------
// Default page response — used while the query is loading or hasn't yet
// resolved. Keeps `data.items` / `data.totalItems` accessible without
// optional-chaining everywhere.

const EMPTY_RESPONSE: PagedResponse<MyProjectWorking> = {
  items: [],
  pageNumber: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 1,
  hasPrevious: false,
  hasNext: false,
};

export interface UseMyProjectWorkingsResult {
  data: PagedResponse<MyProjectWorking>;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export interface UseMyProjectWorkingsOptions {
  pageNumber?: number;
  pageSize?: number;
  /** Override the auto-detected serviceProviderProfileId (mostly for tests). */
  serviceProviderProfileId?: number;
  /** Optional `project-workings` status filter (e.g. `requested`). */
  status?: MyProjectStatus;
}

/**
 * Subscribe to the token store's hydration state. Returns `true` as soon
 * as `tokenStore.hydrate()` runs. SSR returns `true` so queries don't
 * pend forever on the server.
 */
function useAuthHydrated(): boolean {
  return React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.isHydrated(),
    () => true,
  );
}

/**
 * Load the current provider's project-working list.
 *
 * Query key: `["myProjects", "list", serviceProviderProfileId, pageNumber, pageSize, status]`.
 * The `status` slot is the literal string `"all"` when no filter is
 * requested, so the all-seeing list and the `requested`-only list
 * never collide in the cache.
 *
 * Behavior:
 *   - Pulls `serviceProvider.id` from `useCurrentUser().account.serviceProvider`.
 *   - Defers the request until both (a) the auth store is hydrated and
 *     (b) the user's profile is loaded — without (b) we have no
 *     `serviceProviderProfileId` and the backend would 400.
 *   - `placeholderData: keepPreviousData` keeps the previous page visible
 *     while the next request is in flight (snappier than a full skeleton
 *     on every page change).
 */
export function useMyProjectWorkings(
  options: UseMyProjectWorkingsOptions = {},
): UseMyProjectWorkingsResult {
  const { pageNumber = 1, pageSize = 10, serviceProviderProfileId, status } = options;
  const hydrated = useAuthHydrated();
  const { account, isLoading: isAccountLoading } = useCurrentUser();

  const profileIdFromAuth = account?.serviceProvider?.id ?? null;
  const effectiveProfileId = serviceProviderProfileId ?? profileIdFromAuth;
  const enabled =
    hydrated && !isAccountLoading && typeof effectiveProfileId === "number" && effectiveProfileId > 0;

  const queryParams: MyProjectsQueryParams | null =
    typeof effectiveProfileId === "number" && effectiveProfileId > 0
      ? {
          serviceProviderProfileId: effectiveProfileId,
          pageNumber,
          pageSize,
          ...(status ? { status } : {}),
        }
      : null;

  const query = useQuery<PagedResponse<MyProjectWorking>, Error>({
    queryKey: queryParams
      ? queryKeys.myProjects.list(queryParams)
      : ["myProjects", "list", "pending"],
    queryFn: ({ signal }) => {
      if (!queryParams) {
        // Should never run — guarded by `enabled`. Return an empty page
        // so the query resolves cleanly if it ever does.
        return Promise.resolve(EMPTY_RESPONSE);
      }
      return fetchMyProjectWorkings(queryParams, { signal });
    },
    placeholderData: keepPreviousData,
    enabled,
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
