/**
 * Runtime configuration.
 *
 * `NEXT_PUBLIC_*` values are inlined at **build** time, so a missing variable
 * cannot be corrected after deploy — the wrong value is baked into the bundle.
 *
 * This previously fell back to `http://localhost:3001` unconditionally. A
 * production build with the variable unset therefore shipped happily and then
 * tried to reach the developer's own machine from the user's browser:
 *
 *   POST http://localhost:3001/api/auth/login  net::ERR_CONNECTION_REFUSED
 *
 * Nothing surfaced that as a configuration problem — it looked like the API
 * was down. The fallback is now development-only, and a production build
 * without the variable fails fast with an actionable message rather than
 * producing a bundle that can never talk to the backend.
 */

const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

function resolveApiBaseUrl(): string {
  if (rawBaseUrl) {
    // Trailing slashes double up with the leading `/api/...` every call site
    // already includes.
    return rawBaseUrl.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set. Set it to the backend ORIGIN " +
        "only (no trailing /api — call sites already prefix `/api/...`), " +
        "e.g. https://your-backend.run.app. On Vercel add it under " +
        "Settings → Environment Variables and redeploy: the value is inlined " +
        "at build time, so an existing deployment will not pick it up.",
    );
  }

  return "http://localhost:3001";
}

/**
 * Google Maps Platform key for map previews of a project's address.
 *
 * Empty is a supported state, not a failure: with no key the map simply isn't
 * rendered and the address stays as text, which is what every screen showed
 * before maps existed. That deliberately differs from `apiBaseUrl` above —
 * a missing API URL breaks the whole app, a missing Maps key costs one tile.
 *
 * Being `NEXT_PUBLIC_` means this ships in the browser bundle. That is normal
 * for Maps: the key is not a secret, and the way it is protected is an HTTP
 * referrer restriction in the Cloud console, not obscurity. Restrict it there
 * to your own domains, or anyone can bill your project by copying it out of
 * the page source.
 */
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  requestTimeoutMs: Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 10000),
  googleMapsApiKey,
  /** Whether map previews can render at all. */
  mapsEnabled: googleMapsApiKey.length > 0,
};
