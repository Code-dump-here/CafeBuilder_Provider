// Re-export types from http/auth for convenience
export type {
  UserRole,
  ServiceKind,
  AuthTokens,
  AuthSession,
  LoginPayload,
  RegisterPayload,
  RefreshPayload,
  SendOtpPayload,
  VerifyOtpPayload,
} from "@/lib/http/auth";

// Alias AccountSummary as Account (lightweight account info without tokens)
// AccountSummary has: { accountId, email, role }
export type { AccountSummary as Account } from "@/lib/http/auth";

// Auth API functions
export {
  loginApi,
  registerApi,
  sendOtpApi,
  verifyOtpApi,
} from "@/lib/http/auth";

import { tokenStore } from "./token-store";
import type { RequestConfig } from "@/lib/http/types";
import type { AuthSession } from "@/lib/http/auth";

export type LoginResponse = AuthSession;

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
  const { refreshTokenApi } = await import("@/lib/http/auth");
  return refreshTokenApi(refreshToken, config);
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
    const { logoutApi: httpLogoutApi } = await import("@/lib/http/auth");
    await httpLogoutApi(refreshToken ?? "", config);
  } finally {
    tokenStore.clear();
  }
}
