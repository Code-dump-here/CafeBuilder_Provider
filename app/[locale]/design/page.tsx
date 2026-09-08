import { notFound } from "next/navigation";

import { DesignGallery } from "@/components/design-gallery/design-gallery";

/**
 * `/[locale]/design` — every primitive and state on one page, with no
 * authentication and no network.
 *
 * Checking a restyle used to mean signing in as a provider, finding a project
 * that happened to contain the component you changed, and hoping it was in the
 * state you needed. Most states — a rejected payment proof, an overdue
 * milestone, an empty list — are hard to produce on demand at all.
 *
 * So this renders them from fixtures instead. Nothing here calls an API, which
 * is also why it needs no session: there is nothing to authorise. Bypassing
 * auth was the other option and a worse one — it would have touched the real
 * sign-in path, and still shown empty screens, because the data is gated
 * server-side too.
 *
 * Development only. `notFound()` in production means the route does not exist
 * on a deployment rather than merely being unlinked.
 */
export default function DesignGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignGallery />;
}
