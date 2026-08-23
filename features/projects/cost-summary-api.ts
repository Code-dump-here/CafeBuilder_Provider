import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  ConstructionCostSummary,
  EngagementCostSummary,
} from "./cost-summary-types";

/**
 * Cost roll-up for every root milestone of an engagement.
 *
 * Endpoint: `GET /api/construction-items/cost-summary?projectWorkingId=`
 *
 * Only root milestones are summed at the top level — a child's cost is already
 * inside its parent's total, so adding both would double-count the subtree.
 */
export async function getEngagementCostSummaryApi(
  projectWorkingId: string,
  config?: RequestConfig,
): Promise<EngagementCostSummary> {
  const response = await api.get<EngagementCostSummary>(
    `/api/construction-items/cost-summary?projectWorkingId=${projectWorkingId}`,
    config,
  );
  return response.data;
}

/** Endpoint: `GET /api/construction-items/{id}/cost-summary` */
export async function getConstructionItemCostSummaryApi(
  constructionItemId: string,
  config?: RequestConfig,
): Promise<ConstructionCostSummary> {
  const response = await api.get<ConstructionCostSummary>(
    `/api/construction-items/${constructionItemId}/cost-summary`,
    config,
  );
  return response.data;
}
