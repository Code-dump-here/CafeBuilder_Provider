/**
 * Contract types — mirrors the wire contract for `api/contracts`.
 *
 * Contracts are created by providers and confirmed by owners via OTP.
 * `confirmed` status unlocks designs & construction items.
 *
 * See `contracts.md` for the full state machine, permission matrix, and
 * the atomic-confirm side effects (engagement.StartedAt, project status
 * flip, payment_batches generation).
 */

/**
 * Contract status lifecycle:
 *   - `drafted`      — created by provider, not sent yet.
 *   - `pending_otp`  — OTP sent to owner, awaiting confirmation.
 *   - `confirmed`    — owner confirmed with OTP, contract is active.
 *   - `cancelled`    — provider cancelled before confirmation.
 */
export type ContractStatus =
  | "drafted"
  | "pending_otp"
  | "confirmed"
  | "cancelled";

/**
 * Contract response from the API.
 *
 * `documentUrl` is the storage-relative key (e.g.
 * `provider/4/2026/07/abc.pdf`) used by the backend to locate the file —
 * it is **not** a public link. The fully-qualified, public link is
 * `documentViewUrl`, which is what the UI should hand to `<a href>`.
 *
 * Always render with `documentViewUrl` when present; fall back to
 * `documentUrl` only if the backend omits the public link (older rows).
 *
 * Spec §6 — fields the server sends. Note that `otpCode` is **never**
 * returned (the server only sends the code via email to the owner and
 * surfaces `otpExpiresAt` for FE countdown).
 */
export interface Contract {
  id: string;
  projectWorkingId: string;
  title: string;
  partyInfo: string | null;
  terms: string | null;
  /**
   * `decimal?` server-side — the backend calls it "giá trị thoả thuận (tham
   * khảo)" and never requires one, so a contract can legitimately carry no
   * figure. Typed non-null, this crashed the contract card:
   * `contract.agreedValue.toLocaleString(...)` on a null.
   *
   * For contracts built from an accepted quotation this is filled from
   * `quotation.totalAmount` and is **immutable** on the edit endpoint
   * (spec §5.1 / §4.4).
   */
  agreedValue: number | null;
  documentUrl: string | null;
  documentViewUrl: string | null;
  /** Spec §5.3 — `yyyy-MM-dd` (DateOnly on the server). */
  executionStartAt: string | null;
  /** Spec §5.3 — `yyyy-MM-dd` (DateOnly on the server). */
  executionEndAt: string | null;
  /**
   * Derived server-side = `end − start + 1` (inclusive of both dates,
   * matching "thi công trong 90 ngày" semantics in spec §5.3).
   * `null` when either date is missing.
   */
  executionDurationDays: number | null;
  /**
   * ISO timestamp. Used by FE to render the countdown. The code itself
   * (`otpCode`) is never returned by the server — it lives in the
   * owner's email only.
   */
  otpExpiresAt: string | null;
  confirmedAt: string | null;
  /**
   * Account id of the owner who signed. The server pulls this from the
   * JWT, never from the request body, so the FE doesn't need to (and
   * shouldn't) send it back on `confirm-otp`.
   */
  confirmedBy: string | null;
  /**
   * Spec §5.1 — when set, the contract was built from an accepted
   * quotation: `agreedValue` is sourced from there, `agreedValue` cannot
   * be edited, and confirming generates `payment_batches` from
   * `quotation_payment_terms`.
   */
  quotationId: string | null;
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated response for GET /contracts.
 */
export interface ContractListResponse {
  items: Contract[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * Request body for POST /contracts (create contract).
 *
 * Spec §4.3 — the create flow takes BOTH a hand-draft shape (title +
 * agreedValue + optional terms / dates) AND a quotation-anchored shape
 * (quotationId → server fills agreedValue + executionEndAt). When
 * `quotationId` is set the server ignores any `agreedValue` the client
 * sends (it'd be a 409), so we keep both fields in the type but the
 * form UI only shows `agreedValue` when no quotation is picked.
 */
export interface CreateContractPayload {
  projectWorkingId: string;
  /**
   * Spec §5.1 — optional. Set when building the contract from an
   * already-accepted quotation. Server validates the quotation belongs
   * to the engagement and is in `accepted` status.
   */
  quotationId?: string;
  title: string;
  partyInfo?: string;
  terms?: string;
  /**
   * Only meaningful when `quotationId` is omitted. With a quotation the
   * server pulls this from `quotation.totalAmount` and ignores any
   * client value.
   */
  agreedValue?: number;
  documentUrl?: string;
  /** `yyyy-MM-dd`. */
  executionStartAt?: string;
  /**
   * `yyyy-MM-dd`. Spec §5.3 — when omitted but `quotationId` is set and
   * the quotation has `estimatedDurationDays`, the server derives this
   * as `start + days − 1`.
   */
  executionEndAt?: string;
}

/**
 * Request body for PUT /contracts/{id} (update contract).
 *
 * Spec §4.4 — all fields optional (null = no change). The server rejects
 * `agreedValue` here when the contract was built from a quotation.
 */
export interface UpdateContractPayload {
  title?: string;
  partyInfo?: string;
  terms?: string;
  /**
   * Sent only when the contract is hand-drafted (no `quotationId`).
   * The server returns 409 if a quotation-anchored contract tries to
   * change this — the FE also gates the input accordingly.
   */
  agreedValue?: number;
  documentUrl?: string;
  /** `yyyy-MM-dd`. */
  executionStartAt?: string;
  /** `yyyy-MM-dd`. */
  executionEndAt?: string;
}

/**
 * Request body for POST /contracts/{id}/confirm-otp.
 *
 * Spec §4.6 — only the OTP is sent from the client. The owner's account
 * id (`confirmedBy`) is derived server-side from the JWT so the
 * signature can't be forged by tampering with the body. Previous FE
 * versions shipped `confirmedBy` in the payload — that's been removed
 * here to match the spec.
 */
export interface ConfirmOtpPayload {
  otpCode: string;
}
