"use client";

import * as React from "react";

export interface CafeTypeItem {
  id: string;
  title: string;
  subtitle: string;
  iconKey:
    | "coffee"
    | "leaf"
    | "baby"
    | "sparkles"
    | "heart"
    | "camera";
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ProjectSummary {
  id: number;
  ownerId: number;
  name: string;
  address: string;
  areaM2: number | null;
  budget: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  /** Snapshot prose shown on the hero card. */
  description: string;
  /** Free-form cafe types (chips under the address). */
  cafeTypes: string[];
  /** Business type label (Specialty Coffee Shop, Roastery, …). */
  businessType: string;
  /** Primary business goal. */
  primaryGoal: string;
  /** Target audience tag. */
  targetAudience: string;
  /** Target opening date (label only). */
  targetOpening: string;
  /** Completed cafe archetypes with icon key. */
  cafeTypeItems: CafeTypeItem[];
  /** Brief readiness checklist (0..100% is derived from this). */
  briefChecklist: ChecklistItem[];

  bidRequests: unknown[];
  budgetItems: unknown[];
  contracts: unknown[];
  conversations: unknown[];
  designBrief: unknown | null;
  handover: unknown | null;
  inspections: unknown[];
  owner: { id: number; fullName: string } | null;
  projectHires: unknown[];
  quotations: unknown[];
  reviews: unknown[];

  /** Hex/initial avatar background. */
  ownerAvatar: string;
  /** Optional priority label ("Urgent" / "Standard"). */
  priority: "urgent" | "standard";
  /** Optional brief status pill ("Brief Submitted", "Draft", …). */
  briefStatus: string;
  /** Optional downloadable attachments. */
  attachments: Array<{ id: string; title: string; sizeKb: number }>;
}

/**
 * Deterministic mock so the redesigned overview renders end-to-end before
 * the real fetcher is wired. Replace by overriding the loader.
 */
const MOCK_PROJECT: ProjectSummary = {
  id: 1042,
  ownerId: 7,
  name: "Modern Minimalist Specialty Coffee Shop",
  address:
    "123 Nguyen Hue Street, District 1, Ho Chi Minh City, Vietnam",
  areaM2: 107,
  budget: 300_000_000,
  createdAt: new Date("2026-04-12T09:30:00Z"),
  updatedAt: new Date("2026-06-28T14:05:00Z"),
  deletedAt: null,

  description:
    "A modern minimalist specialty coffee shop focused on a curated espresso program with a calm Scandinavian feel. The concept prioritises slow service, single-origin beans, and a small but considered food offering.",
  cafeTypes: ["Specialty Coffee", "Minimalist", "Scandinavian"],
  businessType: "Specialty Coffee Shop",
  primaryGoal: "Brand Launch",
  targetAudience: "Urban Professionals",
  targetOpening: "Q4 2026",

  cafeTypeItems: [
    {
      id: "ct-specialty",
      title: "Specialty Coffee",
      subtitle: "Single-origin focused",
      iconKey: "coffee",
    },
    {
      id: "ct-minimalist",
      title: "Minimalist",
      subtitle: "Clean Scandinavian aesthetic",
      iconKey: "leaf",
    },
    {
      id: "ct-kids",
      title: "Family Friendly",
      subtitle: "Welcoming for all ages",
      iconKey: "baby",
    },
  ],

  briefChecklist: [
    { id: "c1", label: "Business concept", done: true },
    { id: "c2", label: "Target audience", done: true },
    { id: "c3", label: "Location analysis", done: true },
    { id: "c4", label: "Budget breakdown", done: true },
    { id: "c5", label: "Brand preferences", done: true },
    { id: "c6", label: "Operational plan", done: false },
    { id: "c7", label: "Equipment list", done: false },
  ],

  bidRequests: [{}, {}, {}, {}],
  budgetItems: [{}, {}, {}, {}, {}, {}, {}, {}],
  contracts: [{}, {}],
  conversations: [{}],
  designBrief: { id: 1 },
  handover: null,
  inspections: [{}, {}],
  owner: { id: 7, fullName: "Nguyen Hoa My" },
  projectHires: [{}, {}, {}],
  quotations: [{}, {}, {}],
  reviews: [{}],

  ownerAvatar: "#A07B5A",
  priority: "urgent",
  briefStatus: "Brief Submitted",
  attachments: [
    { id: "a1", title: "Project Brief PDF", sizeKb: 420 },
    { id: "a2", title: "All Attachments", sizeKb: 12_480 },
  ],
};

/** Override hook so individual project pages (Designer / Owner / Contractor
 * overview) can swap in their own fetcher without touching shared UI. */
let OVERRIDE: null | (() => ProjectSummary) = null;

export const __setProjectsOverviewOverride = (next: () => ProjectSummary) => {
  OVERRIDE = next;
};

/**
 * Deterministic mock — swap to a real fetcher by overriding via the helper.
 */
export function useProjectsOverview(_id: string): ProjectSummary {
  return React.useMemo(() => {
    const loader = OVERRIDE ?? (() => MOCK_PROJECT);
    return loader();
  }, [_id]);
}

export function useProjectsOverviewStatus(
  project: ProjectSummary,
): "active" | "archived" {
  return project.deletedAt ? "archived" : "active";
}

/** Derived from `briefChecklist`; falls back to 0 when empty. */
export function computeBriefCompletion(project: ProjectSummary): {
  done: number;
  total: number;
  percent: number;
} {
  const total = project.briefChecklist.length;
  const done = project.briefChecklist.filter((c) => c.done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}