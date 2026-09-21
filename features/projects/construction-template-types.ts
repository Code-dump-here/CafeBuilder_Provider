/**
 * Reusable construction/design process templates (review 3: "add thêm template
 * cho quá trình thi công").
 *
 * A template is a plan shape, not a plan: applying one COPIES its items and
 * tasks into `construction_items` / `construction_tasks` and then forgets the
 * link. Editing a template afterwards never moves a project that already
 * applied it — a live schedule shifting under a running site is exactly what
 * the copy is there to prevent.
 */

/** Which side of the job a template is written for. */
export type TemplateServiceKind = "design" | "construction" | "both";

/** One task inside a template item. Maps to `ConstructionTemplateTaskResponse`. */
export interface ConstructionTemplateTask {
  id: string;
  name: string;
  description: string | null;
  /** Working days this task is expected to take. Null when unestimated. */
  estimateDays: number | null;
  sortOrder: number;
}

/**
 * One phase in the template — becomes a `ConstructionItem` when applied.
 * Maps to `ConstructionTemplateItemResponse`.
 */
export interface ConstructionTemplateItem {
  id: string;
  name: string;
  description: string | null;
  /** Trade grouping: MEP, trần nhà, nội thất… ("hạng mục liên quan" in review 3). */
  category: string | null;
  /** Working days for the whole phase; drives how `estimateAt` is spread on apply. */
  estimateDays: number | null;
  sortOrder: number;
  tasks: ConstructionTemplateTask[];
}

export interface ConstructionTemplate {
  id: string;
  name: string;
  description: string | null;
  serviceKind: TemplateServiceKind;
  /**
   * True for the system's built-in templates, which every provider can see and
   * nobody but an admin can delete. A provider's own templates are private —
   * on a shared marketplace, one provider's process is not another's to read.
   */
  isPublic: boolean;
  /** Account that authored it; null on the seeded system templates. */
  createdBy: string | null;
  /** Sum of the items' `estimateDays`, computed server-side. */
  totalEstimateDays: number;
  items: ConstructionTemplateItem[];
  createdAt: string;
}

export interface ConstructionTemplateListResponse {
  items: ConstructionTemplate[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/** One task line when authoring a template. */
export interface ConstructionTemplateTaskInput {
  name: string;
  description?: string | null;
  estimateDays?: number | null;
}

/** One phase when authoring a template. */
export interface ConstructionTemplateItemInput {
  name: string;
  description?: string | null;
  category?: string | null;
  estimateDays?: number | null;
  tasks: ConstructionTemplateTaskInput[];
}

/**
 * Create payload. `isPublic` is deliberately absent: the server forces every
 * provider-authored template private, so offering the choice here would be a
 * control that silently does nothing.
 */
export interface CreateConstructionTemplatePayload {
  name: string;
  description?: string | null;
  serviceKind?: TemplateServiceKind;
  items: ConstructionTemplateItemInput[];
}

/**
 * Reorder a template's phases.
 *
 * The whole list goes on the wire for the same reason milestones do: the client
 * already knows the order it wants, and sending it whole means two editors
 * cannot interleave into an order neither of them chose.
 */
export interface ReorderConstructionTemplateItemsPayload {
  itemIds: string[];
}

export interface ApplyConstructionTemplatePayload {
  projectWorkingId: string;
  /** ISO `yyyy-MM-dd`. Omitted means today. Must not be in the past. */
  startDate?: string;
}

/** What the server reports back after copying a template onto a project. */
export interface ApplyConstructionTemplateResult {
  constructionTemplateId: string;
  projectWorkingId: string;
  createdItems: number;
  createdTasks: number;
  /** ISO `yyyy-MM-dd` the generated schedule runs to. */
  plannedFinishAt: string;
}
