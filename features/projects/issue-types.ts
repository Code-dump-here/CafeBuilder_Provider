/**
 * Issue types — mirrors the wire contracts for `api/issues`
 * (problems during work) and `api/issue-types` (issue catalog).
 */

/**
 * Lifecycle of an issue. Wider than construction tasks because
 * an issue can be reported, worked on, and ultimately closed
 * without ever touching the underlying task again.
 */
export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

export const ISSUE_STATUSES: IssueStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

/**
 * Issue severity levels — drives UI emphasis (pill color, badge).
 * Server returns it as part of `IssueResponse`; null when not set.
 */
export type IssueSeverity = "low" | "medium" | "high";

export const ISSUE_SEVERITIES: IssueSeverity[] = ["low", "medium", "high"];

/**
 * An issue (problem reported during construction work).
 *
 * Belongs to a project engagement. Optionally tied to a specific
 * milestone via `constructionItemId`; some issues are project-wide.
 */
export interface Issue {
  id: string;
  projectWorkingId: string;
  constructionItemId: string | null;
  issueTypeId: string;
  /** Resolved type name — denormalized for display. */
  issueTypeName: string;
  cause: string | null;
  reason: string | null;
  solution: string | null;
  /** URL to the "as found" photo (uploaded via /files/images). */
  issueImage: string | null;
  /** URL to the "as fixed" photo (uploaded via /files/images). */
  confirmImage: string | null;
  /** ISO date string — targeted fix date. */
  estimateAt: string | null;
  /** ISO date string — actual fix date. */
  actualAt: string | null;
  status: IssueStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated response for GET /issues.
 */
export interface IssueListResponse {
  items: Issue[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * Request body for POST /issues.
 *
 * Server fills `createdBy` from the auth context on the FE side so the
 * mutation hook can pass `0` until `useMe` resolves.
 */
export interface CreateIssuePayload {
  projectWorkingId: string;
  constructionItemId?: string | null;
  issueTypeId: string;
  cause?: string;
  reason?: string;
  solution?: string;
  issueImage?: string;
  confirmImage?: string;
  estimateAt?: string; // "yyyy-MM-dd"
  createdBy: string;
}

/**
 * Request body for PUT /issues/{id}.
 */
export interface UpdateIssuePayload {
  issueTypeId?: string;
  cause?: string;
  reason?: string;
  solution?: string;
  issueImage?: string;
  confirmImage?: string;
  estimateAt?: string;
}

/**
 * Request body for PUT /issues/{id}/status.
 */
export interface SetIssueStatusPayload {
  status: IssueStatus;
}

/**
 * Catalog entry from GET /issue-types.
 */
export interface IssueType {
  id: string;
  code: string;
  name: string;
}

/**
 * Request body for POST /issue-types (admin only — kept here so the
 * admin form has a typed payload when added later).
 */
export interface CreateIssueTypePayload {
  code: string;
  name: string;
}
