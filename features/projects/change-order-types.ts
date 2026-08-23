/**
 * Change order types — mirrors the wire contract for `api/change-orders`.
 *
 * A change order is money agreed *after* the contract: an extra revision round
 * beyond the free quota, a scope change, a material swap. It carries its own
 * two-party handshake — one side raises it, the *other* side accepts or
 * rejects. Nobody approves their own.
 *
 * The contract value itself never moves. `ChangeOrderSummary.totalCommitted`
 * is what the job now costs: the signed figure plus everything accepted since.
 *
 * Accepting one opens a payment batch for it, so an agreed extra is something
 * the owner can actually be billed for — see `paymentBatchId`.
 */

/** Why the money is being asked for. */
export type ChangeOrderKind =
  | "extra_revision"
  | "scope_change"
  | "material_change"
  | "other";

export const CHANGE_ORDER_KINDS: readonly ChangeOrderKind[] = [
  "extra_revision",
  "scope_change",
  "material_change",
  "other",
] as const;

/** Terminal once it leaves `pending` — a decision is a record, not a draft. */
export type ChangeOrderStatus = "pending" | "accepted" | "rejected";

export const CHANGE_ORDER_STATUSES: readonly ChangeOrderStatus[] = [
  "pending",
  "accepted",
  "rejected",
] as const;

/** Which side of the engagement raised it. */
export type EngagementParty = "owner" | "provider";

export interface ChangeOrder {
  id: string;
  projectWorkingId: string;
  /** Set when the charge belongs to a specific design (revision fees do). */
  designId: string | null;
  /** Set when the charge belongs to a specific milestone. */
  constructionItemId: string | null;
  kind: ChangeOrderKind;
  title: string;
  reason: string;
  amount: number;
  /** Which revision round triggered it, for `extra_revision` only. */
  revisionNo: number | null;
  status: ChangeOrderStatus;
  requestedByParty: EngagementParty;
  createdBy: string | null;
  respondedBy: string | null;
  respondedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * The payment batch this became once both sides agreed. Null while it is
   * still pending, if it was rejected, if it is worth nothing, or if no
   * contract is signed yet to hang a batch on — agreeing a number and having
   * a way to collect it are two different things.
   */
  paymentBatchId: string | null;
  paymentBatchStatus: PaymentBatchStatus | null;
  /**
   * A revision fee the system opened but the provider has not priced, because
   * the quotation never published a rate. It sits at 0 until they fill it in,
   * and the owner has nothing to decide until they do.
   */
  needsPricing: boolean;
}

/** Mirrors the payment batch lifecycle; a change order only ever reads it. */
export type PaymentBatchStatus =
  | "pending"
  | "proof_submitted"
  | "confirmed"
  | "rejected";

export interface ChangeOrderListResponse {
  items: ChangeOrder[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * What the engagement is committed to, all in.
 *
 * `contractValue` and `totalCommitted` are null until a contract is signed —
 * "nothing to add up yet" is a different statement from "adds up to zero".
 */
export interface ChangeOrderSummary {
  projectWorkingId: string;
  contractValue: number | null;
  acceptedAmount: number;
  pendingAmount: number;
  totalCommitted: number | null;
  acceptedCount: number;
  pendingCount: number;
  rejectedCount: number;
  /** Of the accepted total, how much came from extra design revisions. */
  acceptedRevisionFee: number;
  /** How much of the accepted total turned into a real payment batch. */
  billedAmount: number;
  /** How much of that the provider has confirmed receiving. */
  paidAmount: number;
  /**
   * `acceptedAmount - billedAmount`. Above zero means money both sides agreed
   * that no payment batch covers yet.
   */
  unbilledAmount: number;
}

/**
 * How many revision rounds a design has left before they start costing.
 *
 * `freeRevisionCount` null means no accepted quotation fixed a number, so
 * nothing is gated — unlimited rounds, no fee.
 */
export interface RevisionQuota {
  designId: string;
  projectWorkingId: string;
  quotationId: string | null;
  freeRevisionCount: number | null;
  /** Rounds spent on *this* design. Shown, but not what the quota is measured against. */
  usedRevisionCount: number;
  /**
   * Rounds spent across every design in the engagement. This is the figure the
   * server compares to `freeRevisionCount`, because the quota comes from the
   * quotation and a quotation covers the whole engagement, not one drawing.
   */
  engagementUsedRevisionCount: number;
  remainingFreeRevisions: number | null;
  nextRevisionCharged: boolean;
  /** Null when the provider never published a price for extra rounds. */
  extraRevisionFee: number | null;
}

export interface CreateChangeOrderPayload {
  projectWorkingId: string;
  kind: ChangeOrderKind;
  title: string;
  reason: string;
  amount: number;
  designId?: string;
  constructionItemId?: string;
}

export interface UpdateChangeOrderPayload {
  title?: string;
  reason?: string;
  amount?: number;
  kind?: ChangeOrderKind;
  designId?: string;
  constructionItemId?: string;
}
