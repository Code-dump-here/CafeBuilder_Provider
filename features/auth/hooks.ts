"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tokenStore } from "./token-store";
import { authEvents } from "./auth-events";
import { useMe } from "./use-me";

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
      // Identity lives in one place: the `/auth/me` query. Mirroring a
      // second, smaller copy here meant two caches that could disagree —
      // and the one screens actually read was the one nothing refreshed.
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
    },
  });
}

/**
 * Force a refresh outside of the auto-refresh interceptor. Useful when the
 * UI wants to renew the session proactively (e.g. long-running screens).
 * Returns the new session, or `null` when no refresh token is stored.
 */
export function useRefreshSessionMutation() {

  return useMutation<AuthSession | null, Error, void>({
    mutationFn: () => refreshSession(),
    onSuccess: (session) => {
      if (!session) return;
      // Tokens are already refreshed by `refreshSession()`; `/auth/me` is
      // unchanged by a token rotation, so there's nothing to write here.
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
 * - `account` is derived from the `/auth/me` query — the single source of
 *   truth for identity. `null` until it resolves.
 * - `isAuthenticated` is `true` once the token store has been hydrated
 *   AND a non-empty access token exists in `localStorage`.
 * - `isHydrated` is `true` once the token store has re-read its persisted
 *   state from `localStorage` at least once on this page load. Use this
 *   to gate rendering of auth-dependent UI and avoid an SSR/CSR flicker
 *   (server has no `localStorage`, client does).
 *
 * This used to read a second, login-populated cache with
 * `queryClient.getQueryData(...)` inside a `useMemo` keyed on
 * `[queryClient, hasAccessToken]`. `getQueryData` is a one-shot read, not a
 * subscription, so the memo never re-ran when that cache was filled later:
 * on login the token flipped first, the memo ran against an empty cache,
 * `/auth/me` resolved afterwards, and nothing re-rendered. `account` stayed
 * `null` for the rest of the page's life — which is why anything built on
 * `useIsProjectOwner` (the owner, members and apply cards) rendered as if
 * signed out until a manual refresh.
 */
export interface AuthSessionSnapshot {
  account: Account | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

export function useAuthSession(): AuthSessionSnapshot {
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

  // Derived from the live `/auth/me` query, so it updates the moment that
  // query resolves instead of being sampled once.
  const { data: me } = useMe();
  const account = React.useMemo<Account | null>(() => {
    if (!hasAccessToken || !me) return null;
    return { accountId: me.id, email: me.email, role: me.role };
  }, [hasAccessToken, me]);

  return {
    account,
    isAuthenticated: hasAccessToken,
    isHydrated,
  };
}
