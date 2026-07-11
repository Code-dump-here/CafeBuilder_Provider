import * as React from "react";

import type {
  DrawingComment,
  DrawingGroup,
  DrawingVersion,
  TechnicalDrawing,
  TechnicalDrawingKind,
} from "./technical-drawing-types";

/**
 * Hooks returning the technical drawings and their comments for a
 * project. Today the data is a deterministic mock so the page renders
 * end-to-end; replace `OVERRIDE` with a real fetcher when the API is
 * wired (see `useDesignVersions` for the same pattern).
 */
let DRAWINGS_OVERRIDE:
  | null
  | ((projectId: string) => TechnicalDrawing[]) = null;
let COMMENTS_OVERRIDE:
  | null
  | ((drawingId: number) => DrawingComment[]) = null;
let GROUPS_OVERRIDE:
  | null
  | ((projectId: string) => DrawingGroup[]) = null;

export const __setTechnicalDrawingsOverride = (
  next: (projectId: string) => TechnicalDrawing[],
) => {
  DRAWINGS_OVERRIDE = next;
};

export const __setTechnicalDrawingCommentsOverride = (
  next: (drawingId: number) => DrawingComment[],
) => {
  COMMENTS_OVERRIDE = next;
};

export const __setTechnicalDrawingGroupsOverride = (
  next: (projectId: string) => DrawingGroup[],
) => {
  GROUPS_OVERRIDE = next;
};

// --- helpers ---------------------------------------------------------------

const T = (iso: string) => new Date(iso);

// --- authors (shared with design-management mock) -------------------------

const HOA_MY = {
  id: 7,
  fullName: "Nguyen Hoa My",
  avatarColor: "#A07B5A",
};
const QUOC_VIET = {
  id: 8,
  fullName: "Tran Quoc Viet",
  avatarColor: "#3B5BA9",
};
const OWNER = {
  id: 12,
  fullName: "Pham Minh Anh",
  avatarColor: "#5A8F7B",
};
const CONTRACTOR = {
  id: 21,
  fullName: "Le Quang Huy",
  avatarColor: "#8E5A3B",
};

// --- mock drawings ---------------------------------------------------------
//
// Each drawing carries 3-5 revisions in `versions` (newest first). The
// top-level `fileName`, `note`, `author` and `updatedAt` reflect the
// LATEST revision, so the page reads naturally as "the current view of
// the drawing, with history beside it".

function v(
  id: number,
  revision: string,
  authoredAt: Date,
  author: (typeof HOA_MY),
  changeNote: string | null,
  fileName: string,
): DrawingVersion {
  return { id, revision, authoredAt, author, changeNote, fileName };
}

const DRAWINGS: TechnicalDrawing[] = [
  // 3D
  {
    id: 401,
    projectId: 1042,
    name: "Isometric — Morning",
    code: "R-401",
    kind: "3D",
    scale: null,
    fileName: "R-401_iso_morning_revC.pdf",
    note: "Presentation-grade isometric, morning light.",
    author: HOA_MY,
    createdAt: T("2026-06-20T10:00:00Z"),
    updatedAt: T("2026-07-02T14:30:00Z"),
    versions: [
      v(4013, "Rev. C", T("2026-07-02T14:30:00Z"), HOA_MY, "Adjusted mullion spacing per facade mockup.", "R-401_iso_morning_revC.pdf"),
      v(4012, "Rev. B", T("2026-06-28T11:15:00Z"), HOA_MY, "Warmer mood board — swapped to oak finish.", "R-401_iso_morning_revB.pdf"),
      v(4011, "Rev. A", T("2026-06-20T10:00:00Z"), QUOC_VIET, "Initial render pass.", "R-401_iso_morning_revA.pdf"),
    ],
  },
  {
    id: 402,
    projectId: 1042,
    name: "Isometric — Afternoon",
    code: "R-402",
    kind: "3D",
    scale: null,
    fileName: "R-402_iso_afternoon_revA.pdf",
    note: "Warmer mood, more greenery.",
    author: HOA_MY,
    createdAt: T("2026-06-22T09:00:00Z"),
    updatedAt: T("2026-07-01T16:45:00Z"),
    versions: [
      v(4021, "Rev. A", T("2026-07-01T16:45:00Z"), HOA_MY, "Initial afternoon render.", "R-402_iso_afternoon_revA.pdf"),
    ],
  },
  {
    id: 403,
    projectId: 1042,
    name: "3D Floor — Ground",
    code: "R-301",
    kind: "3D",
    scale: null,
    fileName: "R-301_floor_ground_revB.pdf",
    note: null,
    author: QUOC_VIET,
    createdAt: T("2026-06-18T08:00:00Z"),
    updatedAt: T("2026-06-25T09:20:00Z"),
    versions: [
      v(4032, "Rev. B", T("2026-06-25T09:20:00Z"), QUOC_VIET, "Fixed ceiling height inconsistency.", "R-301_floor_ground_revB.pdf"),
      v(4031, "Rev. A", T("2026-06-18T08:00:00Z"), QUOC_VIET, null, "R-301_floor_ground_revA.pdf"),
    ],
  },
  // 2D
  {
    id: 101,
    projectId: 1042,
    name: "Ground Floor Plan",
    code: "A-101",
    kind: "2D",
    scale: "1:50",
    fileName: "A-101_ground_floor_revD.pdf",
    note: "Coordinated HVAC returns with ceiling grid.",
    author: HOA_MY,
    createdAt: T("2026-06-05T09:00:00Z"),
    updatedAt: T("2026-07-02T14:00:00Z"),
    versions: [
      v(1014, "Rev. D", T("2026-07-02T14:00:00Z"), HOA_MY, "Coordinated HVAC returns with ceiling grid on A-201.", "A-101_ground_floor_revD.pdf"),
      v(1013, "Rev. C", T("2026-07-01T16:00:00Z"), HOA_MY, "Owner revisions — counter extended 600mm.", "A-101_ground_floor_revC.pdf"),
      v(1012, "Rev. B", T("2026-06-20T11:00:00Z"), HOA_MY, "MEP coordination overlay.", "A-101_ground_floor_revB.pdf"),
      v(1011, "Rev. A", T("2026-06-05T09:00:00Z"), HOA_MY, null, "A-101_ground_floor_revA.pdf"),
    ],
  },
  {
    id: 102,
    projectId: 1042,
    name: "Mezzanine Plan",
    code: "A-102",
    kind: "2D",
    scale: "1:50",
    fileName: "A-102_mezzanine_revB.pdf",
    note: "Stair extension per structural RFI #14.",
    author: HOA_MY,
    createdAt: T("2026-06-10T08:00:00Z"),
    updatedAt: T("2026-07-02T14:05:00Z"),
    versions: [
      v(1022, "Rev. B", T("2026-07-02T14:05:00Z"), HOA_MY, "Stair extension per structural RFI #14 — landed at 1.2m wider.", "A-102_mezzanine_revB.pdf"),
      v(1021, "Rev. A", T("2026-06-10T08:00:00Z"), HOA_MY, null, "A-102_mezzanine_revA.pdf"),
    ],
  },
  {
    id: 103,
    projectId: 1042,
    name: "Roof Plan",
    code: "A-103",
    kind: "2D",
    scale: "1:50",
    fileName: "A-103_roof_revA.pdf",
    note: null,
    author: QUOC_VIET,
    createdAt: T("2026-06-12T10:00:00Z"),
    updatedAt: T("2026-07-02T14:10:00Z"),
    versions: [
      v(1031, "Rev. A", T("2026-07-02T14:10:00Z"), QUOC_VIET, null, "A-103_roof_revA.pdf"),
    ],
  },
  {
    id: 201,
    projectId: 1042,
    name: "Front Elevation",
    code: "A-201",
    kind: "2D",
    scale: "1:50",
    fileName: "A-201_front_elevation_revC.pdf",
    note: "Updated glazing mullions to match facade mockup.",
    author: HOA_MY,
    createdAt: T("2026-06-08T09:00:00Z"),
    updatedAt: T("2026-07-02T14:20:00Z"),
    versions: [
      v(2013, "Rev. C", T("2026-07-02T14:20:00Z"), HOA_MY, "Updated glazing mullions to match facade mockup.", "A-201_front_elevation_revC.pdf"),
      v(2012, "Rev. B", T("2026-06-22T10:00:00Z"), HOA_MY, "Swapped signage band material to bronze.", "A-201_front_elevation_revB.pdf"),
      v(2011, "Rev. A", T("2026-06-08T09:00:00Z"), HOA_MY, null, "A-201_front_elevation_revA.pdf"),
    ],
  },
  {
    id: 301,
    projectId: 1042,
    name: "Section A-A",
    code: "A-301",
    kind: "2D",
    scale: "1:50",
    fileName: "A-301_section_A_revB.pdf",
    note: null,
    author: QUOC_VIET,
    createdAt: T("2026-06-14T11:00:00Z"),
    updatedAt: T("2026-07-02T14:25:00Z"),
    versions: [
      v(3012, "Rev. B", T("2026-07-02T14:25:00Z"), QUOC_VIET, "Added mezzanine datum line.", "A-301_section_A_revB.pdf"),
      v(3011, "Rev. A", T("2026-06-14T11:00:00Z"), QUOC_VIET, null, "A-301_section_A_revA.pdf"),
    ],
  },
  // CONTRACT
  {
    id: 901,
    projectId: 1042,
    name: "Contract Set Cover",
    code: "G-001",
    kind: "CONTRACT",
    scale: null,
    fileName: "G-001_cover_revA.pdf",
    note: "Issued for construction — stamped 2026-07-02.",
    author: HOA_MY,
    createdAt: T("2026-07-02T13:00:00Z"),
    updatedAt: T("2026-07-02T13:00:00Z"),
    versions: [
      v(9011, "Rev. A", T("2026-07-02T13:00:00Z"), HOA_MY, null, "G-001_cover_revA.pdf"),
    ],
  },
  {
    id: 902,
    projectId: 1042,
    name: "Contract — Index of Drawings",
    code: "G-002",
    kind: "CONTRACT",
    scale: null,
    fileName: "G-002_index_revA.pdf",
    note: null,
    author: HOA_MY,
    createdAt: T("2026-07-02T13:05:00Z"),
    updatedAt: T("2026-07-02T13:05:00Z"),
    versions: [
      v(9021, "Rev. A", T("2026-07-02T13:05:00Z"), HOA_MY, null, "G-002_index_revA.pdf"),
    ],
  },
  {
    id: 903,
    projectId: 1042,
    name: "Contract — General Notes",
    code: "G-003",
    kind: "CONTRACT",
    scale: null,
    fileName: "G-003_notes_revA.pdf",
    note: null,
    author: QUOC_VIET,
    createdAt: T("2026-07-02T13:10:00Z"),
    updatedAt: T("2026-07-02T13:10:00Z"),
    versions: [
      v(9031, "Rev. A", T("2026-07-02T13:10:00Z"), QUOC_VIET, null, "G-003_notes_revA.pdf"),
    ],
  },
];

// --- groups ----------------------------------------------------------------

const GROUPS: DrawingGroup[] = [
  {
    id: 1,
    label: "Plans",
    icon: "plans",
    drawingIds: [101, 102, 103],
  },
  {
    id: 2,
    label: "Elevations",
    icon: "elevations",
    drawingIds: [201],
  },
  {
    id: 3,
    label: "Sections",
    icon: "sections",
    drawingIds: [301],
  },
  {
    id: 4,
    label: "Renders",
    icon: "renders",
    drawingIds: [401, 402, 403],
  },
  {
    id: 5,
    label: "Contract Set",
    icon: "contract",
    drawingIds: [901, 902, 903],
  },
];

// --- mock comments ---------------------------------------------------------

const COMMENTS: Record<number, DrawingComment[]> = {
  101: [
    {
      id: 1,
      drawingId: 101,
      author: OWNER,
      body: "Can we move the counter 600mm closer to the entrance? It feels too tucked away.",
      pinned: true,
      parentId: null,
      createdAt: T("2026-06-28T10:15:00Z"),
    },
    {
      id: 2,
      drawingId: 101,
      author: HOA_MY,
      body: "Done in V2.3 (Rev. C) — see the Ground Floor Plan (Rev. C) sheet.",
      pinned: false,
      parentId: 1,
      createdAt: T("2026-07-01T16:00:00Z"),
    },
    {
      id: 3,
      drawingId: 101,
      author: CONTRACTOR,
      body: "We'll need an updated RCP before we can finalize the bar ceiling.",
      pinned: false,
      parentId: null,
      createdAt: T("2026-07-02T09:00:00Z"),
    },
  ],
  102: [
    {
      id: 4,
      drawingId: 102,
      author: QUOC_VIET,
      body: "Stair extension per structural RFI #14 — landed at 1.2m wider.",
      pinned: false,
      parentId: null,
      createdAt: T("2026-07-02T14:05:00Z"),
    },
  ],
  201: [
    {
      id: 5,
      drawingId: 201,
      author: HOA_MY,
      body: "Updated glazing mullions to match the facade mockup. Worth a look.",
      pinned: true,
      parentId: null,
      createdAt: T("2026-07-02T14:20:00Z"),
    },
  ],
  401: [
    {
      id: 6,
      drawingId: 401,
      author: OWNER,
      body: "Love this one. Could we get a darker wood option too?",
      pinned: false,
      parentId: null,
      createdAt: T("2026-07-02T15:00:00Z"),
    },
    {
      id: 7,
      drawingId: 401,
      author: HOA_MY,
      body: "Sure — I'll render a walnut variant tomorrow morning.",
      pinned: false,
      parentId: 6,
      createdAt: T("2026-07-02T15:30:00Z"),
    },
  ],
};

// --- hooks -----------------------------------------------------------------

export function useTechnicalDrawings(
  projectId: string,
  kind?: TechnicalDrawingKind,
): TechnicalDrawing[] {
  return React.useMemo(() => {
    const loader = DRAWINGS_OVERRIDE ?? (() => DRAWINGS);
    const all = loader(projectId);
    return kind ? all.filter((d) => d.kind === kind) : all;
  }, [projectId, kind]);
}

export function useTechnicalDrawing(drawingId: number): TechnicalDrawing | null {
  return React.useMemo(() => {
    const all = (DRAWINGS_OVERRIDE ?? (() => DRAWINGS))("1042");
    return all.find((d) => d.id === drawingId) ?? null;
  }, [drawingId]);
}

export function useDrawingComments(drawingId: number): DrawingComment[] {
  return React.useMemo(() => {
    const loader = COMMENTS_OVERRIDE ?? ((id: number) => COMMENTS[id] ?? []);
    return loader(drawingId);
  }, [drawingId]);
}

export function useDrawingGroups(projectId: string): DrawingGroup[] {
  return React.useMemo(() => {
    const loader = GROUPS_OVERRIDE ?? (() => GROUPS);
    return loader(projectId);
  }, [projectId]);
}