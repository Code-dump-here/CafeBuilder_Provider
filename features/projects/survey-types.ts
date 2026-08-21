/**
 * Survey types — mirrors the wire contract for `api/surveys`.
 *
 * Surveys are pre-contract documents that providers create to document
 * site conditions before work begins. They require engagement `accepted`
 * and contractType has design.
 */

/**
 * Request body for `POST /surveys`.
 *
 * `projectWorkingId`  — the engagement this survey belongs to.
 * `conditionNote`     — free-form notes about site conditions.
 * `reportUrl`         — optional file uploaded via `/files` endpoint.
 *
 * `createdBy` is resolved server-side from the JWT, not sent here.
 */
export interface CreateSurveyPayload {
  /** Send exactly one of `projectWorkingId` / `applyId`. */
  projectWorkingId?: string;
  /**
   * Anchor the survey to an application instead of an engagement.
   *
   * This is the pre-selection path: a provider can book and file a site survey
   * while still only an applicant, so the shop owner can compare surveys (and
   * the quotations attached to the same application) before choosing anyone.
   * No accepted engagement is required.
   */
  applyId?: string;
  /** Planned visit. Send this alone to book a slot before visiting. */
  scheduledAt?: string;
  /** When the visit actually happened. */
  surveyedAt?: string;
  /** Optional at booking time — filled in after the visit. */
  conditionNote?: string;
  reportUrl?: string;
}

/**
 * Request body for `PUT /surveys/{id}`.
 * All fields are optional — only include what you want to update.
 */
export interface UpdateSurveyPayload {
  /** Reschedule the visit. */
  scheduledAt?: string;
  /** Mark when the visit took place. */
  surveyedAt?: string;
  conditionNote?: string;
  reportUrl?: string;
}

/**
 * Survey response from the API.
 */
export interface Survey {
  id: string;
  /** Null when the survey belongs to an application rather than an engagement. */
  projectWorkingId: string | null;
  /** Null when the survey belongs to an engagement. */
  applyId?: string | null;
  /** Planned visit time. Null when no slot was booked. */
  scheduledAt?: string | null;
  /** Actual visit time. Null until the visit is recorded. */
  surveyedAt?: string | null;
  /**
   * Being retired backend-side, and no longer shown or sorted on anywhere.
   * Optional so this type stays honest once the API stops sending it.
   */
  version?: number;
  conditionNote: string;
  /** Storage object name — not a browsable URL. Use `reportViewUrl` to link/preview. */
  reportUrl: string | null;
  /** Absolute public URL for the report file. Null only when no file was uploaded. */
  reportViewUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated response for GET /surveys.
 */
export interface SurveyListResponse {
  items: Survey[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}
