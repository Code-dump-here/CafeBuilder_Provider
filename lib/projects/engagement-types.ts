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
