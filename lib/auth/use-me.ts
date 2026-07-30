"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { tokenStore } from "@/lib/auth/token-store";
import { queryKeys } from "@/lib/react-query/keys";
import type { NormalizedAccount } from "@/lib/auth/auth-me-types";
import { fetchMe } from "@/lib/auth/auth-me-api";

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
  const queryClient = useQueryClient();

  // Subscribe to tokenStore changes to re-evaluate the query
  const hydrated = useAuthHydrated();
  const hasToken = React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.hasAccessToken(),
    () => false, // SSR: assume no token
  );

  // Force re-render when token changes so `enabled` re-evaluates
  // and the query fires after login/logout.
  const [, setTokenVersion] = React.useState(0);
  React.useEffect(() => {
    const unsubscribe = tokenStore.subscribe(() => {
      setTokenVersion((v) => v + 1);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const query = useQuery<NormalizedAccount, Error>({
    queryKey: ["auth", "me"],
    queryFn: ({ signal }) => fetchMe({ signal }),
    enabled: hydrated && hasToken,
    staleTime: 5 * 60 * 1000, // 5 minutes — account data rarely changes
  });

  // Sync full account data to auth session cache on success
  React.useEffect(() => {
    if (query.data) {
      queryClient.setQueryData(queryKeys.auth.account(), {
        accountId: query.data.id,
        email: query.data.email,
        role: query.data.role,
      });
    }
  }, [query.data, queryClient]);

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
