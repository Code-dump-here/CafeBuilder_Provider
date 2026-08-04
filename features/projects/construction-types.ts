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
  id: number;
  projectWorkingId: number;
  /** Parent milestone id. Null for top-level milestones. */
  parentId: number | null;
  name: string;
  description: string | null;
  /** Category label, e.g. "site-prep", "foundation", "finishing". */
  category: string | null;
  /** ISO date string — targeted completion date. */
  estimateAt: string | null;
  /** ISO date string — actual completion date (set when status = completed). */
  actualAt: string | null;
  status: ConstructionStatus;
  createdBy: number;
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
  projectWorkingId: number;
  parentId?: number | null;
  name: string;
  description?: string;
  category?: string;
  estimateAt?: string; // "yyyy-MM-dd"
  createdBy: number;
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
export interface SetConstructionItemStatusPayload {
  status: ConstructionStatus;
}

/**
 * A construction task = work item inside a milestone.
 */
export interface ConstructionTask {
  id: number;
  constructionItemId: number;
  name: string;
  description: string | null;
  /** ObjectName on storage bucket — internal reference. */
  imageUrl: string | null;
  /** Public absolute URL for img src. */
  imageViewUrl: string | null;
  /** ISO date string — targeted completion date. */
  estimateAt: string | null;
  /** ISO date string — actual completion date. */
  actualAt: string | null;
  /** Delay / disruption note. */
  reason: string | null;
  status: ConstructionStatus;
  createdBy: number;
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
  constructionItemId: number;
  name: string;
  description?: string;
  imageUrl?: string;
  estimateAt?: string; // "yyyy-MM-dd"
  createdBy: number;
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
