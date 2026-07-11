// ─── Storage keys ────────────────────────────────────────────────────────────

const ACCESS_TOKEN_KEY = "auth.accessToken";
const REFRESH_TOKEN_KEY = "auth.refreshToken";

// ─── Types ───────────────────────────────────────────────────────────────────

type AuthTokens = {
  /**
   * Storage-friendly state. Distinguish three cases explicitly:
   *   - `"..."` — a real token is present
   *   - `null` — explicitly cleared (logout)
   *   - `undefined` — never been seen on this page load (pre-hydration,
   *                  or backend response shape didn't include one).
   *
   * `undefined` is treated as "unknown" — not as "logged out" — so a
   * missing key never wipes a previously persisted token via a no-op
   * mutation.
   */
  accessToken: string | null | undefined;
  refreshToken: string | null | undefined;
};

type Listener = () => void;

// ─── In-memory cache ─────────────────────────────────────────────────────────
//
// Always read/write from `tokens` so subscribers stay in sync. The store is
// hydrated once from localStorage at module load (browser only) and every
// mutation re-persists to localStorage. Server-side renders see `undefined`
// tokens because `localStorage` doesn't exist there — that's fine, the
// axios interceptor will skip the header on the server.

const tokens: AuthTokens = {
  accessToken: undefined,
  refreshToken: undefined,
};

/**
 * Becomes `true` after the first successful read from `localStorage`
 * (browser-only). React Query hooks can wait for this so their first
 * request fires AFTER the persisted access token is loaded — otherwise
 * the first outbound request after a page reload would race hydration
 * and ship without an Authorization header.
 */
let hydrated = false;

const listeners = new Set<Listener>();

// ─── Persistence helpers ─────────────────────────────────────────────────────

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * `localStorage.setItem` coerces non-strings (including `undefined`!) to
 * `"undefined"`. That would persist a broken value that the next `getItem`
 * returns as the literal string `"undefined"` — i.e. we'd later treat it
 * as "still set, but unusable". Guard against that here so any path that
 * accidentally hands us a non-string fails closed instead of poisoning
 * storage.
 */
function safeSetItem(key: string, value: string) {
  if (!hasStorage()) return;
  if (typeof value !== "string" || value.length === 0) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage may throw in private mode / quota exceeded — fail open.
  }
}

function safeRemoveItem(key: string) {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // See note above.
  }
}

function persistAccessToken(next: string | null) {
  if (next === null) safeRemoveItem(ACCESS_TOKEN_KEY);
  else safeSetItem(ACCESS_TOKEN_KEY, next);
}

function persistRefreshToken(next: string | null) {
  if (next === null) safeRemoveItem(REFRESH_TOKEN_KEY);
  else safeSetItem(REFRESH_TOKEN_KEY, next);
}

/**
 * Hydrate the in-memory store from localStorage. Safe to call multiple times
 * — subsequent calls just overwrite with the same values.
 *
 * Reads return `null` for missing keys, which the in-memory store treats
 * as "no token" (distinct from "not yet hydrated").
 */
function hydrateFromStorage(): boolean {
  if (!hasStorage()) return false;
  try {
    const storedAccess = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedRefresh = window.localStorage.getItem(REFRESH_TOKEN_KEY);
    let changed = false;
    if (storedAccess !== tokens.accessToken) {
      tokens.accessToken = storedAccess;
      changed = true;
    }
    if (storedRefresh !== tokens.refreshToken) {
      tokens.refreshToken = storedRefresh;
      changed = true;
    }
    return changed;
  } catch {
    return false;
  }
}

// ─── Mutation helpers ────────────────────────────────────────────────────────

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Coerce an incoming value to a real token-or-cleared state. Anything that
 * isn't a non-empty string collapses to `null` ("no token") so we never
 * persist the literal `"undefined"` and never confuse `null !== undefined`
 * equality with "token present".
 *
 * Special cases:
 *   - `null` → `null`  (explicit logout / clear)
 *   - `""`   → `null`  (empty string is just as bad as `undefined`)
 *   - anything else that isn't a non-empty string → `null`
 */
function normalize(next: unknown): string | null {
  if (next === null) return null;
  if (typeof next !== "string") return null;
  if (next.length === 0) return null;
  return next;
}

function setAccessToken(next: string | null | undefined) {
  const normalized = normalize(next);
  if (tokens.accessToken === normalized) return;
  tokens.accessToken = normalized;
  persistAccessToken(normalized);
  notify();
}

function setRefreshToken(next: string | null | undefined) {
  const normalized = normalize(next);
  if (tokens.refreshToken === normalized) return;
  tokens.refreshToken = normalized;
  persistRefreshToken(normalized);
  notify();
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const tokenStore = {
  /** Returns the current access token, or `null` if none is set. */
  getAccessToken() {
    return tokens.accessToken ?? null;
  },
  /** `true` iff a non-empty access token is currently loaded. */
  hasAccessToken() {
    return typeof tokens.accessToken === "string" && tokens.accessToken.length > 0;
  },
  /**
   * Set or clear the access token. Pass `null` (or omit) to clear.
   * Anything that isn't a non-empty string is treated as "no token".
   */
  setAccessToken(accessToken: string | null) {
    setAccessToken(accessToken);
  },
  getRefreshToken() {
    return tokens.refreshToken ?? null;
  },
  hasRefreshToken() {
    return typeof tokens.refreshToken === "string" && tokens.refreshToken.length > 0;
  },
  setRefreshToken(refreshToken: string | null) {
    setRefreshToken(refreshToken);
  },
  /**
   * Apply a partial update. Keys that are `undefined` are left alone so
   * `setTokens({ accessToken: "x" })` doesn't accidentally wipe a refresh
   * token (and vice versa). This is the shape `useLoginMutation` relies on.
   */
  setTokens(next: {
    accessToken?: string | null | undefined;
    refreshToken?: string | null | undefined;
  }) {
    if (next.accessToken !== undefined) setAccessToken(next.accessToken);
    if (next.refreshToken !== undefined) setRefreshToken(next.refreshToken);
  },
  clear() {
    const wasLoggedIn = tokenStore.hasAccessToken() || tokenStore.hasRefreshToken();
    tokens.accessToken = null;
    tokens.refreshToken = null;
    safeRemoveItem(ACCESS_TOKEN_KEY);
    safeRemoveItem(REFRESH_TOKEN_KEY);
    if (wasLoggedIn) notify();
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /**
   * `true` once the in-memory store has been hydrated from `localStorage`
   * at least once on this page load. React Query hooks that need auth can
   * gate their first fetch on this so they don't fire the request BEFORE
   * the persisted access token is loaded.
   */
  isHydrated() {
    return hydrated;
  },
  /**
   * Re-read tokens from localStorage and notify subscribers if anything
   * changed. Idempotent — calling it more than once is safe. Returns
   * `true` once hydration has succeeded on the browser.
   *
   * Intended for two callers:
   *   1. The bottom of this module (auto-runs on client load).
   *   2. `Providers` (`useEffect`), as a safety net for entry points that
   *      somehow didn't trigger module-load hydration.
   */
  hydrate() {
    const changed = hydrateFromStorage();
    hydrated = true;
    if (changed || listeners.size > 0) notify();
  },
};

// ─── Module-load hydration (browser only) ────────────────────────────────────
//
// Run synchronously as soon as ANY file imports `tokenStore` in the browser.
// This guarantees the store is populated BEFORE the first React render
// queries fire — eliminating the "page reload → request fires with no
// Authorization header" race that `useEffect`-based hydration can't fix.
//
// Safe on the server (`hasStorage()` returns false) and in workers / SSR
// (no `window`), so we don't need a runtime guard around the call site.

if (typeof window !== "undefined") {
  tokenStore.hydrate();
}