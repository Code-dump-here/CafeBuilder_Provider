"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tokenStore } from "./token-store";
import { authEvents } from "./auth-events";
import { queryKeys } from "@/lib/react-query/keys";

import {
  loginApi,
  logoutApi,
  refreshSession,
  registerApi,
  sendOtpApi,
  verifyOtpApi,
  type Account,
  type AuthSession,
  type LoginPayload,
  type RegisterPayload,
  type SendOtpPayload,
  type VerifyOtpPayload,
} from "./api";

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation<AuthSession, Error, LoginPayload>({
    mutationFn: (payload) => loginApi(payload),
    onSuccess: (response) => {
      if (
        typeof response !== "object" ||
        response === null ||
        typeof response.accessToken !== "string" ||
        typeof response.refreshToken !== "string"
      ) {
        // Surface a backend response-shape mismatch loudly. The most
        // common cause: backend returns `{ token, refreshToken }` (or
        // `{ data: { accessToken } }`) but `AuthSession` expects
        // `{ accessToken, refreshToken }` flat.
        const err = new Error(
          `Login response did not include accessToken / refreshToken. ` +
            `Got keys: ${Object.keys(response ?? {}).join(", ")}`,
        );
        console.error("[auth/login] Unexpected response shape", response);
        throw err;
      }
      tokenStore.setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      authEvents.clearExpiredFlag();
      const account: Account = {
        accountId: response.accountId,
        email: response.email,
        role: response.role,
      };
      queryClient.setQueryData(queryKeys.auth.account(), account);
    },
  });
}

/**
 * Create a new account via `POST /api/auth/register`. The endpoint is
 * public, so callers may or may not already be logged in.
 *
 * On success the new account's tokens replace whatever was in the store so
 * the caller is now logged in AS the new user. This matches the contract
 * where the backend returns a fresh `AuthSession` for the created account.
 * If you need to keep the original caller logged in instead (e.g. admin
 * provisioning), override `onSuccess` at the call site — do not call
 * `setTokens` there.
 */
export function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation<AuthSession, Error, RegisterPayload>({
    mutationFn: (payload) => registerApi(payload),
    onSuccess: (response) => {
      if (
        typeof response !== "object" ||
        response === null ||
        typeof response.accessToken !== "string" ||
        typeof response.refreshToken !== "string"
      ) {
        const err = new Error(
          `Register response did not include accessToken / refreshToken. ` +
            `Got keys: ${Object.keys(response ?? {}).join(", ")}`,
        );
        console.error("[auth/register] Unexpected response shape", response);
        throw err;
      }
      tokenStore.setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      authEvents.clearExpiredFlag();
      queryClient.setQueryData(queryKeys.auth.account(), {
        accountId: response.accountId,
        email: response.email,
        role: response.role,
      });
    },
  });
}

/**
 * Force a refresh outside of the auto-refresh interceptor. Useful when the
 * UI wants to renew the session proactively (e.g. long-running screens).
 * Returns the new session, or `null` when no refresh token is stored.
 */
export function useRefreshSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation<AuthSession | null, Error, void>({
    mutationFn: () => refreshSession(),
    onSuccess: (session) => {
      if (!session) return;
      queryClient.setQueryData(queryKeys.auth.account(), {
        accountId: session.accountId,
        email: session.email,
        role: session.role,
      });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () => logoutApi(),
    onSuccess: () => {
      // `logoutApi` already cleared the local token store on success.
      queryClient.removeQueries({ queryKey: ["auth"] });
    },
  });
}

export function useSendOtpMutation() {
  return useMutation<void, Error, SendOtpPayload>({
    mutationFn: (payload) => sendOtpApi(payload),
  });
}

export function useVerifyOtpMutation() {
  return useMutation<void, Error, VerifyOtpPayload>({
    mutationFn: (payload) => verifyOtpApi(payload),
  });
}

// ─── Convenience ────────────────────────────────────────────────────────────

/**
 * Subscribe to the in-memory access token. Returns `null` during SSR — the
 * token store lives only in the browser. Components that need the token in
 * rendered output must guard against the `null` case.
 */
export function useAccessToken(): string | null {
  return React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.getAccessToken(),
    () => null,
  );
}

/**
 * Snapshot of the current auth state for UI gating (e.g. "hide Sign In
 * button when already logged in").
 *
 * - `account` is the cached `AccountSummary` written by
 *   `useLoginMutation` / `useRegisterMutation` (kept in React Query's
 *   `queryKeys.auth.account` cache). `null` when not cached.
 * - `isAuthenticated` is `true` once the token store has been hydrated
 *   AND a non-empty access token exists in `localStorage`.
 * - `isHydrated` is `true` once the token store has re-read its persisted
 *   state from `localStorage` at least once on this page load. Use this
 *   to gate rendering of auth-dependent UI and avoid an SSR/CSR flicker
 *   (server has no `localStorage`, client does).
 */
export interface AuthSessionSnapshot {
  account: Account | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

export function useAuthSession(): AuthSessionSnapshot {
  const queryClient = useQueryClient();
  // Server-side: pretend hydration has already happened with no token, so
  // SSR markup matches the client's "logged-out" baseline and React
  // doesn't warn about hydration mismatches.
  const isHydrated = React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.isHydrated(),
    () => true,
  );
  const hasAccessToken = React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.hasAccessToken(),
    () => false,
  );

  // Re-read the cached account whenever the token changes (login/logout)
  // so the UI flips in lockstep with the auth state.
  const account = React.useMemo<Account | null>(() => {
    if (!hasAccessToken) return null;
    return (queryClient.getQueryData(queryKeys.auth.account()) ??
      null) as Account | null;
  }, [queryClient, hasAccessToken]);

  return {
    account,
    isAuthenticated: hasAccessToken,
    isHydrated,
  };
}
