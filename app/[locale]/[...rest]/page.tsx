import { notFound } from "next/navigation";

/**
 * Catch-all under the locale segment, whose only job is to call `notFound()`.
 *
 * Without it, `/vi/some-typo` matches no route at all, so Next falls back to
 * the ROOT `app/not-found.tsx` — which has no locale context and therefore
 * renders in English. A Vietnamese user mistyping a URL got an English 404
 * inside no layout. Matching here means the locale segment resolves first, so
 * `app/[locale]/not-found.tsx` renders instead, translated and inside the
 * locale layout.
 *
 * Real routes still win: Next resolves more specific segments before a
 * catch-all, so this only ever runs for paths nothing else claimed.
 */
export default function LocaleCatchAll() {
  notFound();
}
