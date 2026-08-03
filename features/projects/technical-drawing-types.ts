/**
 * Mirrors the C# `TechnicalDrawing` and `DrawingComment` entities for the
 * `/projects/{id}/technical-drawings` page.
 *
 * - `kind` distinguishes the three viewer tabs in the UI:
 *     - `3D`       — isometric renders / model screenshots
 *     - `2D`       — floor plans, sections, elevations
 *     - `CONTRACT` — official contract drawings (issued, signed off)
 * - Comments are scoped per drawing. `pinned` shows on top regardless
 *   of chronological order.
 */

export type TechnicalDrawingKind = "3D" | "2D" | "CONTRACT";

export interface TechnicalDrawingAuthor {
  id: number;
  fullName: string;
  avatarColor: string | null;
}

/**
 * A drawing detail page (under `/projects/{id}/technical-drawings/{drawingId}`)
 * groups revisions of the same sheet/model under a "drawing" entity. The
 * `versions` list is the version history rendered in the right rail.
 */
export interface TechnicalDrawing {
  id: number;
  projectId: number;
  /** Human-friendly name, e.g. "Front Elevation" or "Isometric — Morning". */
  name: string;
  /** Sheet / model code, e.g. "A-201" or "R-401". */
  code: string;
  kind: TechnicalDrawingKind;
  /** Drawing scale, e.g. "1:50". Null for 3D / contract PDFs. */
  scale: string | null;
  /** File name shown in the viewer. */
  fileName: string;
  /** Free-form revision note. */
  note: string | null;
  /** Owner / author. */
  author: TechnicalDrawingAuthor;
  createdAt: Date;
  updatedAt: Date;
  /** Version history (newest first). */
  versions: DrawingVersion[];
}

/**
 * A single revision of a drawing. Older revisions are kept around for
 * audit + compare.
 */
export interface DrawingVersion {
  id: number;
  /** Sequential revision label, e.g. "Rev. A", "Rev. B". */
  revision: string;
  /** ISO date the revision was authored. */
  authoredAt: Date;
  /** Display file name. */
  fileName: string;
  /** Free-form changelog note. */
  changeNote: string | null;
  /** Author / reviewer. */
  author: TechnicalDrawingAuthor;
}

/**
 * Groups in the left-tree navigator. Used by the detail page to chunk
 * drawings into "Plans", "Sections", "Renders", etc.
 */
export interface DrawingGroup {
  id: number;
  /** Group label, e.g. "Plans", "Elevations". */
  label: string;
  /** IDs of drawings in the group. Order preserved. */
  drawingIds: number[];
  /** Optional icon component hint; falls back to a folder icon. */
  icon?: "plans" | "elevations" | "renders" | "sections" | "contract";
}

export interface DrawingComment {
  id: number;
  drawingId: number;
  author: TechnicalDrawingAuthor;
  body: string;
  pinned: boolean;
  /** Optional reply target — set on replies, null on top-level threads. */
  parentId: number | null;
  createdAt: Date;
}

export const TECHNICAL_DRAWING_TABS: TechnicalDrawingKind[] = [
  "3D",
  "2D",
  "CONTRACT",
];
