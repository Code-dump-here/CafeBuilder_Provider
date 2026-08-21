/**
 * Acceptance-checklist types — mirrors the wire contract for
 * `api/checklist-items`.
 *
 * Roles are split on purpose: the **provider** writes the list of things to be
 * checked; the **owner** marks each one passed or failed and says what needs
 * fixing. One party doing both would make sign-off self-certified.
 *
 * These now gate real transitions. A required item that is not `passed` blocks
 * closing its milestone, approving its design, and accepting the engagement.
 */

export type ChecklistStatus = "pending" | "passed" | "failed";

export interface ChecklistItem {
  id: string;
  /** Set when the item belongs to a design. Null for construction items. */
  designId: string | null;
  /** Set when the item belongs to a milestone. Null for designs. */
  constructionItemId: string | null;
  name: string;
  description: string | null;
  sortOrder: number;
  /** Only required items block sign-off. Optional ones are advisory. */
  isRequired: boolean;
  status: ChecklistStatus;
  /** Storage object name for the evidence file. */
  evidenceUrl: string | null;
  /** Absolute URL for viewing the evidence. */
  evidenceViewUrl: string | null;
  /** The owner's note — mandatory when failing an item. */
  note: string | null;
  checkedBy: string | null;
  checkedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItemListResponse {
  items: ChecklistItem[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/** One line in a create request. */
export interface ChecklistItemInput {
  name: string;
  description?: string;
  isRequired?: boolean;
}

/** Send exactly one of `designId` / `constructionItemId`. */
export interface CreateChecklistItemsPayload {
  designId?: string;
  constructionItemId?: string;
  items: ChecklistItemInput[];
}

export interface UpdateChecklistItemPayload {
  name?: string;
  description?: string;
  isRequired?: boolean;
  sortOrder?: number;
}

/**
 * Owner's verdict. `status` accepts only `passed` / `failed`; the server
 * rejects `failed` without a note, so the provider always learns what to fix.
 */
export interface CheckChecklistItemPayload {
  status: Exclude<ChecklistStatus, "pending">;
  note?: string;
  evidenceUrl?: string;
}

export interface AttachChecklistEvidencePayload {
  evidenceUrl: string;
}

/** Counts used to explain, up front, why sign-off is blocked. */
export interface ChecklistProgress {
  total: number;
  requiredTotal: number;
  requiredPassed: number;
  requiredPending: number;
  requiredFailed: number;
  /** True when every required item has passed. */
  isSatisfied: boolean;
}

export function summarizeChecklist(items: ChecklistItem[]): ChecklistProgress {
  const required = items.filter((i) => i.isRequired);
  const requiredPassed = required.filter((i) => i.status === "passed").length;
  const requiredPending = required.filter((i) => i.status === "pending").length;
  const requiredFailed = required.filter((i) => i.status === "failed").length;

  return {
    total: items.length,
    requiredTotal: required.length,
    requiredPassed,
    requiredPending,
    requiredFailed,
    isSatisfied: requiredPending === 0 && requiredFailed === 0,
  };
}
