/**
 * Cost summary types — mirrors the wire contracts for
 * `GET /api/construction-items/{id}/cost-summary` and
 * `GET /api/construction-items/cost-summary?projectWorkingId=`.
 *
 * The two endpoints share most fields, so we model `EngagementCostSummary`
 * as a thin extension of the per-item shape: an engagement summary is the
 * sum across every root milestone plus change-order amounts, and it carries
 * a list of per-root-milestone summaries so the UI can drill down without a
 * second round-trip.
 *
 * Two invariants are baked into the type system:
 *
 * 1. **`null` vs `0` matters.** `actual*` fields are `null` (not `0`) when
 *    *any* contributing line is still unreconciled — that's the
 *    "missing-actual" signal. Forcing these to `0` would make the dashboard
 *    think the project came in on budget when it actually hasn't been
 *    finished yet. See `MissingActual` counters in each response.
 *
 * 2. **`variance` follows the same rule.** `null` when actuals aren't
 *    available; a number once the project is fully reconciled.
 */

import type { ConstructionStatus } from "./construction-types";

/**
 * Per-milestone cost roll-up. Returned both as a top-level "drill into this
 * phase" object and as a child node under a parent milestone / engagement.
 */
export interface ConstructionCostSummary {
  constructionItemId: string;
  name: string;
  category: string | null;
  status: ConstructionStatus;

  /** Provider's labor estimate — own + nested tasks. */
  estimatedLaborCost: number | null;
  /** Provider's recorded actual labor. Null while any line is unreconciled. */
  actualLaborCost: number | null;
  /** Material cost estimate (qty × price snapshot at selection time). */
  estimatedMaterialCost: number | null;
  /** Material actual cost. Null while any usage line lacks actualQuantity. */
  actualMaterialCost: number | null;
  /** `estimatedLabor + estimatedMaterial`. */
  estimatedCost: number | null;
  /** `actualLabor + actualMaterial`, or `null` if any sub-cost is null. */
  actualCost: number | null;

  /** Aggregate across direct child milestones (excluding own + tasks). */
  childrenEstimatedCost: number;
  childrenActualCost: number | null;
  /** `estimatedCost + childrenEstimatedCost` — the full subtree total. */
  totalEstimatedCost: number | null;
  /** `actualCost + childrenActualCost`, or `null` if any sub-cost is null. */
  totalActualCost: number | null;
  /** `totalActual − totalEstimated`, or `null` until fully reconciled. */
  variance: number | null;

  /** Material usage lines still missing their `actualQuantity`. */
  missingActualMaterialLines: number;
  /** Labor lines (own + tasks) still missing `actualLaborCost`. */
  missingActualLaborLines: number;

  startAt: string | null;
  estimateAt: string | null;
  plannedDurationDays: number | null;
  actualDurationDays: number | null;

  /** Recursive — children of this milestone, each shaped the same way. */
  children: ConstructionCostSummary[];
}

/**
 * Engagement-wide cost summary. Always includes change-order amounts so
 * the dashboard can show the "with change orders" total without a second
 * call into the change-orders endpoint.
 */
export interface EngagementCostSummary {
  projectWorkingId: string;

  estimatedLaborCost: number | null;
  actualLaborCost: number | null;
  estimatedMaterialCost: number | null;
  actualMaterialCost: number | null;

  totalEstimatedCost: number | null;
  totalActualCost: number | null;
  variance: number | null;

  missingActualMaterialLines: number;
  missingActualLaborLines: number;

  /** Number of root milestones that contributed to this roll-up. */
  rootItemCount: number;

  /** Sum of change orders the owner / provider have both signed off. */
  acceptedChangeOrderAmount: number;
  /** Sum of change orders awaiting an answer — not counted as debt yet. */
  pendingChangeOrderAmount: number;
  /** `totalEstimated + acceptedChangeOrderAmount` — the headline figure. */
  totalEstimatedCostWithChangeOrders: number | null;

  /** Per-root-milestone summaries, each with their own `children` tree. */
  items: ConstructionCostSummary[];
}
