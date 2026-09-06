/**
 * A `?preview=` switch for the three subscription screens, and nothing else.
 *
 * Those screens sit at the end of a payOS round trip: the checkout POST, the
 * status poll and the cancel call all need a bearer token, and the paid /
 * failed branches need a transaction that actually happened. That makes the
 * one thing you usually want to do — look at the pages — the one thing that
 * costs a login and a real payment.
 *
 * `?preview=<state>` renders a state directly from a fixture, with no request
 * and no session. It is scoped to `components/payments/subscription-*`; no
 * other page reads it, and it does not touch auth anywhere.
 *
 * **Off unless a build opts in.** `resolvePreviewState` returns null in a
 * production build unless `NEXT_PUBLIC_SUBSCRIPTION_PREVIEW=1` was set when
 * that build was made — so a real deployment cannot be talked into showing a
 * fake "you're subscribed" screen by editing a URL.
 *
 * The opt-in exists for staging and demo deploys, where the point is to look
 * at the screens and there is no payOS account to pay through. Set it there
 * and nowhere else. Being `NEXT_PUBLIC_`, it is inlined at build time: turning
 * it on or off requires a rebuild, and no client can flip it.
 */

export const SUBSCRIPTION_PREVIEW_STATES = [
  "pending",
  "paid",
  "failed",
  "cancelled",
] as const;

export type SubscriptionPreviewState =
  (typeof SUBSCRIPTION_PREVIEW_STATES)[number];

/**
 * Whether preview mode can be used at all in this build.
 *
 * Always on in development; in production only when the deploy explicitly
 * asked for it.
 */
export const PREVIEW_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_SUBSCRIPTION_PREVIEW === "1";

/**
 * Read `?preview=` and validate it against the known states.
 *
 * Returns null for an unknown value rather than falling back to one, so a typo
 * shows you the real page instead of silently showing a fixture.
 */
export function resolvePreviewState(
  raw: string | null,
): SubscriptionPreviewState | null {
  if (!PREVIEW_ENABLED || !raw) return null;
  return (SUBSCRIPTION_PREVIEW_STATES as readonly string[]).includes(raw)
    ? (raw as SubscriptionPreviewState)
    : null;
}

/** Amount shown in previews — the real provider monthly plan's price. */
export const PREVIEW_AMOUNT = 299000;
