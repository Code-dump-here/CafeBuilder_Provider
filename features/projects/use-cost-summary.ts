"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getConstructionItemCostSummaryApi,
  getEngagementCostSummaryApi,
} from "./cost-summary-api";
import type {
  ConstructionCostSummary,
  EngagementCostSummary,
} from "./cost-summary-types";

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
