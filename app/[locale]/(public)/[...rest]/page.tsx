import { notFound } from "next/navigation";

/**
 * Catch-all whose only job is to call `notFound()`, so an unmatched path still
 * resolves the locale segment and renders `app/[locale]/not-found.tsx` —
 * translated, inside the locale layout — instead of falling through to the
 * root `app/not-found.tsx`, which is English whatever the locale.
 *
 * It has to live INSIDE `(public)`, not one level up at `app/[locale]/`.
 * A catch-all only loses to more specific segments that are its own siblings,
 * and a route group is not transparent for that comparison: from
 * `app/[locale]/`, every page under `(public)` looked less specific than
 * `[...rest]` and lost to it. That shadowed all ten of them — the marketplace,
 * my-projects, profile, projects, pricing, notifications and all three
 * subscription screens, including the URL payOS returns real buyers to. Each
 * one served a 404 while the files sat right there.
 *
 * Sibling routes outside the group (`design`, `projects/[id]/…`, `admin/…`,
 * `(auth)/…`) keep working because they are resolved before this group is
 * considered. Verified by requesting each: real routes 200, `/vi/<typo>`
 * renders the Vietnamese 404.
 */
export default function LocaleCatchAll() {
  notFound();
}
