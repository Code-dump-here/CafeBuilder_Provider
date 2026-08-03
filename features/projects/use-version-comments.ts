import * as React from "react";

import type { DesignVersionComment } from "./design-version-types";

/**
 * Returns the threaded comments for a single DesignVersion. Replace
 * the `OVERRIDE` with a real fetcher when the backend is wired.
 */
let COMMENTS_OVERRIDE: null | ((versionId: number) => DesignVersionComment[]) =
  null;

export const __setVersionCommentsOverride = (
  next: (versionId: number) => DesignVersionComment[],
) => {
  COMMENTS_OVERRIDE = next;
};

// --- helpers ---------------------------------------------------------------

const T = (iso: string) => new Date(iso);

// --- shared authors (matches use-technical-drawings mock) -----------------

const HOA_MY = { id: 7, fullName: "Nguyen Hoa My", avatarColor: "#A07B5A" };
const QUOC_VIET = {
  id: 8,
  fullName: "Tran Quoc Viet",
  avatarColor: "#3B5BA9",
};
const OWNER = { id: 12, fullName: "Pham Minh Anh", avatarColor: "#5A8F7B" };
const CONTRACTOR = {
  id: 21,
  fullName: "Le Quang Huy",
  avatarColor: "#8E5A3B",
};

// --- mock comments ---------------------------------------------------------
//
// Two-three threads per active version so the right-rail panel reads as
// a real conversation. Versions without comments fall back to an empty
// list (panel shows the empty state).

const COMMENTS: Record<number, DesignVersionComment[]> = {
  // V3.0 — Construction Set (PUBLISHED)
  1: [
    {
      id: 1001,
      versionId: 1,
      author: OWNER,
      body: "Looks good. One question — are the banquette dimensions finalized for the banquette cushion vendor?",
      pinned: true,
      parentId: null,
      createdAt: T("2026-07-02T15:30:00Z"),
    },
    {
      id: 1002,
      versionId: 1,
      author: HOA_MY,
      body: "Final dim are 4.6m × 0.55m × 0.42h — sent the spec to the vendor this morning.",
      pinned: false,
      parentId: 1001,
      createdAt: T("2026-07-02T16:05:00Z"),
    },
    {
      id: 1003,
      versionId: 1,
      author: CONTRACTOR,
      body: "We'll start framing the banquette on the 14th. Ceiling grid will need to be set first.",
      pinned: false,
      parentId: null,
      createdAt: T("2026-07-03T08:20:00Z"),
    },
    {
      id: 1004,
      versionId: 1,
      author: QUOC_VIET,
      body: "MEP clash on the column line resolved — see RFI #22 attached to drawing A-301.",
      pinned: false,
      parentId: null,
      createdAt: T("2026-07-03T09:45:00Z"),
    },
  ],
  // V2.3 — Owner Revisions (WORKING)
  2: [
    {
      id: 2001,
      versionId: 2,
      author: HOA_MY,
      body: "Counter extended 600mm per owner's review. Updated ground floor plan and seating layout.",
      pinned: true,
      parentId: null,
      createdAt: T("2026-07-01T16:30:00Z"),
    },
    {
      id: 2002,
      versionId: 2,
      author: OWNER,
      body: "Nice. Can the banquette be a touch softer? Looks boxy at 1:50.",
      pinned: false,
      parentId: 2001,
      createdAt: T("2026-07-01T17:10:00Z"),
    },
    {
      id: 2003,
      versionId: 2,
      author: HOA_MY,
      body: "I'll soften the radius on Rev. D — should land tomorrow morning.",
      pinned: false,
      parentId: 2002,
      createdAt: T("2026-07-01T17:25:00Z"),
    },
  ],
  // V2.2 — MEP Coordination (DRAFT)
  3: [
    {
      id: 3001,
      versionId: 3,
      author: QUOC_VIET,
      body: "Two clashes flagged on the bar — see M-101. Need HVAC input before publishing.",
      pinned: true,
      parentId: null,
      createdAt: T("2026-06-25T10:00:00Z"),
    },
  ],
};

// Default = empty for any version we haven't stubbed — keeps the panel's
// empty state honest instead of inventing threads.
const EMPTY: DesignVersionComment[] = [];

// --- hook ------------------------------------------------------------------

export function useVersionComments(
  versionId: number | null,
): DesignVersionComment[] {
  return React.useMemo(() => {
    if (versionId == null) return EMPTY;
    const loader = COMMENTS_OVERRIDE ?? ((id: number) => COMMENTS[id] ?? EMPTY);
    return loader(versionId);
  }, [versionId]);
}
