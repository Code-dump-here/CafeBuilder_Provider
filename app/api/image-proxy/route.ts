import { NextRequest } from "next/server";

/**
 * Same-origin proxy for AI artifact images.
 *
 * The image generator serves artifacts over plain HTTP on a bare IP
 * (`http://160.187.1.111:8888/_artifacts/...`). The deployed site is HTTPS, so
 * the browser blocks those as mixed content and the concept image never
 * renders. A browser won't load HTTP sub-resources into an HTTPS page, but a
 * server has no such rule — so we fetch upstream here and hand the bytes back
 * over our own origin.
 *
 * This is a proxy, so the interesting part is what it REFUSES:
 *
 *  - only hosts in `IMAGE_PROXY_ALLOWED_HOSTS` (an open proxy would let anyone
 *    use this deployment to reach arbitrary hosts, including private addresses
 *    on whatever network the server sits in — the classic SSRF shape);
 *  - only `http:` / `https:` (no `file:`, `gopher:` and friends);
 *  - redirects are NOT followed, since a permitted host could otherwise bounce
 *    us to a forbidden one and the allowlist would be decorative;
 *  - only responses that actually claim to be an image.
 *
 * Node runtime rather than Edge: the upstream is a bare-IP HTTP origin, which
 * the Edge fetch stack is more restrictive about.
 */
export const runtime = "nodejs";

/**
 * Hosts this proxy may fetch from, as `hostname` or `hostname:port`, comma
 * separated. Deliberately NOT `NEXT_PUBLIC_` — it's a server-side guard and
 * has no business being inlined into the client bundle.
 *
 * Defaults to the current artifact host so a fresh deploy renders images
 * without extra setup; set the variable to override when the generator moves.
 */
const DEFAULT_ALLOWED_HOSTS = "160.187.1.111:8888";

function allowedHosts(): Set<string> {
  const raw = process.env.IMAGE_PROXY_ALLOWED_HOSTS ?? DEFAULT_ALLOWED_HOSTS;
  return new Set(
    raw
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** How long we'll wait on the generator before giving up. */
const UPSTREAM_TIMEOUT_MS = 15_000;

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");
  if (!target) {
    return new Response("Missing `url`", { status: 400 });
  }

  let upstream: URL;
  try {
    upstream = new URL(target);
  } catch {
    return new Response("Malformed `url`", { status: 400 });
  }

  if (upstream.protocol !== "http:" && upstream.protocol !== "https:") {
    return new Response("Unsupported protocol", { status: 400 });
  }

  // `host` includes the port, so a host allowed on :8888 isn't implicitly
  // allowed on :22.
  if (!allowedHosts().has(upstream.host.toLowerCase())) {
    return new Response("Host not allowed", { status: 403 });
  }

  let response: Response;
  try {
    response = await fetch(upstream, {
      // Don't follow redirects: the allowlist is checked once, against the URL
      // we were handed. Following a 302 would let an allowed host redirect us
      // anywhere it liked.
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: { Accept: "image/*" },
    });
  } catch {
    // Timeout, DNS failure, connection refused — the artifact host is often
    // transient. 502 tells the caller it's upstream, not their request.
    return new Response("Upstream fetch failed", { status: 502 });
  }

  if (!response.ok || !response.body) {
    return new Response("Upstream error", { status: 502 });
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    // Refuse to relay whatever else it might be — this endpoint exists to
    // serve pictures, and passing arbitrary bodies through our origin would
    // hand an attacker a same-origin content channel.
    return new Response("Upstream is not an image", { status: 415 });
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // Artifacts are immutable once a job finishes — the filename carries the
      // job id — so they cache hard.
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
