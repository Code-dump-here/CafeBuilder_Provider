// ─── Raw wire types ──────────────────────────────────────────────────────────
//
// Only this file (and the matching API fetcher) knows about the raw
// `GET /api/design-briefs` shape. The rest of the app talks in normalized
// `DesignBrief` types from `./design-brief-types` (re-exported below).

import type { DesignBrief } from "./design-brief-types";

/**
 * Raw response item from `GET /api/design-briefs?projectId={id}`.
 * Date fields are ISO strings on the wire; we normalize to `Date` in the
 * API fetcher. All string fields are nullable on the wire and collapse
 * to `""` / `null` after normalization — see `normalizeBrief` in
 * `design-briefs-api.ts`.
 */
export interface RawDesignBrief {
  id: number;
  projectId: number;
  targetCustomer: string | null;
  style: string | null;
  mood: string | null;
  seatCount: number | null;
  timeline: string | null;
  brandNote: string | null;
  businessModel: string | null;
  businessGoals: string | null;
  operationNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Re-export the canonical app-facing type. */
export type { DesignBrief };

// ─── Filter defaults ────────────────────────────────────────────────────────
//
// Centralized so the React Query key, the fetcher, and the UI all agree
// on the same defaults. Tuned to "give me everything for this project"
// for the briefs page — the backend caps at the requested pageSize.

export const DEFAULT_DESIGN_BRIEFS_PAGE_SIZE = 10;
export const DEFAULT_DESIGN_BRIEFS_PAGE_NUMBER = 1;

export const DEFAULT_DESIGN_BRIEFS_FILTERS = {
  pageNumber: DEFAULT_DESIGN_BRIEFS_PAGE_NUMBER,
  pageSize: DEFAULT_DESIGN_BRIEFS_PAGE_SIZE,
} as const;
