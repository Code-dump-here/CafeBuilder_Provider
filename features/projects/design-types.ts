/**
 * Design types — mirrors the wire contract for `api/designs`.
 *
 * Designs belong to a `projectWorkingId` (engagement). They have a
 * lifecycle:
 *
 *   in_progress  — initial create state, only the owner (creator) can edit.
 *   submitted    — provider uploaded at least one file and submitted for review.
 *   approved     — owner approved. Locked — no further edits/files.
 *   revision     — owner asked for a revision with a `reason`. Provider
 *                  restarts the cycle via `POST /designs/{id}/start-revision`.
 *
 * Files are tracked as `DesignImageResponse` and gated by the parent
 * design's status (no upload/delete when `approved`).
 */

/** Allowed `type` values for a design — mirrors the C# `DesignType`
 *  enum documented in `API_FLOW_FE.md` §6.
 *
 *  - `concept`            — early-stage direction: moodboards, references,
 *                           schematic sketches.
 *  - `layout_2d`          — floor plans, seating layouts, reflected
 *                           ceiling plans.
 *  - `render_3d`          — 3D mockups, isometric / perspective renders.
 *  - `technical_drawing`  — construction-ready sheets, sections,
 *                           elevations, detail callouts.
 *
 *  The four-value enum is intentionally narrower than the legacy
 *  `DrawingCategory` (REVISION / FLOOR_PLAN / 3D / ELEVATION / SECTION)
 *  used by the in-app tab system. We translate between the two at the
 *  adapter layer (see `mapDesignTypeToCategory` / `mapCategoryToDesignType`)
 *  so the tab UI can keep its finer-grained filter while the wire
 *  contract stays aligned with the backend. */
export type DesignType =
  | "concept"
  | "layout_2d"
  | "render_3d"
  | "technical_drawing";

export type DesignStatus = "in_progress" | "submitted" | "approved" | "revision";

/** A single uploaded file attached to a design. */
export interface DesignImage {
  id: string;
  designId: string;
  /** GCS object name — never displayed directly. Use `viewUrl` for rendering. */
  imageUrl: string;
  /** Display URL — already signed/exposed for the FE. */
  viewUrl: string;
  caption: string | null;
  uploadedBy: string;
  createdAt: string;
}

/**
 * Single design returned by every `api/designs` endpoint.
 *
 * Mirrors `DesignResponse` documented in `API_FLOW_FE.md` §6.
 */
export interface Design {
  id: string;
  projectWorkingId: string;
  title: string;
  /** Semantic version, e.g. "0.1" or "1.3". Backend increments on
   *  start-revision (`+0.1`). */
  version: string;
  type: DesignType;
  /** Latest revision reason — populated when `status === "revision"`. */
  reason: string | null;
  /**
   * Provider-supplied description of what changed in the *current* working
   * round. Backend only keeps the value of the latest round; the snapshot
   * taken on submit freezes it into `DesignVersion.ChangeSummary` so the
   * audit timeline still shows what was changed in past rounds.
   *
   * Required by the provider workflow before submitting a revision round —
   * the owner relies on it to know what was redone. See spec §8.3.
   */
  changeSummary: string | null;
  /**
   * Number of revision rounds the owner has *requested*. Only increments on
   * `POST /api/designs/{id}/request-revision` — a provider resubmitting on
   * their own does NOT bump this. Used together with the engagement's
   * `freeRevisionCount` (from `RevisionQuota`) to compute whether the next
   * round costs the owner an extra fee.
   */
  revisionCount: number;
  status: DesignStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  images: DesignImage[];
}

/**
 * Paginated response for `GET /designs?projectWorkingId=`.
 * Backend reuses the standard `PagedResponse` envelope.
 */
export interface DesignListResponse {
  items: Design[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * Request body for `POST /designs`.
 *
 * Only `projectWorkingId` is required by the backend today; `title` and
 * `type` are required in the FE so we can route the row into the right
 * tab (FLOOR_PLAN / 3D / …) on first render. The creator is always the
 * signed-in account — the backend derives it from the JWT and ignores
 * any client-supplied value, so it isn't part of this payload.
 */
export interface CreateDesignPayload {
  projectWorkingId: string;
  title: string;
  type: DesignType;
}

/**
 * Request body for `PUT /designs/{id}`.
 * All fields optional — only include what you want to update.
 *
 * `changeSummary` is the provider's note of what changed in the current
 * working round. The backend freezes it into the `submitted`/`approved`
 * snapshot on the next submit, so it MUST be set before the provider
 * hits submit — otherwise the audit history shows no notes for the round
 * even though changes were made (see spec §8.3).
 */
export interface UpdateDesignPayload {
  title?: string;
  type?: DesignType;
  changeSummary?: string | null;
}

/**
 * Request body for `POST /designs/{id}/request-revision` (owner only).
 *
 * `acceptExtraFee` defaults to `false`. Set to `true` ONLY after the owner
 * has been told the next round costs money and has agreed to pay it — the
 * backend returns `409 Conflict` (body carrying `extraFeeAmount`) when the
 * next round exceeds `Quotation.FreeRevisionCount` and the flag is still
 * `false`. See spec §6.8 and §9.3 for the full flow.
 */
export interface RequestRevisionPayload {
  reason: string;
  acceptExtraFee?: boolean;
}

/**
 * Server reply on `POST /api/designs/{id}/request-revision` when the next
 * round would exceed the free-revision quota AND the caller did NOT set
 * `acceptExtraFee: true`. The 409 body has this shape — see spec §9.3
 * (Luồng B).
 *
 * `extraFeeAmount` may be `null` when the provider never published a price
 * for extra rounds — in that case the owner cannot accept the fee and the
 * design stays `submitted`.
 */
export interface ExtrapRequiredErrorBody {
  error: "extrap_required";
  message: string;
  extraFeeAmount: number | null;
}

/**
 * Fields for the multipart file upload at `POST /api/designs/{id}/files`.
 * `file` is the binary part (handled separately by axios); the string
 * fields go as regular form fields.
 */
export interface DesignImageUploadFields {
  /** Display caption / description for the uploaded file. */
  caption?: string;
}

/** Resolved result after a successful `POST /api/designs/{id}/files`. */
export interface DesignImageUploadResponse {
  id: string;
  designId: string;
  imageUrl: string;
  viewUrl: string;
  caption: string | null;
  uploadedBy: string;
  createdAt: string;
}
