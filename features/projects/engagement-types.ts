/**
 * Engagement (Project Working) types — mirrors the wire contract for `api/project-workings`.
 *
 * An engagement represents the relationship between a project owner and a
 * service provider. It can be created via:
 *   - Path A: owner posts → provider applies → owner accepts (creates engagement)
 *   - Path B: owner direct-requests → provider accepts
 */

/**
 * Engagement status lifecycle:
 *   - `requested`  — owner invited provider, awaiting response.
 *   - `accepted`   — provider accepted, engagement is active.
 *   - `rejected`   — provider declined the invitation.
 *   - `completed`  — engagement finished (owner marks it complete).
 *   - `terminated` — engagement ended early (owner or provider terminated).
 */
export type EngagementStatus =
  | "requested"
  | "accepted"
  | "rejected"
  | "completed"
  | "terminated";

/**
 * Scope of the engagement — what the provider is hired to do:
 *   - `design`       — design only.
 *   - `construction` — construction only.
 *   - `both`         — full design + build turnkey.
 */
export type EngagementContractType = "design" | "construction" | "both";

/**
 * Provider type:
 *   - `individual` — solo practitioner.
 *   - `company`     — registered business.
 */
export type EngagementProviderType = "individual" | "company";

/**
 * Provider capability (what they can do in general):
 *   - `designer`      — design services only.
 *   - `constructor`    — construction services only.
 *   - `both`           — can do both.
 */
export type EngagementCapability = "designer" | "constructor" | "both";

/**
 * Engagement response from `GET /api/project-workings/{id}`.
 *
 * Added by the close-collaboration flow (`a.md` §1, §4.1, §4.3):
 *   - `hasConfirmedContract`  — contract reached `confirmed` state.
 *   - `completionRequestedAt` — ISO timestamp set when the provider
 *                                tapped "Báo hoàn thành". `null` while
 *                                pending or after a successful complete.
 *   - `completionRequestNote` — optional note (≤ 1000 chars) the
 *                                provider sent with the request.
 *   - `isAwaitingAcceptance`  — backend-computed flag: `true` from the
 *                                moment the provider requested
 *                                completion until the owner accepted.
 *   - `contract`              — denormalised contract summary so the
 *                                UI can render a "View contract" link
 *                                next to the lifecycle CTAs.
 */
export interface Engagement {
  id: number;
  projectShopOwnerId: number;
  projectName: string;
  serviceProviderProfileId: number;
  providerDisplayName: string;
  applyId: number | null;
  contractType: EngagementContractType;
  status: EngagementStatus;
  requestMessage: string | null;
  startedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Convenience flag the backend denormalises for the UI. */
  hasConfirmedContract: boolean;
  /** When the provider last tapped "Báo hoàn thành"; `null` if never. */
  completionRequestedAt: string | null;
  /** Free-form note accompanying the request (≤ 1000 chars) or `null`. */
  completionRequestNote: string | null;
  /** `true` when the provider has requested completion but the owner has not accepted. */
  isAwaitingAcceptance: boolean;
  /**
   * Ending a running engagement takes both sides. One party requests, the
   * other approves; until then the status stays `accepted`.
   */
  terminationRequestedAt: string | null;
  /** Which side asked to end it: `"owner"` | `"provider"` | `null`. */
  terminationRequestedBy: "owner" | "provider" | null;
  /** Reason the requesting side supplied (≤ 1000 chars) or `null`. */
  terminationRequestNote: string | null;
  /** Set once both sides agreed; `null` while the engagement is live. */
  terminatedAt: string | null;
  /** Server-derived: a request is pending the other side's answer. */
  isAwaitingTerminationApproval: boolean;
  /** Denormalised contract summary; `null` while no contract exists. */
  contract: EngagementContractSummary | null;
}

/**
 * Lightweight contract summary embedded in an engagement response.
 * Mirrors the wire shape returned alongside `Engagement`.
 */
export interface EngagementContractSummary {
  id: number;
  title: string;
  agreedValue: number;
  status: string;
  /** ISO timestamp when the contract was confirmed; `null` otherwise. */
  confirmedAt: string | null;
  createdAt: string;
}

/**
 * Engagement with additional provider details (for list views).
 */
export interface EngagementWithProvider extends Engagement {
  providerType: EngagementProviderType;
  capability: EngagementCapability;
  isVerified: boolean;
  avgRating: number | null;
}

/**
 * Paginated response for GET /api/project-workings.
 */
export interface EngagementListResponse {
  items: EngagementWithProvider[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * Simplified design brief for engagement overview.
 */
export interface EngagementBriefSummary {
  id: number;
  targetCustomer: string;
  style: string;
  mood: string;
}

/**
 * AI recommendation summary for engagement overview.
 */
export interface EngagementAiSummary {
  id: number;
  conceptSummary: string;
  state: string;
}

/**
 * Approved design summary for engagement overview.
 */
export interface EngagementDesignSummary {
  id: number;
  title: string;
  version: number;
}

/**
 * Engagement overview response from `GET /api/project-workings/{id}/overview`.
 */
export interface EngagementOverview {
  projectWorkingId: number;
  contractType: EngagementContractType;
  status: EngagementStatus;
  projectShopOwner: {
    id: number;
    name: string;
    address: string;
    areaM2: number | null;
    budget: number | null;
    status: string;
  };
  brief: EngagementBriefSummary | null;
  aiRecommendations: EngagementAiSummary[];
  approvedDesigns: EngagementDesignSummary[];
}

/**
 * Request body for PUT /api/project-workings/{id}/status.
 */
export interface UpdateEngagementStatusPayload {
  status: "completed" | "terminated";
}
