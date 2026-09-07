/**
 * Provider rating summary — mirrors `GET /api/reviews/providers/{id}/summary`.
 *
 * The ReviewService owns this endpoint; the result is small and stable
 * enough to live alongside the profile feature. The shape is what the
 * provider detail page renders: a single overall rating plus per-
 * dimension averages (quality, communication, timeline, …).
 *
 * Null vs 0: a brand-new provider with no reviews returns `null`
 * top-level, with no `dimensionAverages`. Once the first review lands
 * the endpoint returns the full shape with `reviewCount = 1`.
 */

import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";
import { isReviewDimension, type ReviewDimension } from "../projects/review-dimensions";

/** Per-dimension average rating on a 1–5 scale.
 *
 * Spec §4.5 locks the dimension set to five keys. We declare the five as
 * required on the wire; anything else the backend ever sent (`timeline` in
 * earlier versions) is normalised away in `normalizeDimensionAverages`
 * before reaching the UI.
 */
export interface ProviderRatingDimensions {
  progress: number;
  quality: number;
  communication: number;
  cost: number;
  professionalism: number;
}

export interface ProviderRatingSummary {
  serviceProviderProfileId: string;
  reviewCount: number;
  averageRating: number;
  dimensionAverages: ProviderRatingDimensions | null;
}

/**
 * Narrow the raw API response so unknown dimension keys are dropped
 * instead of leaking into the UI.
 *
 * Defensive: if the backend still sends the legacy `timeline` key (an
 * earlier revision of the spec), keep it as `progress` so a provider
 * with old reviews doesn't render an empty `progress` row.
 */
function normalizeDimensionAverages(
  raw: Record<string, number> | null | undefined,
): ProviderRatingDimensions | null {
  if (!raw) return null;
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    // Legacy alias: "timeline" predates the spec rename to "progress".
    const canonical = key === "timeline" ? "progress" : key;
    if (!isReviewDimension(canonical)) continue;
    // First wins — a backend that sends both `timeline` and `progress`
    // for the same review (shouldn't happen, but) keeps the first.
    if (canonical in out) continue;
    out[canonical] = value;
  }
  return out as unknown as ProviderRatingDimensions;
}

/**
 * GET /api/reviews/providers/{serviceProviderProfileId}/summary
 *
 * Auth required (the ReviewController class is `[Authorize]`-d). Returns
 * `null` when the provider has no reviews yet — the page can render an
 * empty-state instead of a fake 0.0.
 */
export async function getProviderRatingSummaryApi(
  serviceProviderProfileId: string,
  config?: RequestConfig,
): Promise<ProviderRatingSummary | null> {
  try {
    const response = await api.get<ProviderRatingSummary | null>(
      `/api/reviews/providers/${serviceProviderProfileId}/summary`,
      config,
    );
    const payload = response.data;
    if (!payload) return null;

  return {
    ...payload,
    dimensionAverages: normalizeDimensionAverages(
      (payload.dimensionAverages ?? null) as Record<string, number> | null,
    ) as ProviderRatingDimensions | null,
  };
  } catch {
    // 404 is the expected response for a never-reviewed provider — the
    // service treats it as `null` summary, not an error.
    return null;
  }
}

export type { ReviewDimension };
