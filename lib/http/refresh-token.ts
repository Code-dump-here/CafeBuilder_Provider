import { refreshTokenApi } from "./auth";
import { tokenStore } from "@/lib/auth/token-store";

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  refreshPromise = refreshTokenApi(refreshToken)
    .then((session) => {
      tokenStore.setTokens({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
      return session.accessToken;
    })
    .catch(() => {
      tokenStore.clear();
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

/**
 * Reset the dedupe cache. Used in tests / after manually invalidating the
 * in-flight refresh (e.g. when the token store is wiped externally).
 */
export function _resetRefreshPromiseForTesting() {
  refreshPromise = null;
}