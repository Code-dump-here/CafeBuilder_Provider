/**
 * Marketplace types — mirror the bid-request / project-post API.
 *
 * A "post" is an open call from a shop owner looking for a design studio
 * and/or construction firm. Designers and contractors browse the marketplace
 * to find work to bid on.
 *
 * Server payloads are normalized on the way in (ISO date strings → `Date`,
 * nullables kept nullable) — components never deal with raw JSON.
 */

export type ServiceKind = "design" | "construction" | "both";

/**
 * Mirrors the backend `PostStatus` enum. `draft` used to appear here and does
 * not exist server-side: `PostService` parses the `status` query param with
 * `Enum.TryParse<PostStatus>` and throws
 * "Status 'draft' không hợp lệ. Cho phép: open, closed, cancelled." — so the
 * Draft entry in the marketplace filter produced a failed request, while
 * genuinely cancelled posts couldn't be filtered for at all.
 */
export type PostStatus = "open" | "closed" | "cancelled";

export interface MarketplacePost {
  id: string;
  projectShopOwnerId: string;
  projectName: string;
  projectAddress: string;
  /** Budget in VND. */
  projectBudget: number;
  /** Floor area in square meters. */
  projectAreaM2: number;
  serviceKind: ServiceKind;
  title: string;
  description: string;
  status: PostStatus;
  /** Last day owners accept new bids. */
  submissionDeadline: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Generic paged response shape used across the app. */
export interface PagedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export type SortOption = "newest" | "deadline" | "budget_desc" | "budget_asc";

export interface MarketplaceFilters {
  serviceKind: ServiceKind | "all";
  status: PostStatus | "all";
  sort: SortOption;
  /** Free-text search over title / address / project name. */
  query: string;
  /** Optional project filter — null means "all projects". */
  projectShopOwnerId: string | null;
  pageNumber: number;
  pageSize: number;
}

export const DEFAULT_FILTERS: MarketplaceFilters = {
  serviceKind: "all",
  // Default to "open", NOT "all". The marketplace is a place to bid, and a
  // closed post cannot be bid on — but the bigger problem was that listing
  // them handed out links nobody could follow. Every card links to
  // `/projects/{projectShopOwnerId}`, and the API only serves that page when
  // the post is open for bidding or the viewer is already part of the
  // project, so each closed card was a guaranteed 401 dressed up as a CTA.
  // On the current data that is 15 of 18 posts. Filtering to `closed` from
  // the filter bar still works; the card just stops offering a dead link.
  status: "open",
  sort: "newest",
  query: "",
  projectShopOwnerId: null,
  pageNumber: 1,
  pageSize: 10,
};

// ---------------------------------------------------------------------------
// Query-string mapping
//
// Backend expects: `pageNumber`, `pageSize`, `projectId?`, `serviceKind?`,
// `status?`, `search?`. We translate the UI state into that contract here so
// the page + filter bar stay decoupled from the wire format.

export interface MarketplaceQueryParams {
  pageNumber: number;
  pageSize: number;
  projectShopOwnerId?: string;
  serviceKind?: Exclude<ServiceKind, "all">;
  status?: Exclude<PostStatus, "all">;
  search?: string;
  // `sort` is a UI-only concept today — the backend sorts by `createdAt`
  // desc by default. Wire it through when the backend supports it.
}

export function toMarketplaceQueryParams(
  filters: MarketplaceFilters,
): MarketplaceQueryParams {
  const params: MarketplaceQueryParams = {
    pageNumber: filters.pageNumber,
    pageSize: filters.pageSize,
  };
  if (filters.projectShopOwnerId != null) params.projectShopOwnerId = filters.projectShopOwnerId;
  if (filters.serviceKind !== "all") {
    params.serviceKind = filters.serviceKind;
  }
  if (filters.status !== "all") {
    params.status = filters.status;
  }
  if (filters.query.trim()) {
    params.search = filters.query.trim();
  }
  return params;
}
