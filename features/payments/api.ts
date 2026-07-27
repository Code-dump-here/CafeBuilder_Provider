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
export type PaymentPlanId = number;

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

/**
 * Response of `POST /api/payments/subscriptions`. The shape mirrors
 * what the rest of the codebase expects for created entities (id +
 * timestamps + the user-supplied fields echoed back). If the backend
 * returns a richer record (e.g. with payment URLs, gateway references,
 * ...) the consumer can extend this type without touching call sites.
 */
export interface SubscriptionCreated {
  id: number;
  accountId: number;
  planId: PaymentPlanId;
  platform: SubscriptionPlatform;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
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
 * The backend returns the standard `{ data, message?, meta? }`
 * envelope, so we unwrap `.data` before returning.
 */
export async function createSubscriptionApi(
  payload: CreateSubscriptionPayload,
  config?: RequestConfig,
): Promise<SubscriptionCreated> {
  const response = await api.post<ApiSuccessResponse<SubscriptionCreated>>(
    "/api/payments/subscriptions",
    payload,
    config,
  );
  return response.data.data;
}

/**
 * Re-export the envelope type so callers that DO receive a wrapped
 * payload can declare their return types in one place.
 */
export type { ApiSuccessResponse };