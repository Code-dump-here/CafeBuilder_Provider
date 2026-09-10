import axios, { AxiosHeaders, type AxiosError, type AxiosResponse } from "axios";
import { env } from "../env";

// Trigger the token-store hydrate side-effect as soon as `axios.ts` is
// imported. `features/auth/token-store.ts` reads the persisted access + refresh
// tokens from `localStorage` at module evaluation time, populating the
// in-memory cache BEFORE the first React render commits. This is what
// guarantees the first request after a page reload ships with a Bearer
// header (no 401 false-positives on cold load).
import "@/features/auth/token-store";

// We deliberately do NOT import `./interceptors` here — that would create
// a circular import (`interceptors.ts` imports `api` from `./axios`).
// Instead, see `attachApiInterceptors(api)` below: the same setup logic is
// called synchronously after `api` is created.
import { tokenStore } from "@/features/auth/token-store";
import { authEvents } from "@/features/auth/auth-events";
import { normalizeAxiosError } from "./errors";
import { refreshAccessToken } from "./refresh-token";
import { isJwtExpiredOrExpiring, secondsUntilExpiry } from "@/features/auth/jwt";
import type { ApiErrorPayload, RetryableAxiosRequestConfig } from "./types";

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.requestTimeoutMs,
  // withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  transitional: {
    clarifyTimeoutError: true,
  },
});

// ─── Interceptor setup ───────────────────────────────────────────────────────
//
// We attach request / response interceptors RIGHT HERE — not in a separate
// module — because:
//   1. Any file in the app imports `api` (directly or transitively).
//      Module-load evaluation of `axios.ts` therefore runs very early in
//      the client bundle. Doing the setup here means by the time React
//      commits and the first `useQuery` fires, interceptors are guaranteed
//      to be in place.
//   2. We avoid a circular import: previously `axios.ts` imported
//      `./interceptors`, and `./interceptors` imported `api` from
//      `./axios` → on module load `api` was in the TDZ and the bundle
//      crashed with `Cannot access 'api' before initialization`.
//   3. Server imports are harmless: `api.interceptors` exists in Node too,
//      and our handlers gate on `typeof window` / `window`-touching logic
//      where needed.

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function setAuthHeader(
  config: RetryableAxiosRequestConfig,
  value: string,
): void {
  const incoming = config.headers;
  let headers: AxiosHeaders;
  if (incoming instanceof AxiosHeaders) {
    headers = incoming;
  } else {
    headers = AxiosHeaders.from(
      (incoming ?? {}) as unknown as Parameters<typeof AxiosHeaders.from>[0],
    );
  }
  headers.set("Authorization", value);
  config.headers = headers as RetryableAxiosRequestConfig["headers"];
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * How close to `exp` we want to be before proactively refreshing the access
 * token in the request interceptor. Larger = fewer requests sent with a
 * just-expired token (and thus fewer visible 401 round trips), at the cost
 * of more frequent refresh traffic when the user is actively using the app.
 *
 * 60s is the conventional sweet spot for short-lived access tokens (5-15
 * minute lifetimes).
 */
const JWT_EXPIRY_SAFETY_WINDOW_SECONDS = 60;

/**
 * `true` when the access token we currently hold is present and has NOT yet
 * expired — i.e. the credential we just sent was still good.
 *
 * This is what lets the response interceptor tell apart the two very
 * different things this backend answers with 401:
 *
 *   1. "your session is gone" — a genuine authentication failure, written by
 *      the JwtBearer challenge handler. Refreshing is the right move.
 *   2. "you may not see this" — an authorization refusal. The backend maps
 *      `UnauthorizedAccessException` -> 401 for every ownership check, where
 *      HTTP says 403 (see the exception table in the backend's CLAUDE.md).
 *      Refreshing here is worse than pointless: it rotates — and thereby
 *      burns — a perfectly good refresh token, fires a duplicate request that
 *      is refused all over again, and if that refresh ever fails it logs the
 *      user out for opening a URL they simply weren't allowed to see.
 *
 * A token with no parseable `exp` returns `false`: we cannot tell what state
 * it is in, so we keep the old behaviour and let the refresh attempt decide.
 *
 * Known trade-off: if the client clock runs behind the server's, a genuinely
 * expired token can still look valid here and we will skip the refresh. That
 * same skew already defeats the proactive refresh in the request interceptor
 * above, so this does not introduce a new failure mode.
 */
function accessTokenStillValid(): boolean {
  const token = tokenStore.getAccessToken();
  if (typeof token !== "string" || token.length === 0) return false;
  const remaining = secondsUntilExpiry(token);
  if (remaining === null) return false;
  return remaining > 0;
}

let interceptorsAttached = false;

function attachApiInterceptors(): void {
  if (interceptorsAttached) return;
  interceptorsAttached = true;

  api.interceptors.request.use(async (config) => {
    const mutableConfig = config as RetryableAxiosRequestConfig;

    mutableConfig.headers = mutableConfig.headers ?? new AxiosHeaders();
    const headers = mutableConfig.headers as AxiosHeaders;
    if (!headers.has("x-request-id")) {
      headers.set(
        "x-request-id",
        mutableConfig.requestId ?? createRequestId(),
      );
    }

    // Skip the Authorization header for explicitly opt-out requests
    // (login / register / refresh / logout).
    if (!mutableConfig.skipAuth) {
      let accessToken = tokenStore.getAccessToken();

      // Proactive refresh: if the access token is already expired OR will
      // expire within `JWT_EXPIRY_SAFETY_WINDOW_SECONDS`, hit the refresh
      // endpoint BEFORE sending. This eliminates the "page reload after
      // long idle" → "first request 401s, then retries" round trip that
      // would otherwise flash a 401 to the user.
      //
      // `refreshAccessToken()` is deduped across concurrent callers via a
      // module-level promise cache, so even if 10 requests fire in parallel
      // at app start, only ONE /auth/refresh hits the server.
      if (
        accessToken &&
        typeof accessToken === "string" &&
        isJwtExpiredOrExpiring(
          accessToken,
          JWT_EXPIRY_SAFETY_WINDOW_SECONDS,
        )
      ) {
        const fresh = await refreshAccessToken();
        if (fresh) {
          accessToken = fresh;
        } else {
          // Refresh failed — clear the store and let the request continue
          // without a token. The response interceptor will see the 401
          // and emit `auth:expired` (or the user is already on /login).
          accessToken = null;
        }
      }

      if (accessToken && typeof accessToken === "string") {
        setAuthHeader(mutableConfig, `Bearer ${accessToken}`);
      } else if (
        isBrowser() &&
        process.env.NODE_ENV !== "production"
      ) {
        // Dev-only diagnostic — surface the actual token-store state so
        // we can tell apart "user never logged in" (truly empty keys) from
        // "user logged in but the response didn't include a token"
        // (response shape mismatch — backend may be returning
        // `{ token, refreshToken }` instead of `{ accessToken, ... }`).
        try {
          const rawAccess = window.localStorage.getItem("auth.accessToken");
          const rawRefresh = window.localStorage.getItem("auth.refreshToken");
          console.warn(
            `[http] No access token attached. ${mutableConfig.method?.toUpperCase()} ${mutableConfig.url} | ` +
              `localStorage.auth.accessToken=${rawAccess === null ? "<missing>" : `<length ${rawAccess.length}>`} ` +
              `localStorage.auth.refreshToken=${rawRefresh === null ? "<missing>" : `<length ${rawRefresh.length}>`} ` +
              `store.hasAccessToken=${tokenStore.hasAccessToken()} ` +
              `store.getAccessToken()=${tokenStore.getAccessToken() === null ? "null" : typeof tokenStore.getAccessToken()}`,
          );
        } catch {
          // localStorage may throw in private mode — skip the diagnostic.
        }
      }
    }

    return mutableConfig;
  });

  api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError<ApiErrorPayload>) => {
      const originalRequest = error.config as
        | RetryableAxiosRequestConfig
        | undefined;

      if (!originalRequest) {
        throw normalizeAxiosError(error);
      }

      const status = error.response?.status;
      const isUnauthorized = status === 401;

      // Only treat a 401 as "the session is gone" when the credential we
      // actually sent was expired or missing. A 401 answering a still-valid
      // token is an authorization refusal — see `accessTokenStillValid`.
      //
      // `skipAuth` requests (login / register / refresh / forgot-password)
      // ship without a Bearer on purpose, so their 401 is the endpoint's own
      // answer — "wrong password" — and never an expired session. Refreshing
      // on those used to clear the store and fire `auth:expired` on a plain
      // failed login.
      const canRefresh =
        !originalRequest._retry &&
        !originalRequest.skipRefresh &&
        !originalRequest.skipAuth &&
        !originalRequest.url?.includes("/auth/refresh") &&
        !accessTokenStillValid();

      if (isUnauthorized && canRefresh) {
        originalRequest._retry = true;

        const newAccessToken = await refreshAccessToken();

        if (newAccessToken) {
          setAuthHeader(originalRequest, `Bearer ${newAccessToken}`);
          return api(originalRequest);
        }

        // Refresh failed: clear the local store, then broadcast
        // `auth:expired` so the global handler in `Providers` can show a
        // toast + redirect to /login. `auth:expired` is debounced by
        // `authEvents.emit` so a flurry of 401s only emits ONE signal.
        tokenStore.clear();
        authEvents.emit("auth:expired");
        throw normalizeAxiosError(error);
      }

      throw normalizeAxiosError(error);
    },
  );
}

// Expose the setup function for callers that need to re-attach (e.g. in
// tests after the instance is reset). Production code relies on the
// auto-attach below.
export function setupInterceptors(): void {
  attachApiInterceptors();
}

// Auto-attach as soon as this module is evaluated in the browser. Because
// `api` is now an ES-module-local `const` above, there is no longer any
// possibility of a TDZ error — by the time this line runs, `api` has
// already been initialized.
attachApiInterceptors();

// Development only, and only when nobody is signed in: answer requests from
// fixtures so every screen renders without a backend. Compiled out of a
// production build (see `DEMO_ENABLED` in ./demo-mode), and inert the moment a
// real token exists. Loaded last so it wraps the adapter after the
// interceptors above are in place.
void import("./demo-mode").then(({ installDemoMode }) => installDemoMode(api));
