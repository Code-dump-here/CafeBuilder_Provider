/**
 * Construction types — mirrors the wire contracts for
 * `api/construction-items` (milestones) and `api/construction-tasks`.
 *
 * A project can have two levels of milestone nesting via `parentId`
 * (root milestones have parentId === null; children point at a root).
 * Tasks belong to a single milestone via `constructionItemId`.
 *
 * Field naming follows the new API spec
 * (see `construction.md`):
 *   • 4 calendar anchors — `startAt`, `estimateAt`, `actualStartAt`, `actualAt`.
 *   • Two server-computed duration fields — `plannedDurationDays`,
 *     `actualDurationDays` — null when an anchor is missing.
 *   • Two labor-cost columns — `estimatedLaborCost`, `actualLaborCost` —
 *     both nullable; null means "not yet recorded", not zero.
 */

/**
 * Status of a construction item (milestone) or task.
 * Sequential only: pending → in_progress → completed.
 */
export type ConstructionStatus = "pending" | "in_progress" | "completed";

export const CONSTRUCTION_STATUSES: readonly ConstructionStatus[] = [
  "pending",
  "in_progress",
  "completed",
] as const;

/**
 * A construction item = milestone (e.g. "Site Prep", "Foundation", "Framing").
 * Can be a top-level milestone or a sub-milestone via `parentId`.
 */
export interface ConstructionItem {
  id: string;
  projectWorkingId: string;
  /** Parent milestone id. Null for top-level milestones. */
  parentId: string | null;
  name: string;
  description: string | null;
  /** Category label (free-text), e.g. "Kết cấu", "Nội thất". */
  category: string | null;
  /**
   * Where the provider placed this milestone among its siblings — lower first.
   *
   * The server orders by this before any date, so it is what drag-and-drop
   * writes. Optional because a response from before the column existed has no
   * value for it; `byPlanOrder` treats a missing one as 0 so those rows keep
   * falling back to the schedule dates rather than jumping to the end.
   */
  sortOrder?: number;
  /** ISO date string — planned start. With `estimateAt`, this is the real span. */
  startAt: string | null;
  /** ISO date string — targeted completion date. Cannot be in the past at write time. */
  estimateAt: string | null;
  /** ISO date string — when work actually began. Service fills on `pending → in_progress`. */
  actualStartAt: string | null;
  /** ISO date string — actual completion date. Service fills on `→ completed`. */
  actualAt: string | null;
  /** BE-computed: `EstimateAt − StartAt` in days (inclusive). Null if either anchor is missing. */
  plannedDurationDays: number | null;
  /** BE-computed: `ActualAt − ActualStartAt` in days (inclusive). Null while not finished. */
  actualDurationDays: number | null;
  /** Provider's labor estimate for the item itself (excludes tasks). */
  estimatedLaborCost: number | null;
  /** Provider's recorded actual labor cost. Null until reconciled. */
  actualLaborCost: number | null;
  status: ConstructionStatus;
  /**
   * Whether a payment batch covering this milestone has been confirmed by the
   * provider. Maintained server-side from `payment_batches`; read-only here.
   *
   * Optional so older responses (and any caller that hasn't refetched) stay
   * valid rather than rendering "unpaid" from a missing field.
   */
  isPaid?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated response for GET /construction-items.
 */
export interface ConstructionItemListResponse {
  items: ConstructionItem[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * Request body for POST /construction-items.
 */
export interface CreateConstructionItemPayload {
  projectWorkingId: string;
  /** Optional. Null = top-level milestone; otherwise must point at a root milestone. */
  parentId?: string | null;
  /** Required. */
  name: string;
  description?: string;
  category?: string;
  startAt?: string; // "yyyy-MM-dd"
  /** Optional. Cannot be before today. */
  estimateAt?: string; // "yyyy-MM-dd"
  /** Optional. Labor estimate for the item itself (excluding tasks). */
  estimatedLaborCost?: number;
}

/**
 * Request body for PUT /construction-items/{id}.
 *
 * All fields optional. `estimateAt`, if present, is re-checked for not-in-past.
 * Status changes go through the dedicated `/status` endpoint — not here.
 */
export interface UpdateConstructionItemPayload {
  name?: string;
  description?: string;
  category?: string;
  startAt?: string; // "yyyy-MM-dd"
  estimateAt?: string; // "yyyy-MM-dd"
  actualStartAt?: string; // "yyyy-MM-dd"
  actualAt?: string; // "yyyy-MM-dd"
  estimatedLaborCost?: number;
  actualLaborCost?: number;
}

/**
 * Request body for PUT /construction-items/{id}/status.
 */
export interface SetConstructionItemStatusPayload {
  status: ConstructionStatus;
}

/**
 * Reorder one sibling group of milestones.
 *
 * The whole group goes on the wire, not a "moved X above Y" instruction: the
 * client already knows the order it wants, and sending it whole means two open
 * tabs cannot interleave into an order neither of them chose.
 *
 * Completed milestones cannot be reordered (server returns 409); the client
 * only sends the IDs of the non-completed siblings and leaves the locked ones
 * in their fixed relative positions.
 */
export interface ReorderConstructionItemsPayload {
  projectWorkingId: string;
  /** Null for the top-level milestones; a milestone id for its children. */
  parentId: string | null;
  /** Every non-completed id in the group, in the wanted order. */
  itemIds: string[];
}

/**
 * A construction task = work item inside a milestone.
 */
export interface ConstructionTask {
  id: string;
  constructionItemId: string;
  name: string;
  description: string | null;
  /** ObjectName on storage bucket — internal reference. */
  imageUrl: string | null;
  /** Public absolute URL for img src. */
  imageViewUrl: string | null;
  /** ISO date string — planned start. With `estimateAt`, this is the real span. */
  startAt: string | null;
  /** ISO date string — targeted completion date. Cannot be in the past at write time. */
  estimateAt: string | null;
  /** ISO date string — when work actually began. */
  actualStartAt: string | null;
  /** ISO date string — actual completion date. */
  actualAt: string | null;
  /** BE-computed durations, mirrors the item shape. */
  plannedDurationDays: number | null;
  actualDurationDays: number | null;
  /** Provider's labor estimate / recorded actual for this task. */
  estimatedLaborCost: number | null;
  actualLaborCost: number | null;
  /** Delay / disruption note. */
  reason: string | null;
  status: ConstructionStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated response for GET /construction-tasks.
 */
export interface ConstructionTaskListResponse {
  items: ConstructionTask[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * Request body for POST /construction-tasks.
 */
export interface CreateConstructionTaskPayload {
  /** Required. Parent milestone id. */
  constructionItemId: string;
  /** Required. */
  name: string;
  description?: string;
  /** Optional. ObjectName returned from `/api/files` — the absolute URL is
   * derived server-side as `imageViewUrl`. */
  imageUrl?: string;
  startAt?: string; // "yyyy-MM-dd"
  /** Optional. Cannot be before today. */
  estimateAt?: string; // "yyyy-MM-dd"
  estimatedLaborCost?: number;
}

/**
 * Request body for PUT /construction-tasks/{id}.
 *
 * All fields optional. Status changes go through the dedicated `/status` endpoint.
 */
export interface UpdateConstructionTaskPayload {
  name?: string;
  description?: string;
  imageUrl?: string;
  startAt?: string; // "yyyy-MM-dd"
  estimateAt?: string; // "yyyy-MM-dd"
  actualStartAt?: string; // "yyyy-MM-dd"
  actualAt?: string; // "yyyy-MM-dd"
  estimatedLaborCost?: number;
  actualLaborCost?: number;
  reason?: string;
}

/**
 * Request body for PUT /construction-tasks/{id}/status.
 */
export interface SetConstructionTaskStatusPayload {
  status: ConstructionStatus;
}
