import { api } from "@/lib/http/axios";
import type {
  ApiSuccessResponse,
  RequestConfig,
} from "@/lib/http/types";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Numeric discriminator for the role a plan targets. Mirrors the backend
 * `PaymentPlan.TargetRole` enum (0 = owner, 1 = provider). Strings are
 * intentionally avoided here because the wire format is numeric and the
 * UI surfaces the discriminator as a label.
 */
export type PaymentPlanTargetRole = 0 | 1;

/**
 * Numeric plan id mirror. We treat it as `number` rather than a literal
 * union because the backend owns plan lifecycle — adding a new plan
 * shouldn't force a FE release.
 */
export type PaymentPlanId = string;

/**
 * Response shape of `GET /api/payments/plans`. The endpoint returns an
 * array of plans; each plan carries everything the pricing UI needs
 * (name, description, targetRole, price in VND, duration).
 */
export interface PaymentPlan {
  id: PaymentPlanId;
  name: string;
  description: string;
  /** 0 = owner plan, 1 = provider plan. */
  targetRole: PaymentPlanTargetRole;
  /** Plan price in VND — integer (smallest currency unit). */
  price: number;
  /** Subscription duration in days. */
  durationInDays: number;
}

// ─── Subscription types ──────────────────────────────────────────────────────

/**
 * Platform the payment is created from. The backend maps this to a pair of
 * payOS `returnUrl` / `cancelUrl` values (`PayOs:ReturnUrl` vs
 * `PayOs:MobileReturnUrl`), and those URLs are baked into the payment link at
 * creation time — so a link made for `"web"` cannot be reused on mobile.
 */
export type SubscriptionPlatform = "web" | "mobile";

/**
 * Lifecycle of a subscription record, as the numeric enum the API actually
 * sends. `SubscriptionStatus` in the backend is declared
 * `{ pending, active, expired, cancelled }` and the API registers no
 * `JsonStringEnumConverter`, so these arrive as 0-3 rather than as names.
 *
 * Other endpoints in this API *do* send strings, because their DTOs expose
 * `public string Status` and call `.ToString()`. The payment DTOs expose the
 * raw enum instead. Verified against the live API: `GET /api/payments/plans`
 * returns `"targetRole": 0`, not `"owner"`.
 */
export const SUBSCRIPTION_STATUS = {
  pending: 0,
  active: 1,
  expired: 2,
  cancelled: 3,
} as const;
export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

/** payOS transaction lifecycle: `{ pending, paid, cancelled, failed }`. */
export const PAYMENT_TRANSACTION_STATUS = {
  pending: 0,
  paid: 1,
  cancelled: 2,
  failed: 3,
} as const;
export type PaymentTransactionStatus =
  (typeof PAYMENT_TRANSACTION_STATUS)[keyof typeof PAYMENT_TRANSACTION_STATUS];

/** What the transaction was for: `{ subscription, post_boost }`. */
export const PAYMENT_PURPOSE = { subscription: 0, post_boost: 1 } as const;
export type PaymentPurpose =
  (typeof PAYMENT_PURPOSE)[keyof typeof PAYMENT_PURPOSE];

/**
 * Body of `POST /api/payments/subscriptions`. The backend infers the
 * subscriber from the bearer token, so no `accountId` is sent.
 */
export interface CreateSubscriptionPayload {
  planId: PaymentPlanId;
  platform: SubscriptionPlatform;
}

/**
 * Response of `POST /api/payments/subscriptions` — the backend's
 * `CreatePaymentResponse`.
 *
 * This previously described a subscription *record* (`startedAt`,
 * `expiresAt`, `updatedAt`…). No such payload is ever returned: the endpoint
 * creates a **payOS payment link** and hands back the URL the user has to be
 * sent to. Because the old type had no `checkoutUrl`, the pricing page took
 * the click, created a pending transaction on the server and then showed a
 * success toast without ever sending anyone to pay.
 */
export interface CreatePaymentResponse {
  /** `"subscription"` or `"post_boost"` — a string here, unlike the enums. */
  purpose: string;
  /** Set when `purpose` is a subscription; null for a post boost. */
  subscriptionId: string | null;
  postId: string | null;
  /** payOS order code. A millisecond timestamp, so guessable — never treat it as a secret. */
  orderCode: number;
  paymentLinkId: string;
  /** Where the user must be sent to actually pay. */
  checkoutUrl: string;
  /** payOS QR payload, for rendering a scannable code instead of redirecting. */
  qrCode: string;
  amount: number;
  /** Unix seconds. payOS expires unpaid links. */
  expiredAt: number;
}

/**
 * Response of `GET /api/payments/status`.
 *
 * `isFinal` is the field that matters to the UI: payOS confirms asynchronously
 * via webhook, so a user landing on the return URL can arrive before the
 * webhook does. Poll until `isFinal` is true rather than trusting the first
 * answer.
 */
export interface PaymentStatusResponse {
  success: boolean;
  isFinal: boolean;
  status: PaymentTransactionStatus;
  purpose: PaymentPurpose;
  orderCode: number;
  paymentLinkId: string;
  subscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  postId: string | null;
  postBoostedUntil: string | null;
  amount: number;
  message: string;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

/**
 * GET /api/payments/plans — fetch every plan the backend currently offers.
 *
 * The response is a top-level array rather than the standard
 * `{ data, message?, meta? }` envelope used by other endpoints, so we
 * type the response as `PaymentPlan[]` directly (not wrapped in
 * `ApiSuccessResponse`). The interceptor still attaches the bearer token.
 *
 * Pagination isn't part of the contract today — plan lists are short and
 * curated server-side. If the backend introduces paged plans later,
 * this function is the only call-site to update.
 */
export async function fetchPaymentPlansApi(
  config?: RequestConfig,
): Promise<PaymentPlan[]> {
  const response = await api.get<PaymentPlan[]>("/api/payments/plans", config);
  return response.data;
}

/**
 * Strongly-typed selector. Returns the subset of plans that target the
 * given role. Keeps the UI clean — pages don't need to filter on their
 * own and don't accidentally render the wrong role's plans.
 */
export function selectPaymentPlansForRole(
  plans: PaymentPlan[],
  targetRole: PaymentPlanTargetRole,
): PaymentPlan[] {
  return plans.filter((plan) => plan.targetRole === targetRole);
}

/**
 * POST /api/payments/subscriptions — create a payOS payment link for a plan.
 *
 * The endpoint infers `accountId` from the bearer token, so the body only
 * carries the plan and the originating platform. It does **not** activate a
 * subscription: it returns a `checkoutUrl` the caller must send the user to.
 * The subscription only becomes active once payOS calls the backend webhook.
 *
 * Responses are returned flat — this API has no `{ data, ... }` envelope
 * anywhere, so unwrapping `.data.data` yields `undefined`.
 */
export async function createSubscriptionApi(
  payload: CreateSubscriptionPayload,
  config?: RequestConfig,
): Promise<CreatePaymentResponse> {
  const response = await api.post<CreatePaymentResponse>(
    "/api/payments/subscriptions",
    payload,
    config,
  );
  return response.data;
}

/**
 * GET /api/payments/status — where a transaction stands.
 *
 * Requires a bearer token even though the caller already knows the order
 * code: the code is a millisecond timestamp and therefore guessable, so an
 * anonymous endpoint would leak other people's amounts and statuses. The
 * backend rejects a code that does not belong to the caller.
 *
 * Pass whichever identifier the return URL carried — payOS appends both
 * `orderCode` and `id` (the payment link id) to the redirect.
 */
export async function fetchPaymentStatusApi(
  params: { orderCode?: number; paymentLinkId?: string },
  config?: RequestConfig,
): Promise<PaymentStatusResponse> {
  const response = await api.get<PaymentStatusResponse>("/api/payments/status", {
    ...config,
    params: {
      ...(params.orderCode != null ? { orderCode: params.orderCode } : {}),
      ...(params.paymentLinkId ? { paymentLinkId: params.paymentLinkId } : {}),
    },
  });
  return response.data;
}

/**
 * POST /api/payments/cancel — cancel a pending transaction and its payOS link.
 *
 * Idempotent, and scoped to the transaction's owner for the same reason the
 * status endpoint is: a guessable order code would otherwise let anyone
 * cancel a stranger's pending payment.
 *
 * Called when the user lands on the cancel URL, so the server does not leave
 * a pending row and a live payment link behind after they walked away.
 */
export async function cancelPaymentApi(
  orderCode: number,
  config?: RequestConfig,
): Promise<PaymentStatusResponse> {
  const response = await api.post<PaymentStatusResponse>(
    "/api/payments/cancel",
    undefined,
    { ...config, params: { orderCode } },
  );
  return response.data;
}

/**
 * Re-export the envelope type so callers that DO receive a wrapped
 * payload can declare their return types in one place.
 */
export type { ApiSuccessResponse };
