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
 * `createdBy`         — accountId of the provider creating the survey.
 */
export interface CreateSurveyPayload {
  projectWorkingId: number;
  conditionNote: string;
  reportUrl?: string;
  createdBy: number;
}

/**
 * Request body for `PUT /surveys/{id}`.
 * All fields are optional — only include what you want to update.
 */
export interface UpdateSurveyPayload {
  conditionNote?: string;
  reportUrl?: string;
}

/**
 * Survey response from the API.
 */
export interface Survey {
  id: number;
  projectWorkingId: number;
  version: number;
  conditionNote: string;
  reportUrl: string | null;
  createdBy: number;
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
