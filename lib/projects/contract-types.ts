/**
 * Contract types — mirrors the wire contract for `api/contracts`.
 *
 * Contracts are created by providers and confirmed by owners via OTP.
 * `confirmed` status unlocks designs & construction items.
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
 */
export interface Contract {
  id: number;
  projectWorkingId: number;
  title: string;
  partyInfo: string | null;
  terms: string | null;
  agreedValue: number;
  documentUrl: string | null;
  otpExpiresAt: string | null;
  confirmedAt: string | null;
  confirmedBy: number | null;
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
 */
export interface CreateContractPayload {
  projectWorkingId: number;
  title: string;
  partyInfo?: string;
  terms?: string;
  agreedValue: number;
  documentUrl?: string;
}

/**
 * Request body for PUT /contracts/{id} (update contract).
 * All fields optional — only include what you want to update.
 */
export interface UpdateContractPayload {
  title?: string;
  partyInfo?: string;
  terms?: string;
  agreedValue?: number;
  documentUrl?: string;
}

/**
 * Request body for POST /contracts/{id}/confirm-otp.
 */
export interface ConfirmOtpPayload {
  otpCode: string;
  confirmedBy: number;
}
