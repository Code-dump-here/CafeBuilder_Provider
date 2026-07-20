/**
 * Project application (bid) types.
 *
 * Mirrors the wire contract for `POST /api/applies/apply`.
 * Designers and construction firms call this when they want to express
 * interest in an open marketplace post — backend creates an application
 * record pending owner review.
 */

/**
 * Request body for `POST /api/applies/apply`.
 *
 * `postId`          — the marketplace post being applied to.
 * `providerId`      — the account id of the applying provider (designer /
 *                     construction firm). Backend may derive this from the
 *                     JWT instead; the field stays on the wire for now so
 *                     admins can apply on behalf of a provider.
 * `proposal`        — free-form proposal the applicant writes to the owner.
 * `estimatedDurationDays` — self-reported timeline. Max int32 matches the
 *                     server's underlying `int` column.
 */
export interface ApplyToPostPayload {
  postId: number;
  providerId: number;
  proposal: string;
  estimatedDurationDays: number;
}

/**
 * Response from `POST /api/applies/apply`.
 *
 * Server returns the newly-created application record. Status is "pending"
 * until the post owner reviews the bid.
 */
export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface ProjectApplication {
  id: number;
  postId: number;
  providerId: number;
  proposal: string;
  estimatedDurationDays: number;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Full ApplyResponse from the API (GET /applies).
 * Includes additional fields from the joined post/project/provider data.
 */
export interface ApplyResponse {
  id: number;
  postId: number;
  postTitle: string;
  projectShopOwnerId: number;
  serviceProviderProfileId: number;
  providerDisplayName: string;
  proposal: string;
  estimatedDurationDays: number;
  status: ApplicationStatus;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated response for GET /applies.
 */
export interface AppliesListResponse {
  items: ApplyResponse[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}