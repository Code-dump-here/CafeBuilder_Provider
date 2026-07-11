/**
 * Mirrors the C# `DesignVersion` / `DesignDrawing` entities (see
 * `lib/projects/use-design-brief.ts` for the same C#-first convention).
 *
 * `category` is the drawing type — used by the tabs filter on the design
 * management list page. `status` is the version lifecycle state, not a
 * per-drawing property.
 */

export type DrawingCategory =
  | "REVISION"
  | "FLOOR_PLAN"
  | "3D"
  | "ELEVATION"
  | "SECTION";

export type VersionStatus = "DRAFT" | "WORKING" | "PUBLISHED";

export interface DesignVersionOwner {
  id: number;
  fullName: string;
  /** Hex used as the avatar background; falls back to `bg-muted` when null. */
  avatarColor: string | null;
}

export interface DesignVersion {
  id: number;
  projectId: number;
  /** Human-friendly code, e.g. "V3.0" or "R-2025-08". */
  code: string;
  /** Short label shown in the row title, e.g. "Concept Lock". */
  name: string;
  description: string | null;
  status: VersionStatus;
  category: DrawingCategory;
  owner: DesignVersionOwner;
  drawingCount: number;
  createdAt: Date;
  updatedAt: Date;
  /** When the version was published, if applicable. */
  publishedAt: Date | null;
  /** Optional "notes" thread for the row (latest note shown collapsed). */
  latestNote: string | null;
  drawings: DesignDrawing[];
}

export interface DesignDrawing {
  id: number;
  versionId: number;
  /** Display name, e.g. "Ground floor plan" or "Section A-A". */
  name: string;
  code: string;
  category: DrawingCategory;
  /** Optional preview image (URL or data URI). */
  thumbnailUrl: string | null;
  /** Drawing scale, e.g. "1:50" or null for 3D renders. */
  scale: string | null;
  /** Sheet / page label, e.g. "A-101". */
  sheet: string | null;
  /** Free-form revision note. */
  note: string | null;
  updatedAt: Date;
  updatedBy: string;
}

/**
 * A comment / review note on a DesignVersion. Threaded: replies set
 * `parentId` to the thread root. `pinned` shows above chronological
 * order in the right-rail comments panel.
 */
export interface DesignVersionComment {
  id: number;
  versionId: number;
  author: DesignVersionOwner;
  body: string;
  pinned: boolean;
  parentId: number | null;
  createdAt: Date;
}