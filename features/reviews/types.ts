/**
 * Ratings a shop owner leaves on a finished engagement.
 *
 * The wire shape mirrors `ReviewResponse` / `ProviderRatingSummaryResponse` on
 * the API. `dimensionAverages` is a map rather than a list because the set of
 * criteria is fixed server-side and a criterion with no score yet is simply
 * absent — see `features/projects/review-dimensions.ts` for the label mapping.
 */

export interface ReviewScore {
  id: string;
  /** Raw criterion key, e.g. "progress". Narrow it with `isReviewDimension`. */
  dimension: string;
  score: number;
}

export interface ReviewImage {
  id: string;
  imageUrl: string;
  viewUrl?: string | null;
}

export interface Review {
  id: string;
  projectWorkingId: string;
  projectShopOwnerId: string | null;
  serviceProviderProfileId: string | null;
  overallRating: number;
  comment: string | null;
  scores: ReviewScore[];
  /** Provider's public answer. null = not answered yet. */
  providerReply: string | null;
  repliedAt: string | null;
  images: ReviewImage[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewListResponse {
  items: Review[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface ProviderRatingSummary {
  serviceProviderProfileId: string;
  reviewCount: number;
  /** Average of overallRating, 2 decimals. null when there is no review yet. */
  averageRating: number | null;
  /** criterion key → average score. Absent key = nobody scored that criterion. */
  dimensionAverages: Record<string, number>;
}
