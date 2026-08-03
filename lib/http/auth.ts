import { api } from "./axios";
import type { RequestConfig } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Roles used everywhere — both for reading (`AuthSession.role`,
 * `AccountSummary.role`) and for writing (`RegisterPayload.role`). The
 * backend wire format is the lowercase string name (e.g. `"owner"`).
 */
export type UserRole = "owner" | "provider" | "admin";

/**
 * Sub-classification for provider accounts. Only meaningful when
 * `UserRole` is `"provider"` — backend uses it to know whether the new
 * account represents a design studio, a construction firm, or both.
 */
export type ServiceKind = "design" | "construction" | "both";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AccountSummary = {
  accountId: number;
  email: string;
  role: UserRole;
};

export type AuthSession = AuthTokens & AccountSummary;

export type LoginPayload = {
  email: string;
  password: string;
};

export type RefreshPayload = {
  refreshToken: string;
};

/**
 * POST /api/auth/register body. `role` is the lowercase string name
 * (`"owner"` / `"provider"` / `"admin"`) — same shape the server returns
 * in `AuthSession.role`. `serviceKind` is optional — only sent when role
 * is `"provider"`. `fullName` is optional because backend doesn't echo
 * it in the response shape we have, so callers may not yet need to send
 * it. Phone is mandatory.
 */
export type RegisterPayload = {
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  fullName?: string;
  serviceKind?: ServiceKind;
};

// ─── Endpoints ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login — exchange credentials for an auth session.
 *
 * `skipAuth: true` because the caller has no access token yet. Backend
 * returns a flat JSON object (not the `{ data }` envelope), so we read
 * `response.data` directly.
 */
export async function loginApi(
  payload: LoginPayload,
  config?: RequestConfig,
): Promise<AuthSession> {
  const response = await api.post<AuthSession>(
    "/api/auth/login",
    payload,
    { skipAuth: true, ...config },
  );
  return response.data;
}

/**
 * POST /api/auth/refresh — exchange a refresh token for a new session.
 *
 * `skipAuth: true` because the caller is requesting a fresh access token
 * precisely because the previous one is missing or expired.
 */
export async function refreshTokenApi(
  refreshToken: string,
  config?: RequestConfig,
): Promise<AuthSession> {
  const response = await api.post<AuthSession>(
    "/api/auth/refresh",
    { refreshToken } satisfies RefreshPayload,
    { skipAuth: true, ...config },
  );
  return response.data;
}

/**
 * POST /api/auth/logout — invalidate the refresh token server-side.
 *
 * `skipRefresh: true` so a 401 here can never trigger another refresh
 * attempt (the session is being torn down on purpose).
 *
 * The caller is expected to clear the local token store themselves
 * after a successful logout — this helper does NOT touch storage so it
 * stays usable from contexts where storage has already been wiped.
 */
export async function logoutApi(
  refreshToken: string,
  config?: RequestConfig,
): Promise<void> {
  await api.post<void>(
    "/api/auth/logout",
    { refreshToken } satisfies RefreshPayload,
    { skipRefresh: true, ...config },
  );
}

/**
 * POST /api/auth/register — create a new account.
 *
 * This is a PUBLIC endpoint — the caller does NOT need an existing session.
 * `skipAuth: true` so the request interceptor won't try to attach a Bearer
 * token (and the auto-refresh interceptor won't act on 401 either).
 *
 * On success the server returns a fresh `AuthSession` for the newly-created
 * account. Callers can choose to:
 *  - Discard the session and redirect to `/login` (admin provisioning flow).
 *  - Persist the session, logging the caller in as the new user
 *    (self-service registration flow — the default in `useRegisterMutation`).
 */
export async function registerApi(
  payload: RegisterPayload,
  config?: RequestConfig,
): Promise<AuthSession> {
  const response = await api.post<AuthSession>(
    "/api/auth/register",
    payload,
    { skipAuth: true, ...config },
  );
  return response.data;
}

// ─── OTP ─────────────────────────────────────────────────────────────────────

export type SendOtpPayload = {
  email: string;
};

export async function sendOtpApi(
  payload: SendOtpPayload,
  config?: RequestConfig,
): Promise<void> {
  await api.post<void>("/api/otp/send", payload, {
    skipAuth: true,
    ...config,
  });
}

export type VerifyOtpPayload = {
  email: string;
  code: string;
};

export async function verifyOtpApi(
  payload: VerifyOtpPayload,
  config?: RequestConfig,
): Promise<void> {
  await api.post<void>("/api/otp/verify", payload, {
    skipAuth: true,
    ...config,
  });
}