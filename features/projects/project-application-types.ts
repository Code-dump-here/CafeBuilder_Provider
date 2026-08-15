/**
 * Project application (bid) types.
 *
 * Mirrors the wire contract for `POST /api/applies/apply`.
 * Designers and construction firms call this when they want to express
 * interest in an open marketplace post — backend creates an application
 * record pending owner review.
 */

/**
 * Request body for `POST /api/applies/apply` — mirrors `CreateApplyRequest`.
 *
 * `postId`          — the marketplace post being applied to.
 * `proposal`        — free-form proposal the applicant writes to the owner.
 * `estimatedDurationDays` — self-reported timeline, optional (`int?` server
 *                     side), constrained to `[1, int32]` when present.
 *
 * There is deliberately no `providerId`: the server resolves the applying
 * `ServiceProviderProfile` from the bearer token and ignores anything the
 * client sends. (A `providerId` field used to live here, described as an
 * admin apply-on-behalf-of hook — no such path exists on the backend.)
 */
export interface ApplyToPostPayload {
  postId: number;
  proposal: string;
  estimatedDurationDays?: number;
}

/**
 * Request body for `PUT /api/applies/{id}/proposal` — mirrors
 * `UpdateApplyRequest`. Both fields are optional: the server only writes
 * the ones present, so this doubles as a partial update.
 *
 * Accepted only while the application is still `pending`; the server
 * answers 409 once the owner has accepted or rejected it.
 */
export interface UpdateApplyProposalPayload {
  proposal?: string;
  estimatedDurationDays?: number;
}

/**
 * Lifecycle of an application. Mirrors the backend `ApplicationStatus`
 * enum exactly — three members, no more.
 *
 * There is no `withdrawn`: `DELETE /api/applies/{id}/withdraw` hard-deletes
 * the row (`_repository.Delete`), so a withdrawn application stops existing
 * rather than changing status. Code that rendered a `withdrawn` badge was
 * waiting for a state the server can never send.
 */
export type ApplicationStatus = "pending" | "accepted" | "rejected";

/**
 * An application record as the API returns it — from `POST /applies/apply`,
 * `GET /applies`, `GET /applies/{id}`, and `PUT /applies/{id}/proposal`
 * alike. All four hand back the same `ApplyResponse` shape.
 *
 * `postTitle`, `projectShopOwnerId` and `providerDisplayName` come from
 * joined rows and are null when the server didn't include the relation.
 * `estimatedDurationDays` is `int?` server-side.
 */
export interface ApplyResponse {
  id: number;
  postId: number;
  postTitle: string | null;
  projectShopOwnerId: number | null;
  serviceProviderProfileId: number;
  providerDisplayName: string | null;
  proposal: string;
  estimatedDurationDays: number | null;
  status: ApplicationStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Alias kept for call sites that talk about "the application I just
 * created". The wire shape is identical to every other apply response —
 * this used to be a separate interface declaring a `providerId` field the
 * server never sends.
 */
export type ProjectApplication = ApplyResponse;

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
