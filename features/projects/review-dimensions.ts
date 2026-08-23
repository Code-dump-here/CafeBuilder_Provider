/**
 * Rating criteria a shop owner scores a provider on.
 *
 * These are a fixed set server-side. They used to be free text, which meant
 * "Tiến độ", "Tien do" and "Tiến độ thi công" each became their own row in the
 * per-criterion averages — so nothing could be compared between providers, and
 * a profile could show the same criterion three times.
 *
 * The API returns and accepts the raw keys; labels live here so the wire
 * format stays stable while the wording can change.
 */

export const REVIEW_DIMENSIONS = [
  "progress",
  "quality",
  "communication",
  "cost",
  "professionalism",
] as const;

export type ReviewDimension = (typeof REVIEW_DIMENSIONS)[number];

/** Narrow an API string, tolerating criteria added server-side later. */
export function isReviewDimension(value: string): value is ReviewDimension {
  return (REVIEW_DIMENSIONS as readonly string[]).includes(value);
}

/**
 * i18n key for a criterion, under `Reviews.dimensions`.
 *
 * Unknown values fall back to the raw key rather than throwing: a criterion
 * added to the backend before this list is updated should still render as
 * something readable instead of blanking the row.
 */
export function reviewDimensionKey(value: string): string {
  return isReviewDimension(value) ? value : "unknown";
}
