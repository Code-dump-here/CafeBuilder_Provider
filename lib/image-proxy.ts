/**
 * Route an image URL through the same-origin proxy when the browser would
 * otherwise refuse it.
 *
 * Only plain-HTTP absolute URLs need this: an HTTPS page won't load an HTTP
 * image (mixed content), which is what silently blanked the AI concept images
 * on the deployed site. Everything else — HTTPS, relative paths, `data:` and
 * `blob:` — is already loadable and is returned untouched, so we don't pay a
 * proxy hop or lose the browser's own caching for images that were fine.
 *
 * The allowlist lives on the server (see `app/api/image-proxy/route.ts`); this
 * only decides whether to ask. A URL the proxy rejects still fails, but it
 * fails in the image's own `onError` handler, which both concept-image
 * components already turn into a labelled placeholder.
 */
export function proxiedImageSrc(src: string): string;
export function proxiedImageSrc(src: string | null | undefined): string | null;
export function proxiedImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;

  const trimmed = src.trim();
  if (!trimmed) return null;

  // Anything not absolute-HTTP is left alone. Checked by prefix rather than by
  // parsing, so a relative path stays relative instead of being resolved
  // against some base we'd have to invent.
  if (!/^http:\/\//i.test(trimmed)) return trimmed;

  return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
}
