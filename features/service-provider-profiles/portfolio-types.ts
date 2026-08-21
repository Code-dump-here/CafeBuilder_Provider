/**
 * Portfolio types — mirrors the wire contract for `api/provider-portfolios`.
 *
 * Past work a provider shows to win the next job: photos, an optional walk-
 * through video, size, value and how long it took. Owners read these while
 * comparing bids, so everything here is public to any signed-in account.
 */

/** Which side of the work the provider did on that job. */
export type PortfolioRole = "design" | "construction" | "both";

export const PORTFOLIO_ROLES: readonly PortfolioRole[] = [
  "design",
  "construction",
  "both",
] as const;

export interface ProviderPortfolioImage {
  id: string;
  providerPortfolioId: string;
  imageUrl: string;
  imageViewUrl: string | null;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface ProviderPortfolio {
  id: string;
  serviceProviderProfileId: string;
  title: string;
  description: string | null;
  role: PortfolioRole;
  style: string | null;
  location: string | null;
  areaM2: number | null;
  contractValue: number | null;
  /** `yyyy-MM-dd` — a `DateOnly` on the wire, not an instant. */
  completedAt: string | null;
  durationDays: number | null;
  videoUrl: string | null;
  videoViewUrl: string | null;
  coverImageUrl: string | null;
  coverImageViewUrl: string | null;
  /** Pinned to the top of the provider's list, ahead of `sortOrder`. */
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  images: ProviderPortfolioImage[];
}

export interface ProviderPortfolioListResponse {
  items: ProviderPortfolio[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface ProviderPortfolioImagePayload {
  imageUrl: string;
  caption?: string;
  sortOrder?: number;
}

export interface CreateProviderPortfolioPayload {
  /** Omit to file it under the signed-in provider's own profile. */
  serviceProviderProfileId?: string;
  title: string;
  description?: string;
  role?: PortfolioRole;
  style?: string;
  location?: string;
  areaM2?: number;
  contractValue?: number;
  completedAt?: string;
  durationDays?: number;
  videoUrl?: string;
  coverImageUrl?: string;
  isFeatured?: boolean;
  sortOrder?: number;
  images?: ProviderPortfolioImagePayload[];
}

export interface UpdateProviderPortfolioPayload {
  title?: string;
  description?: string;
  role?: PortfolioRole;
  style?: string;
  location?: string;
  areaM2?: number;
  contractValue?: number;
  completedAt?: string;
  durationDays?: number;
  videoUrl?: string;
  coverImageUrl?: string;
  isFeatured?: boolean;
  sortOrder?: number;
}
