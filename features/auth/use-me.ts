"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { tokenStore } from "./token-store";
import type { NormalizedAccount } from "./auth-me-types";
import { fetchMe } from "./auth-me-api";

/**
 * Subscribe to the token store's hydration state. Returns `true` as soon
 * as `tokenStore.hydrate()` runs. SSR returns `true` so queries don't
 * pend forever on the server.
 */
function useAuthHydrated(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.isHydrated(),
    () => true,
  );
}

export interface UseMeResult {
  data: NormalizedAccount | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * Fetch the currently authenticated account with profile.
 *
 * Returns `null` for `data` while loading, allowing consumers to distinguish
 * loading from unauthenticated states (where the query returns `null`).
 *
 * The query is `enabled: hydrated && hasToken` so it only fires when
 * a valid token is present. We subscribe to tokenStore to re-evaluate
 * when tokens change (login/logout).
 */
export function useMe(): UseMeResult {
  // Subscribe to tokenStore changes to re-evaluate the query
  const hydrated = useAuthHydrated();
  const hasToken = React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.hasAccessToken(),
    () => false, // SSR: assume no token
  );

  // The two `useSyncExternalStore` subscriptions above already re-render
  // this hook whenever the token store changes, which is what makes
  // `enabled` re-evaluate after login/logout. A third subscription driving
  // a counter was doing the same job twice.

  const query = useQuery<NormalizedAccount, Error>({
    queryKey: ["auth", "me"],
    queryFn: ({ signal }) => fetchMe({ signal }),
    enabled: hydrated && hasToken,
    staleTime: 5 * 60 * 1000, // 5 minutes — account data rarely changes
  });

  // No mirroring into a second cache: `useAuthSession` now derives its
  // summary from this query directly, so there's nothing to keep in step.

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
