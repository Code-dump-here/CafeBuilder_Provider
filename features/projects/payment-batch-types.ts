/**
 * Payment batch types — mirrors the wire contract for `api/payment-batches`.
 *
 * **The platform does not hold funds.** The owner transfers money directly to
 * the provider and uploads proof; the provider reconciles it against their own
 * bank account and confirms. So these statuses track an agreement between two
 * people, not the state of a transaction — which is what separates this from
 * `features/payments` (payOS, real money for platform fees).
 *
 * Batches are never created from the UI: they are generated from the approved
 * quotation's payment terms the moment the contract is signed, so nobody can
 * invent an instalment outside what was agreed.
 */

/**
 * `pending` → `proof_submitted` → `confirmed` | `rejected`.
 *
 * `rejected` is not terminal: the owner submits fresh proof and the batch goes
 * back to `proof_submitted`.
 */
export type PaymentBatchStatus =
  | "pending"
  | "proof_submitted"
  | "confirmed"
  | "rejected";

/** One proof upload. Kept as a list, not overwritten — see `PaymentBatch.proofs`. */
export interface PaymentProof {
  id: string;
  /** Storage object name. Null when the owner just marked it paid. */
  imageUrl: string | null;
  /** Absolute URL for display — use this one. */
  imageViewUrl: string | null;
  /** What this transfer was for. Null = the batch's full amount. */
  amount: number | null;
  /** When the transfer happened per the receipt, not when it was uploaded. */
  transferredAt: string | null;
  note: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

export interface PaymentBatch {
  id: string;
  contractId: string;
  /**
   * The construction item this instalment pays for. Confirming the batch flips
   * that item's `isPaid` — this is the link review 3 asked for between "paid"
   * and "paid *for what*".
   */
  constructionItemId: string | null;
  constructionItemName: string | null;
  /** Set when the batch came from a change order rather than the original quote. */
  changeOrderId: string | null;

  sortOrder: number;
  name: string;
  percentage: number | null;
  amount: number;
  dueAt: string | null;
  status: PaymentBatchStatus;

  proofSubmittedAt: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  rejectReason: string | null;
  note: string | null;

  /** Sum of the amounts declared on the proofs. Proofs with no amount count 0. */
  paidAmount: number;

  /** Newest first. A batch paid in instalments, or re-proved after a rejection. */
  proofs: PaymentProof[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentBatchListResponse {
  items: PaymentBatch[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * Owner declares a transfer. Every field is optional: with no bank integration
 * the honest minimum is "I paid this", and demanding a receipt would block a
 * legitimate payment rather than verify it.
 */
export interface SubmitPaymentProofPayload {
  imageUrl?: string;
  amount?: number;
  transferredAt?: string;
  note?: string;
}

export interface RejectPaymentBatchPayload {
  reason?: string;
}

/** Send `null` to unlink the batch from its construction item. */
export interface LinkConstructionItemPayload {
  constructionItemId: string | null;
}

// ─── Derived values ──────────────────────────────────────────────────────────

export interface PaymentSummary {
  total: number;
  confirmed: number;
  awaitingConfirmation: number;
  outstanding: number;
  confirmedCount: number;
  awaitingCount: number;
  rejectedCount: number;
}

/**
 * Totals for the header strip.
 *
 * `confirmed` counts the batch's own amount rather than `paidAmount`: once the
 * provider has confirmed receipt, the instalment is settled regardless of what
 * the owner happened to type on the proof, and a proof with no amount would
 * otherwise read as 0 VND received.
 */
export function summarizePaymentBatches(batches: PaymentBatch[]): PaymentSummary {
  let total = 0;
  let confirmed = 0;
  let awaitingConfirmation = 0;
  let confirmedCount = 0;
  let awaitingCount = 0;
  let rejectedCount = 0;

  for (const batch of batches) {
    total += batch.amount;
    if (batch.status === "confirmed") {
      confirmed += batch.amount;
      confirmedCount += 1;
    } else if (batch.status === "proof_submitted") {
      awaitingConfirmation += batch.amount;
      awaitingCount += 1;
    } else if (batch.status === "rejected") {
      rejectedCount += 1;
    }
  }

  return {
    total,
    confirmed,
    awaitingConfirmation,
    outstanding: total - confirmed,
    confirmedCount,
    awaitingCount,
    rejectedCount,
  };
}
