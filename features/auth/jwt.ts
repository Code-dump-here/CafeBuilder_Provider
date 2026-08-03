/**
 * Tiny client-side JWT helpers.
 *
 * We only ever DECODE the payload — never verify the signature. Verification
 * is the server's job. The point of decoding here is purely to surface the
 * `exp` claim so the auth layer can decide to refresh the access token
 * BEFORE a request ships with an already-expired credential (which would
 * otherwise round-trip as a 401 from the server).
 *
 * Why not pull in a real library? `jwt-decode` would work, but we only
 * need the payload + a single numeric field. Adding a dependency for ~20
 * lines of code that runs once per page load is not worth it.
 */

export interface JwtPayload {
  /** Expiry — seconds since Unix epoch. May be absent on opaque tokens. */
  exp?: number;
  /** Issued-at — seconds since Unix epoch. Optional. */
  iat?: number;
  /** Subject (user id, etc.). Optional. */
  sub?: string;
  /** Any other claims the backend might include. */
  [key: string]: unknown;
}

/**
 * Decode the payload of a JWT. Returns `null` for any of:
 *   - non-string input
 *   - tokens that don't have three dot-separated segments
 *   - payload that isn't valid base64url / doesn't parse as JSON
 *
 * No signature verification — see file header.
 */
export function decodeJwtPayload(token: string | null | undefined): JwtPayload | null {
  if (typeof token !== "string" || token.length === 0) return null;

  // base64url uses `-` and `_` instead of `+` and `/`. Browsers' `atob`
  // handles standard base64 but NOT base64url — convert first.
  const segments = token.split(".");
  if (segments.length !== 3) return null;

  const payloadSegment = segments[1];
  if (!payloadSegment) return null;

  let base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
  // `atob` requires length to be a multiple of 4. Pad with `=`.
  const padding = (4 - (base64.length % 4)) % 4;
  if (padding > 0) base64 += "=".repeat(padding);

  try {
    // `atob` is browser + modern Node. This module is only imported from
    // the auth layer, which already gates on `typeof window`, so we don't
    // need a polyfill check here.
    const json = atob(base64);
    const parsed = JSON.parse(json) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as JwtPayload;
  } catch {
    // Malformed base64 or invalid JSON — treat as "no payload".
    return null;
  }
}

/**
 * Returns the unix-epoch-seconds `exp` claim if present, else `null`.
 */
export function getJwtExpiry(token: string | null | undefined): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
    return null;
  }
  return payload.exp;
}

/**
 * How many seconds until `exp` (negative if already expired).
 * Returns `null` when the token has no parseable `exp`.
 */
export function secondsUntilExpiry(
  token: string | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  const exp = getJwtExpiry(token);
  if (exp === null) return null;
  return Math.floor(exp * 1000 - nowMs) / 1000;
}

/**
 * `true` iff the token is expired OR within `safetyWindowSeconds` of expiring.
 * A token without a parseable `exp` returns `false` — we don't know its
 * state, so we trust whatever the server says on the next request.
 *
 * `safetyWindowSeconds` defaults to 60s. The point is to refresh BEFORE the
 * server would 401 us, so the user never sees the failed request.
 */
export function isJwtExpiredOrExpiring(
  token: string | null | undefined,
  safetyWindowSeconds: number = 60,
  nowMs: number = Date.now(),
): boolean {
  const remaining = secondsUntilExpiry(token, nowMs);
  if (remaining === null) return false;
  return remaining <= safetyWindowSeconds;
}
