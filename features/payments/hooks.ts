"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { tokenStore } from "@/features/auth/token-store";

import {
  cancelPaymentApi,
  createSubscriptionApi,
  fetchPaymentPlansApi,
  fetchPaymentStatusApi,
  type CreatePaymentResponse,
  type CreateSubscriptionPayload,
  type PaymentPlan,
  type PaymentStatusResponse,
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
 * POST /api/payments/subscriptions — mint a payOS checkout link.
 *
 * Deliberately does NOT touch `auth.me`: at this point nothing has been paid.
 * The server has a `pending` subscription and a payment link, and the account
 * gains an entitlement only after payOS calls the webhook. Refetching the
 * account here would just re-read the same unpaid state a moment before the
 * browser leaves for the checkout — the refresh that matters happens on the
 * return page, once the transaction is final.
 */
export function useCreateSubscriptionMutation() {
  return useMutation<
    CreatePaymentResponse,
    Error,
    CreateSubscriptionPayload
  >({
    mutationFn: (payload) => createSubscriptionApi(payload),
  });
}

/**
 * POST /api/payments/cancel — used by the cancel landing page.
 *
 * Idempotent server-side, so a refresh of that page is harmless.
 */
export function useCancelPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (orderCode) => cancelPaymentApi(orderCode),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}

// ─── Status polling ─────────────────────────────────────────────────────────

export interface UsePaymentStatusResult {
  status: PaymentStatusResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  /** `true` while we are still waiting for payOS's webhook to land. */
  isSettling: boolean;
}

/**
 * Poll `GET /api/payments/status` until the transaction reaches a final
 * state, for the page payOS redirects back to.
 *
 * Polling — rather than trusting the `status=PAID` payOS puts in the return
 * URL — is the whole point: those query parameters come from the user's own
 * browser and can be typed by hand, whereas the transaction is settled by the
 * server-to-server webhook. The client asks the server what happened.
 *
 * `refetchInterval` returns `false` once `isFinal` flips, which stops the
 * timer; the 5s cadence and the auth gate mirror the Flutter client's
 * `PaymentService.pollStatus`.
 */
export function usePaymentStatusQuery(
  orderCode: number | null,
): UsePaymentStatusResult {
  const hydrated = useAuthHydrated();

  const query = useQuery<PaymentStatusResponse, Error>({
    queryKey: queryKeys.payments.status(orderCode),
    queryFn: ({ signal }) =>
      fetchPaymentStatusApi({ orderCode: orderCode as number }, { signal }),
    enabled: hydrated && orderCode !== null,
    refetchInterval: (query) =>
      query.state.data?.isFinal === true ? false : 5000,
    // A transaction's outcome is not something to serve from cache on a
    // remount — always ask.
    staleTime: 0,
    retry: 1,
  });

  return {
    status: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSettling: query.data !== undefined && !query.data.isFinal,
  };
}