import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  CreateSurveyPayload,
  UpdateSurveyPayload,
  Survey,
  SurveyListResponse,
} from "./survey-types";

/**
 * Create a new survey for an engagement.
 *
 * Endpoint: `POST /api/surveys`
 *
 * Authorization:
 *   Bearer access token required (provider creating the survey).
 *
 * Error shape:
 *   - 400  — invalid body (missing conditionNote, invalid projectWorkingId, etc.).
 *   - 401  — no / expired access token.
 *   - 404  — projectWorkingId doesn't exist or engagement not in valid state.
 */
export async function createSurveyApi(
  payload: CreateSurveyPayload,
  config?: RequestConfig,
): Promise<Survey> {
  const response = await api.post<Survey>("/api/surveys", payload, config);
  return response.data;
}

/**
 * Get surveys for an engagement (paginated).
 *
 * Endpoint: `GET /api/surveys?projectWorkingId=`
 *
 * Authorization:
 *   Bearer access token required.
 */
export async function getSurveysApi(
  projectWorkingId: number,
  config?: RequestConfig,
): Promise<SurveyListResponse> {
  const response = await api.get<SurveyListResponse>(
    `/api/surveys?projectWorkingId=${projectWorkingId}`,
    config,
  );
  return response.data;
}

/**
 * Get a single survey by ID.
 *
 * Endpoint: `GET /api/surveys/{id}`
 *
 * Authorization:
 *   Bearer access token required.
 */
export async function getSurveyApi(
  surveyId: number,
  config?: RequestConfig,
): Promise<Survey> {
  const response = await api.get<Survey>(`/api/surveys/${surveyId}`, config);
  return response.data;
}

/**
 * Update a survey (conditionNote and/or reportUrl).
 *
 * Endpoint: `PUT /api/surveys/{id}`
 *
 * Authorization:
 *   Bearer access token required (provider who created the survey).
 *
 * Error shape:
 *   - 400  — invalid body.
 *   - 401  — no / expired access token.
 *   - 403  — not the survey owner.
 *   - 404  — survey not found.
 */
export async function updateSurveyApi(
  surveyId: number,
  payload: UpdateSurveyPayload,
  config?: RequestConfig,
): Promise<Survey> {
  const response = await api.put<Survey>(`/api/surveys/${surveyId}`, payload, config);
  return response.data;
}
