import {
  AccountRoleId,
  loginApi as loginApiHttp,
  logoutApi as logoutApiHttp,
  refreshTokenApi as refreshTokenApiHttp,
  registerApi as registerApiHttp,
  type AccountRoleIdValue,
  type AccountSummary,
  type AuthSession,
  type LoginPayload,
  type RegisterPayload,
  type ServiceKind,
  type UserRole,
} from "@/lib/http/auth";
import type { RequestConfig } from "@/lib/http/types";
import { tokenStore } from "@/lib/auth/token-store";

// ─── Types ───────────────────────────────────────────────────────────────────

export type {
  UserRole,
  AuthSession,
  LoginPayload,
  AccountSummary,
  RegisterPayload,
  AccountRoleIdValue,
  ServiceKind,
};

export { AccountRoleId };

export type Account = AccountSummary;

export type LoginResponse = AuthSession;

// ─── Auth API ────────────────────────────────────────────────────────────────

export const loginApi = loginApiHttp;

export const registerApi = registerApiHttp;

/**
 * Outbound wrapper that pulls `refreshToken` from local storage before
 * delegating to the HTTP layer. If no refresh token is stored, this is a
 * no-op (returns `null`) so callers can treat it as "session gone".
 */
export async function refreshSession(
  config?: RequestConfig,
): Promise<AuthSession | null> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return null;
  return refreshTokenApiHttp(refreshToken, config);
}

export type LogoutOptions = {
  /**
   * Force the server logout even when we have no refresh token locally.
   * Default `false`: a missing refresh token short-circuits the call.
   */
  force?: boolean;
};

/**
 * Outbound wrapper that forwards `refreshToken` to the HTTP layer and
 * clears local credentials on success. Failure modes are not retried
 * here — callers (e.g. `useLogoutMutation`) decide how to react.
 */
export async function logoutApi(
  options: LogoutOptions = {},
  config?: RequestConfig,
): Promise<void> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken && !options.force) {
    tokenStore.clear();
    return;
  }
  try {
    await logoutApiHttp(refreshToken ?? "", config);
  } finally {
    tokenStore.clear();
  }
}