/**
 * Mirrors the C# `DesignVersion` / `DesignDrawing` entities (see
 * `features/projects/use-design-brief.ts` for the same C#-first convention).
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

/**
 * Mirrors the wire `DesignStatus` enum from `api/designs`:
 *   - `in_progress`  — initial create state, only the owner (creator) can edit.
 *   - `submitted`    — provider uploaded at least one file and submitted for review.
 *   - `approved`     — owner approved. Locked — no further edits/files.
 *   - `revision`     — owner asked for a revision with a `reason`. Provider
 *                       restarts the cycle via `POST /designs/{id}/start-revision`.
 *
 * This used to be a 3-value mock enum (`DRAFT | WORKING | PUBLISHED`) which
 * collapsed three distinct wire states into one. That hid important lifecycle
 * signals from the UI (e.g. a design waiting for owner review looked
 * identical to one in active drafting). Keep the wire enum 1:1 so the
 * StatusDot and gating logic stay aligned with the backend.
 */
export type VersionStatus =
  | "in_progress"
  | "submitted"
  | "approved"
  | "revision";

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
  // No `owner`: the designs list API doesn't return an author, so the table
  // used to render a synthetic placeholder account for every row. The column
  // was removed rather than keep showing invented data.
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

// ─────────────────────────────────────────────────────────────────────────
// Design Version Snapshot (Full History)
//
// Mirrors the wire contract for `GET /api/designs/{id}/versions` (and
// `GET /api/designs/{id}/versions/{versionId}`). Every submit / approve
// on the backend now produces a NEW immutable snapshot — we keep all of
// them so the UI can render a true audit timeline (who submitted /
// approved what, when, with what status, what images).
//
// Important differences vs. the legacy `DesignVersion`:
//   - This is the *snapshot* returned by the API (one record per submit
//     or approve event).
//   - `DesignVersion` (above) is the *current design* projected into a
//     version shape for the file-list table. They are NOT the same data:
//     a single design can have multiple snapshot rows.
//
// The new endpoint paginates (`pageNumber`, `pageSize`) and orders by
// `snapshottedAt DESC` so the freshest snapshot surfaces first.

/**
 * Snapshot trigger — what produced this row.
 *
 * `revision` snapshots are the only place a past revision reason survives:
 * `designs.reason` holds a single value that the next revision round
 * overwrites, so historical reasons can only be read back from here.
 */
export type DesignVersionSnapshotKind = "submitted" | "approved" | "revision";

export interface DesignVersionImage {
  id: number;
  /** FK to the source `DesignImage.Id`, nulled when the source is deleted. */
  originalImageId: number | null;
  /** COPY of the GCS ObjectName — survives deletion of the source image. */
  imageUrl: string;
  caption: string | null;
  uploadedBy: number;
  uploadedAt: Date;
}

export interface DesignVersionSnapshot {
  id: number;
  designId: number;
  snapshotKind: DesignVersionSnapshotKind;
  /** Semantic version at the moment of snapshot (e.g. "0.1", "1.5"). */
  version: string;
  title: string | null;
  type: import("./design-types").DesignType;
  /** Status at the moment of snapshot (typically equals snapshotKind). */
  status: import("./design-types").DesignStatus;
  reason: string | null;
  createdBy: number | null;
  snapshottedBy: number | null;
  createdAt: Date;
  snapshottedAt: Date;
  images: DesignVersionImage[];
}

/** Paged response for `GET /api/designs/{id}/versions`. */
export interface DesignVersionSnapshotPage {
  items: DesignVersionSnapshot[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}
