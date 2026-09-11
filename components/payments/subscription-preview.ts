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
 * **Currently ON everywhere — see `PREVIEW_ENABLED` below.** That is a
 * deliberate choice for a build people are still reviewing, not an oversight.
 *
 * It only ever fires when the URL asks for it. The two implicit paths were
 * removed: a bare return URL no longer renders the "paid" fixture, and a
 * checkout whose plan lookup came back empty no longer swaps in a stand-in
 * plan. Both put a receipt for an imaginary payment in front of real buyers,
 * on the very URL payOS sends them back to.
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
 * Whether preview mode can be used at all.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  SET THIS TO `false` BEFORE THIS APP TAKES REAL PAYMENTS FROM REAL USERS.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Hardcoded rather than read from an env var, on purpose. The env-var version
 * had to be set on every environment and remembered forever; on a deployment
 * whose whole point is "look at these screens", that is a footgun that costs
 * more than it protects.
 *
 * What being on actually exposes: anyone who appends `?preview=paid` to the
 * return URL sees a screen that says they are subscribed. That is all it is —
 * a rendering. It calls nothing, changes nothing, and grants nothing. Whether
 * an account actually has a plan is decided by the backend from its own
 * records, and this flag is not part of that conversation.
 *
 * The reason to turn it off later is honesty, not security: once real people
 * are paying, a URL that shows a false receipt is a support ticket waiting to
 * happen. One line, one rebuild.
 */
export const PREVIEW_ENABLED = true;

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

/**
 * Stand-in plan for the checkout screen.
 *
 * The real page reads `?planId=` and looks it up in `GET /api/payments/plans`.
 * That needs the API to be reachable and the id to be current — two ways for
 * the page to show a spinner or an error to someone who only wanted to look at
 * it. When the lookup cannot produce a plan, this is rendered instead.
 *
 * The numbers are copied from the live provider monthly plan so the screen is
 * an honest picture of the real thing rather than lorem ipsum.
 */
export const PREVIEW_PLAN = {
  id: "preview-plan",
  name: "Gói Nhà Cung Cấp - 1 Tháng",
  description: "Nhận job thiết kế/thi công từ marketplace trong 30 ngày.",
  targetRole: 1 as const,
  price: PREVIEW_AMOUNT,
  durationInDays: 30,
};
