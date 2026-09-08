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
 * Platform the subscription is created from. Today only `"web"` is
 * supported — keep the union closed so accidental typos at call sites
 * surface as a TS error rather than a 422 from the server.
 */
export type SubscriptionPlatform = "web";

/**
 * Lifecycle of a subscription record. Mirrors what the backend is
 * expected to return on `POST /api/payments/subscriptions`. `pending`
 * covers the window between the POST landing on the server and the
 * first payment webhook landing back; `active` means the user has a
 * running plan; `expired` / `cancelled` are terminal states.
 */
export type SubscriptionStatus =
  | "pending"
  | "active"
  | "expired"
  | "cancelled";

/**
 * Body of `POST /api/payments/subscriptions`. The backend infers the
 * subscriber from the bearer token, so we don't pass `accountId` here.
 */
export interface CreateSubscriptionPayload {
  planId: PaymentPlanId;
  platform: SubscriptionPlatform;
}

/** Lifecycle of a payOS transaction. Ordinals, see `decodeEnum` below. */
export type PaymentTransactionStatus =
  | "pending"
  | "paid"
  | "cancelled"
  | "failed";

/** What the transaction was for. */
export type PaymentPurpose = "subscription" | "post_boost";

/**
 * The API serialises enums as their **ordinal**, not their name: `Program.cs`
 * registers no `JsonStringEnumConverter`, which is also why `targetRole`
 * above is typed `0 | 1`. Read a `status` of `1` as the string `"paid"` and
 * these lists are the only place that mapping lives — keep the order in step
 * with `Repository/Models/Enums/Enums.cs`.
 */
const TRANSACTION_STATUSES: readonly PaymentTransactionStatus[] = [
  "pending",
  "paid",
  "cancelled",
  "failed",
];
const PURPOSES: readonly PaymentPurpose[] = ["subscription", "post_boost"];
const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "pending",
  "active",
  "expired",
  "cancelled",
];

/**
 * Turn an ordinal into its name.
 *
 * Also accepts the name itself, so that the day someone registers a string
 * enum converter on the backend this keeps reporting the truth instead of
 * silently calling a paid order `"pending"` — the failure mode that a bare
 * `names[value]` lookup would have.
 */
function decodeEnum<T extends string>(
  names: readonly T[],
  value: unknown,
  fallback: T,
): T {
  if (typeof value === "number") return names[value] ?? fallback;
  if (typeof value === "string") {
    return names.find((name) => name === value) ?? fallback;
  }
  return fallback;
}

/**
 * Response of `POST /api/payments/subscriptions`.
 *
 * This is a **payOS payment link**, not the subscription record — the
 * subscription is created server-side in `pending` and only becomes `active`
 * when payOS calls the webhook. The important field is `checkoutUrl`: nothing
 * is paid until the browser actually goes there.
 */
export interface CreatePaymentResponse {
  purpose: PaymentPurpose;
  /** Set when `purpose === "subscription"`. */
  subscriptionId: string | null;
  /** Set when `purpose === "post_boost"`. */
  postId: string | null;
  /** payOS order code — the handle the return page polls with. */
  orderCode: number;
  paymentLinkId: string;
  /** Hosted payOS checkout. Send the user here. */
  checkoutUrl: string;
  qrCode: string;
  amount: number;
  /** Unix seconds. The link stops working after this. */
  expiredAt: number;
}

/**
 * Response of `GET /api/payments/status`.
 *
 * The webhook is what settles a transaction, so the client must never decide
 * on its own that a payment succeeded — it polls until `isFinal`.
 */
export interface PaymentStatusResponse {
  success: boolean;
  /** `true` once paid / cancelled / failed — stop polling. */
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
 * POST /api/payments/subscriptions — kick off a new subscription for
 * the authenticated account.
 *
 * The endpoint infers `accountId` from the bearer token (the auth
 * interceptor attaches it), so the request body only carries the
 * selected `planId` and the originating `platform`. Today `platform`
 * is hard-wired to `"web"` at the call site — the API_FLOW_FE.md
 * doesn't define mobile/desktop, but adding more values here is a
 * one-line change.
 *
 * The backend returns this DTO flat — there is no `{ data, … }` envelope
 * anywhere in the API (no result filter wraps responses; `/api/auth/me`,
 * `/api/posts` and the rest all answer with the bare object). Unwrapping
 * `.data.data` therefore yielded `undefined`.
 */
export async function createSubscriptionApi(
  payload: CreateSubscriptionPayload,
  config?: RequestConfig,
): Promise<CreatePaymentResponse> {
  const response = await api.post<Record<string, unknown>>(
    "/api/payments/subscriptions",
    payload,
    config,
  );
  const raw = response.data ?? {};
  return {
    purpose: decodeEnum(PURPOSES, raw.purpose, "subscription"),
    subscriptionId: (raw.subscriptionId as string | null) ?? null,
    postId: (raw.postId as string | null) ?? null,
    orderCode: Number(raw.orderCode ?? 0),
    paymentLinkId: String(raw.paymentLinkId ?? ""),
    checkoutUrl: String(raw.checkoutUrl ?? ""),
    qrCode: String(raw.qrCode ?? ""),
    amount: Number(raw.amount ?? 0),
    expiredAt: Number(raw.expiredAt ?? 0),
  };
}

/**
 * GET /api/payments/status — where a transaction stands right now.
 *
 * Authenticated on purpose server-side: an `orderCode` is a millisecond
 * timestamp and therefore guessable, so an anonymous endpoint would leak
 * other people's amounts. The bearer token the interceptor attaches is what
 * scopes this to the caller's own transactions.
 */
export async function fetchPaymentStatusApi(
  params: { orderCode?: number; paymentLinkId?: string },
  config?: RequestConfig,
): Promise<PaymentStatusResponse> {
  const response = await api.get<Record<string, unknown>>(
    "/api/payments/status",
    { ...config, params },
  );
  const raw = response.data ?? {};
  return {
    success: raw.success === true,
    isFinal: raw.isFinal === true,
    status: decodeEnum(TRANSACTION_STATUSES, raw.status, "pending"),
    purpose: decodeEnum(PURPOSES, raw.purpose, "subscription"),
    orderCode: Number(raw.orderCode ?? 0),
    paymentLinkId: String(raw.paymentLinkId ?? ""),
    subscriptionId: (raw.subscriptionId as string | null) ?? null,
    subscriptionStatus:
      raw.subscriptionStatus === null || raw.subscriptionStatus === undefined
        ? null
        : decodeEnum(SUBSCRIPTION_STATUSES, raw.subscriptionStatus, "pending"),
    postId: (raw.postId as string | null) ?? null,
    postBoostedUntil: (raw.postBoostedUntil as string | null) ?? null,
    amount: Number(raw.amount ?? 0),
    message: String(raw.message ?? ""),
  };
}

/**
 * POST /api/payments/cancel — mark a pending transaction cancelled.
 *
 * Idempotent server-side, so the cancel page can fire it on mount without
 * guarding against a double render or a refresh.
 */
export async function cancelPaymentApi(
  orderCode: number,
  config?: RequestConfig,
): Promise<void> {
  // The order code goes in the URL rather than `config.params`: axios types
  // `post`'s config against the request body, so a `params` object there
  // fights the generic. It is a number, so there is nothing to encode.
  await api.post(`/api/payments/cancel?orderCode=${orderCode}`, null, config);
}

/**
 * Re-export the envelope type so callers that DO receive a wrapped
 * payload can declare their return types in one place.
 */
export type { ApiSuccessResponse };