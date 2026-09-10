"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getConstructionItemCostSummaryApi,
  getEngagementCostSummaryApi,
} from "./cost-summary-api";
import type {
  ConstructionCostSummary,
  EngagementCostSummary,
} from "./cost-summary-types";

/** The two query-key roots below, in one place so callers cannot mistype them. */
export const COST_SUMMARY_KEYS = [
  "engagement-cost-summary",
  "construction-item-cost-summary",
] as const;

/**
 * Marks every cost-summary query stale.
 *
 * Cost rolls up milestone status, labour and material actuals, so anything that
 * moves one of those has to reach these queries — and nothing did. The only
 * invalidation in the codebase asked for the key `["cost-summary"]`, which is
 * not a prefix of either root above; TanStack matches keys by prefix, so that
 * call had always matched zero queries.
 *
 * It went unnoticed because the card usually looked right: `staleTime` is 30s,
 * so navigating back to it later refetches on mount. A card already on screen
 * is the case that stays wrong — `refetchOnWindowFocus` is off globally, so
 * without this nothing ever tells it to look again.
 */
export function useInvalidateCostSummaries() {
  const queryClient = useQueryClient();
  return React.useCallback(() => {
    for (const key of COST_SUMMARY_KEYS) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);
}

export function useEngagementCostSummary(options: {
  projectWorkingId: string | null | undefined;
  enabled?: boolean;
}) {
  const projectWorkingId = options.projectWorkingId
    ? String(options.projectWorkingId)
    : "";

  const query = useQuery<EngagementCostSummary, Error>({
    queryKey: ["engagement-cost-summary", { projectWorkingId }],
    queryFn: async ({ signal }) =>
      getEngagementCostSummaryApi(projectWorkingId, { signal }),
    enabled: (options.enabled ?? true) && Boolean(projectWorkingId),
    staleTime: 30 * 1000,
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useConstructionItemCostSummary(options: {
  constructionItemId: string | null | undefined;
  enabled?: boolean;
}) {
  const constructionItemId = options.constructionItemId
    ? String(options.constructionItemId)
    : "";

  const query = useQuery<ConstructionCostSummary, Error>({
    queryKey: ["construction-item-cost-summary", { constructionItemId }],
    queryFn: async ({ signal }) =>
      getConstructionItemCostSummaryApi(constructionItemId, { signal }),
    enabled: (options.enabled ?? true) && Boolean(constructionItemId),
    staleTime: 30 * 1000,
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
