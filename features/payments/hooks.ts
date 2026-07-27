"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { tokenStore } from "@/lib/auth/token-store";

import {
  createSubscriptionApi,
  fetchPaymentPlansApi,
  type CreateSubscriptionPayload,
  type PaymentPlan,
  type SubscriptionCreated,
} from "./api";

/**
 * Subscribe to the token store's hydration state. Returns `true` once
 * `tokenStore.hydrate()` has run. SSR returns `true` so the query
 * doesn't pend forever on the server.
 */
function useAuthHydrated(): boolean {
  return React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.isHydrated(),
    () => true,
  );
}

export interface UsePaymentPlansResult {
  plans: PaymentPlan[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * Fetch the catalogue of plans from `GET /api/payments/plans`.
 *
 * Plans are public-ish (the marketing site surfaces them on the pricing
 * page even for guests), so we don't gate on `hasAccessToken`. The query
 * is enabled as soon as the token store is hydrated so we don't issue a
 * request during SSR's first render before localStorage is read.
 *
 * `staleTime` is generous: the catalogue is curated server-side and
 * changes infrequently. We avoid refetching on focus so navigating
 * between `/pricing` and `/profile` doesn't refire the request.
 */
export function usePaymentPlansQuery(): UsePaymentPlansResult {
  const hydrated = useAuthHydrated();

  const query = useQuery<PaymentPlan[], Error>({
    queryKey: queryKeys.payments.plans(),
    queryFn: ({ signal }) => fetchPaymentPlansApi({ signal }),
    enabled: hydrated,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    plans: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * POST /api/payments/subscriptions — start a new subscription.
 *
 * On success we invalidate `auth.me` so any UI that derives a
 * subscriber's plan / expiry from the account payload (e.g. a future
 * "Your current plan" pill in the sidebar) gets the fresh record.
 * We `await` the refetch for parity with the create-profile mutation:
 * the toast claims "subscription started", and the user shouldn't see
 * stale plan data when they navigate away.
 *
 * No specific query-key fan-out yet — the per-user subscription list
 * isn't a separate query today. When that screen ships, add a
 * `queryKeys.payments.subscriptions()` key and invalidate it here.
 */
export function useCreateSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    SubscriptionCreated,
    Error,
    CreateSubscriptionPayload
  >({
    mutationFn: (payload) => createSubscriptionApi(payload),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: queryKeys.auth.me() });
      await queryClient.refetchQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}