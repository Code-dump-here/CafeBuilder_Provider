import * as React from "react";

import type { DesignDrawing, DesignVersion, DrawingCategory } from "./design-version-types";

/**
 * Hook returning the design versions (and their drawings) for a project.
 *
 * Like the other `use-*` hooks in this folder, today it returns a
 * deterministic mock so the page renders end-to-end. Replace by setting
 * `OVERRIDE` (e.g. from a server fetcher) — components depend on the typed
 * result, never on raw JSON.
 */
let OVERRIDE: null | ((projectId: string) => DesignVersion[]) = null;

export const __setDesignVersionsOverride = (
  next: (projectId: string) => DesignVersion[],
) => {
  OVERRIDE = next;
};

// --- helpers ---------------------------------------------------------------

const T = (iso: string) => new Date(iso);

// --- mock data -------------------------------------------------------------
//
// Five versions: one approved (Construction Set), one revision
// (V2.3 — Owner Revisions), one in-progress draft (V2.2 — MEP), one
// submitted (V2.1 — Schematic Update), one submitted (V2.0 — Owner
// Review Snapshot). Each version carries 4-6 drawings with mock
// `picsum.photos` thumbnails so the grid renders without a real backend.

const VERSIONS: DesignVersion[] = [
  {
    id: 1,
    projectId: 1042,
    code: "V3.0",
    name: "Construction Set",
    description:
      "Final drawings issued to the contractor. All sheets stamped for permit submission.",
    status: "approved",
    category: "FLOOR_PLAN",
    drawingCount: 6,
    createdAt: T("2026-06-15T09:00:00Z"),
    updatedAt: T("2026-07-02T14:30:00Z"),
    publishedAt: T("2026-07-02T14:30:00Z"),
    latestNote: "Coordinated HVAC returns with the ceiling grid on A-201.",
    drawings: [
      {
        id: 101,
        versionId: 1,
        name: "Ground Floor Plan",
        code: "A-101",
        category: "FLOOR_PLAN",
        thumbnailUrl: "https://picsum.photos/seed/ans-101/640/420",
        scale: "1:50",
        sheet: "A-101",
        note: "Coordinated HVAC returns with ceiling grid.",
        updatedAt: T("2026-07-02T14:00:00Z"),
        updatedBy: "Nguyen Hoa My",
      },
      {
        id: 102,
        versionId: 1,
        name: "Mezzanine Plan",
        code: "A-102",
        category: "FLOOR_PLAN",
        thumbnailUrl: "https://picsum.photos/seed/ans-102/640/420",
        scale: "1:50",
        sheet: "A-102",
        note: "Stair extension per structural RFI #14.",
        updatedAt: T("2026-07-02T14:05:00Z"),
        updatedBy: "Nguyen Hoa My",
      },
      {
        id: 103,
        versionId: 1,
        name: "Roof Plan",
        code: "A-103",
        category: "FLOOR_PLAN",
        thumbnailUrl: "https://picsum.photos/seed/ans-103/640/420",
        scale: "1:50",
        sheet: "A-103",
        note: null,
        updatedAt: T("2026-07-02T14:10:00Z"),
        updatedBy: "Tran Quoc Viet",
      },
      {
        id: 201,
        versionId: 1,
        name: "Front Elevation",
        code: "A-201",
        category: "ELEVATION",
        thumbnailUrl: "https://picsum.photos/seed/ans-201/640/420",
        scale: "1:50",
        sheet: "A-201",
        note: "Updated glazing mullions to match facade mockup.",
        updatedAt: T("2026-07-02T14:20:00Z"),
        updatedBy: "Nguyen Hoa My",
      },
      {
        id: 301,
        versionId: 1,
        name: "Section A-A",
        code: "A-301",
        category: "SECTION",
        thumbnailUrl: "https://picsum.photos/seed/ans-301/640/420",
        scale: "1:50",
        sheet: "A-301",
        note: null,
        updatedAt: T("2026-07-02T14:25:00Z"),
        updatedBy: "Tran Quoc Viet",
      },
      {
        id: 401,
        versionId: 1,
        name: "Isometric Render",
        code: "R-401",
        category: "3D",
        thumbnailUrl: "https://picsum.photos/seed/ans-401/640/420",
        scale: null,
        sheet: "R-401",
        note: "Presentation-grade isometric, morning light.",
        updatedAt: T("2026-07-02T14:30:00Z"),
        updatedBy: "Nguyen Hoa My",
      },
    ],
  },
  {
    id: 2,
    projectId: 1042,
    code: "V2.3",
    name: "Owner Revisions",
    description:
      "Working set incorporating the owner's comments from the 2026-06-28 review.",
    status: "revision",
    category: "REVISION",
    drawingCount: 5,
    createdAt: T("2026-06-28T10:00:00Z"),
    updatedAt: T("2026-07-01T16:45:00Z"),
    publishedAt: null,
    latestNote: "Owner asked for a larger pickup counter and softer banquette.",
    drawings: [
      {
        id: 110,
        versionId: 2,
        name: "Ground Floor Plan (Rev. C)",
        code: "A-101-R3",
        category: "FLOOR_PLAN",
        thumbnailUrl: "https://picsum.photos/seed/ans-r3-101/640/420",
        scale: "1:50",
        sheet: "A-101",
        note: "Counter extended 600mm toward the entrance.",
        updatedAt: T("2026-07-01T16:00:00Z"),
        updatedBy: "Nguyen Hoa My",
      },
      {
        id: 111,
        versionId: 2,
        name: "Seating Layout (Rev. C)",
        code: "A-104-R3",
        category: "FLOOR_PLAN",
        thumbnailUrl: "https://picsum.photos/seed/ans-r3-104/640/420",
        scale: "1:50",
        sheet: "A-104",
        note: "Banquette softened, additional 2-top added near the window.",
        updatedAt: T("2026-07-01T16:10:00Z"),
        updatedBy: "Nguyen Hoa My",
      },
      {
        id: 210,
        versionId: 2,
        name: "Front Elevation (Rev. C)",
        code: "A-201-R3",
        category: "ELEVATION",
        thumbnailUrl: "https://picsum.photos/seed/ans-r3-201/640/420",
        scale: "1:50",
        sheet: "A-201",
        note: null,
        updatedAt: T("2026-07-01T16:20:00Z"),
        updatedBy: "Tran Quoc Viet",
      },
      {
        id: 310,
        versionId: 2,
        name: "Section A-A (Rev. C)",
        code: "A-301-R3",
        category: "SECTION",
        thumbnailUrl: "https://picsum.photos/seed/ans-r3-301/640/420",
        scale: "1:50",
        sheet: "A-301",
        note: null,
        updatedAt: T("2026-07-01T16:30:00Z"),
        updatedBy: "Tran Quoc Viet",
      },
      {
        id: 410,
        versionId: 2,
        name: "Isometric Render (Rev. C)",
        code: "R-401-R3",
        category: "3D",
        thumbnailUrl: "https://picsum.photos/seed/ans-r3-401/640/420",
        scale: null,
        sheet: "R-401",
        note: "Warmer mood, more greenery.",
        updatedAt: T("2026-07-01T16:45:00Z"),
        updatedBy: "Nguyen Hoa My",
      },
    ],
  },
  {
    id: 3,
    projectId: 1042,
    code: "V2.2",
    name: "MEP Coordination",
    description:
      "MEP coordination overlay — clashes flagged on the ground floor.",
    status: "in_progress",
    category: "FLOOR_PLAN",
    drawingCount: 4,
    createdAt: T("2026-06-20T11:00:00Z"),
    updatedAt: T("2026-06-25T09:20:00Z"),
    publishedAt: null,
    latestNote: "Awaiting HVAC contractor input on the pickup ceiling return.",
    drawings: [
      {
        id: 120,
        versionId: 3,
        name: "MEP Overlay — Ground",
        code: "M-101",
        category: "FLOOR_PLAN",
        thumbnailUrl: "https://picsum.photos/seed/ans-mep-101/640/420",
        scale: "1:50",
        sheet: "M-101",
        note: "Two clashes flagged near the bar.",
        updatedAt: T("2026-06-25T09:00:00Z"),
        updatedBy: "Tran Quoc Viet",
      },
      {
        id: 121,
        versionId: 3,
        name: "MEP Overlay — Mezz",
        code: "M-102",
        category: "FLOOR_PLAN",
        thumbnailUrl: "https://picsum.photos/seed/ans-mep-102/640/420",
        scale: "1:50",
        sheet: "M-102",
        note: null,
        updatedAt: T("2026-06-25T09:05:00Z"),
        updatedBy: "Tran Quoc Viet",
      },
      {
        id: 220,
        versionId: 3,
        name: "RCP — Ground",
        code: "M-201",
        category: "ELEVATION",
        thumbnailUrl: "https://picsum.photos/seed/ans-mep-201/640/420",
        scale: "1:50",
        sheet: "M-201",
        note: null,
        updatedAt: T("2026-06-25T09:10:00Z"),
        updatedBy: "Tran Quoc Viet",
      },
      {
        id: 320,
        versionId: 3,
        name: "Section — MEP",
        code: "M-301",
        category: "SECTION",
        thumbnailUrl: "https://picsum.photos/seed/ans-mep-301/640/420",
        scale: "1:50",
        sheet: "M-301",
        note: null,
        updatedAt: T("2026-06-25T09:20:00Z"),
        updatedBy: "Tran Quoc Viet",
      },
    ],
  },
  {
    id: 4,
    projectId: 1042,
    code: "V2.1",
    name: "Schematic Update",
    description: "Earlier schematic pass — superseded by V2.2.",
    status: "submitted",
    category: "FLOOR_PLAN",
    drawingCount: 3,
    createdAt: T("2026-06-10T08:00:00Z"),
    updatedAt: T("2026-06-14T17:00:00Z"),
    publishedAt: null,
    latestNote: null,
    drawings: [
      {
        id: 130,
        versionId: 4,
        name: "Schematic Plan",
        code: "A-101-S1",
        category: "FLOOR_PLAN",
        thumbnailUrl: "https://picsum.photos/seed/ans-s1-101/640/420",
        scale: "1:100",
        sheet: "A-101",
        note: null,
        updatedAt: T("2026-06-14T16:30:00Z"),
        updatedBy: "Tran Quoc Viet",
      },
      {
        id: 131,
        versionId: 4,
        name: "Schematic Sections",
        code: "A-301-S1",
        category: "SECTION",
        thumbnailUrl: "https://picsum.photos/seed/ans-s1-301/640/420",
        scale: "1:100",
        sheet: "A-301",
        note: null,
        updatedAt: T("2026-06-14T16:45:00Z"),
        updatedBy: "Tran Quoc Viet",
      },
      {
        id: 430,
        versionId: 4,
        name: "Schematic 3D",
        code: "R-401-S1",
        category: "3D",
        thumbnailUrl: "https://picsum.photos/seed/ans-s1-401/640/420",
        scale: null,
        sheet: "R-401",
        note: null,
        updatedAt: T("2026-06-14T17:00:00Z"),
        updatedBy: "Tran Quoc Viet",
      },
    ],
  },
  {
    id: 5,
    projectId: 1042,
    code: "V2.0",
    name: "Owner Review Snapshot",
    description:
      "Snapshot sent to the owner ahead of the 2026-06-28 review meeting.",
    status: "submitted",
    category: "REVISION",
    drawingCount: 2,
    createdAt: T("2026-06-05T09:00:00Z"),
    updatedAt: T("2026-06-07T11:30:00Z"),
    publishedAt: null,
    latestNote: null,
    drawings: [
      {
        id: 140,
        versionId: 5,
        name: "Snapshot Plan",
        code: "A-101-S0",
        category: "FLOOR_PLAN",
        thumbnailUrl: "https://picsum.photos/seed/ans-s0-101/640/420",
        scale: "1:50",
        sheet: "A-101",
        note: null,
        updatedAt: T("2026-06-07T11:00:00Z"),
        updatedBy: "Nguyen Hoa My",
      },
      {
        id: 440,
        versionId: 5,
        name: "Snapshot 3D",
        code: "R-401-S0",
        category: "3D",
        thumbnailUrl: "https://picsum.photos/seed/ans-s0-401/640/420",
        scale: null,
        sheet: "R-401",
        note: null,
        updatedAt: T("2026-06-07T11:30:00Z"),
        updatedBy: "Nguyen Hoa My",
      },
    ],
  },
];

export function useLegacyDesignVersions(projectId: string): DesignVersion[] {
  return React.useMemo(() => {
    const loader = OVERRIDE ?? (() => VERSIONS);
    return loader(projectId);
  }, [projectId]);
}

export function useLegacyDesignVersion(
  projectId: string,
  versionId: number,
): DesignVersion | null {
  return React.useMemo(() => {
    const all = (OVERRIDE ?? (() => VERSIONS))(projectId);
    return all.find((v) => v.id === versionId) ?? null;
  }, [projectId, versionId]);
}

// --- category helpers --------------------------------------------------------
//
// The detail pages under `/design-management/[versionId]/...` use the outer
// dynamic segment as a *category slug* (e.g. "3d", "floor-plan") and the
// inner one as a numeric version id. These helpers keep that mapping in
// one place so neither the route shell nor the right rail has to know
// the slug spelling rules.

/**
 * URL slug → `DrawingCategory` enum. Returns `null` if the slug
 * doesn't match a known category. Slug spelling is kebab-case ASCII
 * mirroring the C# `DesignCategory` values: "3d", "floor-plan",
 * "elevation", "section", "revision".
 */
export function resolveCategorySlug(
  slug: string | undefined | null,
): DrawingCategory | null {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();
  switch (normalized) {
    case "3d":
    case "three-d":
    case "three_d":
    case "threed":
      return "3D";
    case "floor-plan":
    case "floor_plan":
    case "floorplan":
      return "FLOOR_PLAN";
    case "elevation":
    case "elevations":
      return "ELEVATION";
    case "section":
    case "sections":
      return "SECTION";
    case "revision":
    case "revisions":
      return "REVISION";
    default:
      return null;
  }
}

/**
 * All design versions for `projectId` whose `category` matches the
 * resolved slug. Accepts either a `DrawingCategory` or a raw slug
 * string (so callers can pass `resolveCategorySlug(slug) ?? ""`
 * without an extra null check). Versions are returned in
 * `updatedAt` descending order so the right rail shows the most
 * recent entry first.
 */
export function useDesignCategoryVersions(
  projectId: string,
  category: DrawingCategory | string,
): DesignVersion[] {
  const resolved = useCategoryFromInput(category);
  return React.useMemo(() => {
    const all = (OVERRIDE ?? (() => VERSIONS))(projectId);
    return all
      .filter((v) => v.category === resolved)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [projectId, resolved]);
}

function useCategoryFromInput(
  category: DrawingCategory | string,
): DrawingCategory | null {
  if (!category) return null;
  if (
    category === "3D" ||
    category === "FLOOR_PLAN" ||
    category === "ELEVATION" ||
    category === "SECTION" ||
    category === "REVISION"
  ) {
    return category;
  }
  return resolveCategorySlug(category);
}
