/**
 * Construction types — mirrors the wire contracts for
 * `api/construction-items` (milestones) and `api/construction-tasks`.
 *
 * A project can have multiple levels of milestone nesting via `parentId`.
 * Tasks belong to a single milestone via `constructionItemId`.
 */

/**
 * Status of a construction item (milestone) or task.
 * Sequential only: pending → in_progress → completed.
 */
export type ConstructionStatus = "pending" | "in_progress" | "completed";

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
  /** Category label, e.g. "site-prep", "foundation", "finishing". */
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
  /** ISO date string — targeted completion date. */
  estimateAt: string | null;
  /** ISO date string — when work actually began. */
  actualStartAt: string | null;
  /** ISO date string — actual completion date (set when status = completed). */
  actualAt: string | null;
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
  parentId?: string | null;
  name: string;
  description?: string;
  category?: string;
  estimateAt?: string; // "yyyy-MM-dd"
}

/**
 * Request body for PUT /construction-items/{id}.
 */
export interface UpdateConstructionItemPayload {
  name?: string;
  description?: string;
  category?: string;
  estimateAt?: string; // "yyyy-MM-dd"
}

/**
 * Request body for PUT /construction-items/{id}/status.
 */
/**
 * Reorder one sibling group of milestones.
 *
 * The whole group goes on the wire, not a "moved X above Y" instruction: the
 * client already knows the order it wants, and sending it whole means two open
 * tabs cannot interleave into an order neither of them chose.
 */
export interface ReorderConstructionItemsPayload {
  projectWorkingId: string;
  /** Null for the top-level milestones; a milestone id for its children. */
  parentId: string | null;
  /** Every id in the group, in the wanted order. */
  itemIds: string[];
}

export interface SetConstructionItemStatusPayload {
  status: ConstructionStatus;
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
  /** ISO date string — targeted completion date. */
  estimateAt: string | null;
  /** ISO date string — when work actually began. */
  actualStartAt: string | null;
  /** ISO date string — actual completion date. */
  actualAt: string | null;
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
  constructionItemId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  estimateAt?: string; // "yyyy-MM-dd"
}

/**
 * Request body for PUT /construction-tasks/{id}.
 */
export interface UpdateConstructionTaskPayload {
  name?: string;
  description?: string;
  imageUrl?: string;
  estimateAt?: string; // "yyyy-MM-dd"
  reason?: string;
}

/**
 * Request body for PUT /construction-tasks/{id}/status.
 */
export interface SetConstructionTaskStatusPayload {
  status: ConstructionStatus;
}
