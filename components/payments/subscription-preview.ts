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
 * **Development only.** `resolvePreviewState` returns null in a production
 * build regardless of the query string, so a deployed site cannot be talked
 * into showing a fake "you're subscribed" screen by editing a URL. The check
 * is on `NODE_ENV`, which Next inlines at build time — it is not something a
 * client can flip.
 */

export const SUBSCRIPTION_PREVIEW_STATES = [
  "pending",
  "paid",
  "failed",
  "cancelled",
] as const;

export type SubscriptionPreviewState =
  (typeof SUBSCRIPTION_PREVIEW_STATES)[number];

/** Whether preview mode can be used at all in this build. */
export const PREVIEW_ENABLED = process.env.NODE_ENV !== "production";

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
