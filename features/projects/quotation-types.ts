/**
 * Quotation types — mirrors the wire contract for `api/quotations`.
 *
 * This is the artefact review 3 asked for: before it, an owner comparing three
 * providers had one free-text line each (`Apply.proposal`) and no basis to
 * choose. A quotation carries priced line items, an estimated duration and the
 * payment terms the contract will be built from.
 *
 * The consequential bit: **approving a quotation is how a provider gets
 * chosen.** For a quotation anchored to an application, `POST /accept` also
 * accepts that application, opens the engagement and closes the post. There is
 * no separate "pick this provider" step.
 */

/**
 * Lifecycle. `draft` is provider-private; everything from `sent` on is visible
 * to the owner.
 *
 * `superseded` is not reachable by anyone's click — the server stamps it on
 * the losing quotations once one is approved, so a stale tab cannot act on a
 * quotation that has already lost.
 */
export type QuotationStatus =
  | "draft"
  | "sent"
  | "revision_requested"
  | "accepted"
  | "rejected"
  | "superseded";

/** Statuses where nothing further will happen — used to grey the row out. */
export const QUOTATION_CLOSED_STATUSES: readonly QuotationStatus[] = [
  "accepted",
  "rejected",
  "superseded",
] as const;

export interface QuotationItem {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  /** Server-computed `quantity × unitPrice`. Never sent by the client. */
  amount: number;
  note: string | null;
  sortOrder: number;
}

/**
 * One instalment of the payment schedule. Exactly these rows become the
 * project's payment batches when the contract is signed, so the schedule
 * agreed here is the schedule the owner will be asked to pay against.
 */
export interface QuotationPaymentTerm {
  id: string;
  sortOrder: number;
  name: string;
  /** Percentage of the total, when the term was expressed that way. */
  percentage: number | null;
  /** Always populated: the server resolves a percentage into an amount. */
  amount: number;
  /** What triggers this instalment, e.g. "after the shell is handed over". */
  condition: string | null;
}

export interface QuotationAttachment {
  id: string;
  /** Storage object name held in the database. */
  fileUrl: string;
  /** Absolute URL for viewing/downloading — use this one in the UI. */
  fileViewUrl: string | null;
  fileName: string | null;
  createdAt: string;
}

export interface Quotation {
  id: string;
  /** Set when the quotation accompanies an application. Mutually exclusive… */
  applyId: string | null;
  /** …with this one, set when the owner hired the provider directly. */
  projectWorkingId: string | null;
  version: number;
  title: string;
  note: string | null;
  totalAmount: number;
  estimatedDurationDays: number | null;
  /** Free design revisions bundled into the price. */
  freeRevisionCount: number | null;
  /** Fee per revision beyond the free ones. Null = not published. */
  extraRevisionFee: number | null;
  status: QuotationStatus;
  revisionReason: string | null;
  rejectReason: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  lockedAt: string | null;
  /** Locked quotations are read-only — the contract is built from them. */
  isLocked: boolean;

  /** Provider snapshot, so the owner can compare bids without extra calls. */
  providerName: string | null;
  serviceProviderProfileId: string | null;
  providerAvgRating: number | null;
  providerYearsExperience: number | null;
  providerIsVerified: boolean | null;

  items: QuotationItem[];
  paymentTerms: QuotationPaymentTerm[];
  attachments: QuotationAttachment[];

  createdAt: string;
  updatedAt: string;
}

export interface QuotationListResponse {
  items: Quotation[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/** One line as sent to the server. `amount` is omitted — the server computes it. */
export interface QuotationItemInput {
  name: string;
  description?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  note?: string;
}

/**
 * One instalment as sent. Send `percentage` **or** `amount`; if both arrive the
 * server takes the percentage, so the UI should only ever fill one.
 */
export interface QuotationPaymentTermInput {
  name: string;
  percentage?: number;
  amount?: number;
  condition?: string;
}

/** Send exactly one of `applyId` / `projectWorkingId` — both, or neither, is a 400. */
export interface CreateQuotationPayload {
  applyId?: string;
  projectWorkingId?: string;
  title: string;
  note?: string;
  estimatedDurationDays?: number;
  freeRevisionCount?: number;
  extraRevisionFee?: number;
  items: QuotationItemInput[];
  paymentTerms: QuotationPaymentTermInput[];
}

/**
 * Draft edits. `items` / `paymentTerms` replace the whole list when present and
 * leave it untouched when omitted — there is no per-line endpoint, because
 * editing one line at a time would let the total drift from its lines.
 */
export interface UpdateQuotationPayload {
  title?: string;
  note?: string;
  estimatedDurationDays?: number;
  freeRevisionCount?: number;
  extraRevisionFee?: number;
  items?: QuotationItemInput[];
  paymentTerms?: QuotationPaymentTermInput[];
}

/** Reason accompanying a rejection or a revision request. */
export interface RespondQuotationPayload {
  reason?: string;
}

export interface AddQuotationAttachmentPayload {
  fileUrl: string;
  fileName?: string;
}

/**
 * Result of an owner approving a quotation. `engagement` is present only for
 * application-anchored quotations, where approving also created the
 * engagement; a directly-hired provider already had one.
 */
export interface AcceptQuotationResponse {
  quotation: Quotation;
  engagement: unknown | null;
}

// ─── Derived values ──────────────────────────────────────────────────────────

/** Sum of the line items. Should equal `totalAmount`; see `paymentTermsBalance`. */
export function sumQuotationItems(items: QuotationItemInput[]): number {
  return items.reduce(
    (total, item) => total + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );
}

/**
 * How much of the total the payment schedule actually accounts for.
 *
 * A schedule that adds up to less than the total leaves money with no
 * instalment to collect it, and one that overshoots asks for more than was
 * quoted. Neither is rejected by the server, so the editor warns instead.
 */
export function paymentTermsBalance(
  terms: QuotationPaymentTermInput[],
  total: number,
): { scheduled: number; difference: number; isBalanced: boolean } {
  const scheduled = terms.reduce((sum, term) => {
    if (term.percentage != null && term.percentage !== 0) {
      return sum + (total * Number(term.percentage)) / 100;
    }
    return sum + (Number(term.amount) || 0);
  }, 0);

  const difference = scheduled - total;
  // Percentages rarely divide a VND total evenly; a rounding gap of a few dong
  // is arithmetic, not a mistake the provider should be nagged about.
  return { scheduled, difference, isBalanced: Math.abs(difference) < 1 };
}
