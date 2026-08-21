/**
 * Material types — mirrors the wire contract for `api/materials`.
 *
 * Two tiers, deliberately separate:
 *
 *  1. **Price list** (`Material`) — what materials exist on this engagement and
 *     what one unit costs. Published *before* work starts, so the owner has
 *     agreed the rate before anything is consumed.
 *  2. **Usage** (`ConstructionMaterial`) — a milestone or task drawing on that
 *     list: how much is planned, and later how much was actually used.
 *
 * IDs are strings: the backend keys everything by `uuid`. Most of this app
 * still types ids as `number`, which predates that change — new modules use
 * the correct type and callers coerce at the boundary.
 */

/** Unit of measure. Fixed server-side so unit prices stay addable. */
export type MaterialUnit =
  | "md"
  | "m2"
  | "m3"
  | "kg"
  | "litre"
  | "item"
  | "set"
  | "manday";

export const MATERIAL_UNITS: readonly MaterialUnit[] = [
  "md",
  "m2",
  "m3",
  "kg",
  "litre",
  "item",
  "set",
  "manday",
] as const;

/** A published price-list row. */
export interface Material {
  id: string;
  projectWorkingId: string;
  name: string;
  description: string | null;
  unit: MaterialUnit;
  unitPrice: number;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialListResponse {
  items: Material[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface CreateMaterialPayload {
  projectWorkingId: string;
  name: string;
  description?: string;
  unit: MaterialUnit;
  unitPrice: number;
  sortOrder?: number;
}

export interface UpdateMaterialPayload {
  name?: string;
  description?: string;
  unit?: MaterialUnit;
  unitPrice?: number;
  sortOrder?: number;
}

/**
 * One "this milestone/task uses N of material X" line.
 *
 * `unitPrice` is the rate captured when the material was picked, not a live
 * read of the price list — repricing later must not silently restate work
 * that was already costed.
 */
export interface ConstructionMaterial {
  id: string;
  constructionItemId: string | null;
  constructionTaskId: string | null;
  materialId: string;
  materialName: string;
  unit: MaterialUnit;
  unitPrice: number;
  estimatedQuantity: number;
  /** Null until the work has been done and the real figure recorded. */
  actualQuantity: number | null;
  estimatedCost: number;
  actualCost: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConstructionMaterialPayload {
  /** Send exactly one of these two. */
  constructionItemId?: string;
  constructionTaskId?: string;
  materialId: string;
  estimatedQuantity: number;
  note?: string;
}

export interface UpdateConstructionMaterialPayload {
  estimatedQuantity?: number;
  /** Rejected by the server while the work is still `pending`. */
  actualQuantity?: number;
  note?: string;
}

/**
 * Cost roll-up for a milestone: its own lines plus every child task's.
 *
 * `totalActualCost` is null while any line is still missing its actual
 * quantity — a partial sum presented as "actual cost" reads as authoritative
 * while being wrong, so the server withholds it and reports how many lines
 * are outstanding instead.
 */
export interface MaterialCostSummary {
  constructionItemId: string;
  ownEstimatedCost: number;
  ownActualCost: number | null;
  tasksEstimatedCost: number;
  tasksActualCost: number | null;
  totalEstimatedCost: number;
  totalActualCost: number | null;
  missingActualCount: number;
  lines: ConstructionMaterial[];
}
