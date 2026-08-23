/**
 * Construction cost roll-up types — mirrors `api/construction-items/cost-summary`.
 *
 * Two costs make up a milestone: labour/equipment, declared directly on the
 * item, and materials, which come from the per-line quantities. They are kept
 * apart all the way up because they are estimated by different people at
 * different times.
 *
 * Every `actual*` field is nullable on purpose. While any line is still
 * missing its real figure the server returns `null` and reports the count
 * instead — half a sum presented as "actual cost" reads as authoritative while
 * being wrong.
 */

export interface ConstructionCostSummary {
  constructionItemId: string;
  name: string;
  category: string | null;
  status: string;

  estimatedLaborCost: number;
  actualLaborCost: number | null;
  estimatedMaterialCost: number;
  actualMaterialCost: number | null;

  /** This milestone alone: labour + materials, excluding children. */
  estimatedCost: number;
  actualCost: number | null;

  /** Everything below it in the tree. */
  childrenEstimatedCost: number;
  childrenActualCost: number | null;

  /** Own + children. This is the figure to show against a milestone. */
  totalEstimatedCost: number;
  totalActualCost: number | null;

  /** actual − estimated. Positive means over budget. Null until actuals land. */
  variance: number | null;

  missingActualMaterialLines: number;
  missingActualLaborLines: number;

  /** `yyyy-MM-dd`. Planned window; duration needs both ends. */
  startAt: string | null;
  estimateAt: string | null;
  plannedDurationDays: number | null;
  actualDurationDays: number | null;

  children: ConstructionCostSummary[];
}

/** The same roll-up across every root milestone of an engagement. */
export interface EngagementCostSummary {
  projectWorkingId: string;
  estimatedLaborCost: number;
  actualLaborCost: number | null;
  estimatedMaterialCost: number;
  actualMaterialCost: number | null;
  totalEstimatedCost: number;
  totalActualCost: number | null;
  variance: number | null;
  missingActualMaterialLines: number;
  missingActualLaborLines: number;
  rootItemCount: number;
  items: ConstructionCostSummary[];

  /**
   * Change orders both sides accepted. Real money on this engagement that sits
   * outside the milestone tree, so the construction figures alone understate
   * what the job costs.
   */
  acceptedChangeOrderAmount: number;
  /** Change orders still awaiting a decision — not committed money yet. */
  pendingChangeOrderAmount: number;
  /** `totalEstimatedCost + acceptedChangeOrderAmount`. */
  totalEstimatedCostWithChangeOrders: number;
}
