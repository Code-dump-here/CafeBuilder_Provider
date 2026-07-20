import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import {
  toMarketplaceQueryParams,
  type MarketplaceFilters,
  type MarketplacePost,
  type PagedResponse,
} from "./marketplace-types";

// ---------------------------------------------------------------------------
// Raw types — what the wire actually returns.
// ---------------------------------------------------------------------------
//
// Backend returns `MarketplacePost` with date fields as ISO strings. We
// normalize on the way in (`new Date(...)`) so the rest of the app deals
// in `Date`. Keep `MarketplacePost` as the canonical type and only this
// module knows about the raw shape.

interface RawMarketplacePost {
  id: number;
  projectShopOwnerId: number;
  projectName: string;
  projectAddress: string;
  projectBudget: number;
  projectAreaM2: number;
  serviceKind: MarketplacePost["serviceKind"];
  title: string;
  description: string;
  status: MarketplacePost["status"];
  submissionDeadline: string;
  createdAt: string;
  updatedAt: string;
}

type RawPagedResponse = Omit<
  PagedResponse<RawMarketplacePost>,
  "items"
> & {
  items: RawMarketplacePost[];
};

// ---------------------------------------------------------------------------
// Public API

/**
 * Fetch the marketplace post list for the current filter state.
 *
 * Endpoint: `GET /api/posts` with query params derived from the
 * filter object. Response shape is the raw `PagedResponse` (no envelope).
 */
export async function fetchMarketplacePosts(
  filters: MarketplaceFilters,
  config?: RequestConfig,
): Promise<PagedResponse<MarketplacePost>> {
  const params = toMarketplaceQueryParams(filters);
  const response = await api.get<RawPagedResponse>("/api/posts", {
    ...config,
    params,
  });
  return normalizePagedResponse(response.data);
}

/**
 * Fetch just the open-brief count for the hero stat. Uses the same endpoint
 * with `pageSize=1` so the server does the counting (cheaper than fetching
 * the full list). Filters except `status` are intentionally ignored here —
 * the headline should reflect the platform pulse, not the user's view.
 */
export async function fetchOpenMarketplacePostCount(
  config?: RequestConfig,
): Promise<number> {
  const response = await api.get<RawPagedResponse>("/api/posts", {
    ...config,
    params: { pageNumber: 1, pageSize: 1, status: "open" },
  });
  return response.data.totalItems ?? 0;
}

// ---------------------------------------------------------------------------
// Normalization

function normalizePost(raw: RawMarketplacePost): MarketplacePost {
  return {
    ...raw,
    submissionDeadline: new Date(raw.submissionDeadline),
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

function normalizePagedResponse(
  raw: RawPagedResponse,
): PagedResponse<MarketplacePost> {
  return {
    items: raw.items.map(normalizePost),
    pageNumber: raw.pageNumber,
    pageSize: raw.pageSize,
    totalItems: raw.totalItems,
    totalPages: raw.totalPages,
    hasPrevious: raw.hasPrevious,
    hasNext: raw.hasNext,
  };
}