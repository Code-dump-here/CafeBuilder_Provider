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
 */
export async function createSurveyApi(
  payload: CreateSurveyPayload,
  config?: RequestConfig,
): Promise<Survey> {
  const response = await api.post<Survey>("/api/surveys", payload, config);
  return response.data;
}

/**
 * Which record the surveys hang off. Exactly one, mirroring the server's
 * `ck_surveys_target` check:
 *   - `applyId` — surveys done while bidding, before any engagement exists.
 *   - `projectWorkingId` — surveys done once the provider is engaged.
 */
export type SurveyAnchor =
  | { applyId: string; projectWorkingId?: never }
  | { projectWorkingId: string; applyId?: never };

/**
 * Get surveys for one anchor (paginated).
 *
 * Endpoint: `GET /api/surveys?projectWorkingId=` or `?applyId=`
 *
 * Authorization:
 *   Bearer access token required.
 */
export async function getSurveysApi(
  anchor: SurveyAnchor,
  config?: RequestConfig,
): Promise<SurveyListResponse> {
  const query =
    "applyId" in anchor && anchor.applyId
      ? `applyId=${anchor.applyId}`
      : `projectWorkingId=${anchor.projectWorkingId}`;
  const response = await api.get<SurveyListResponse>(
    `/api/surveys?${query}`,
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
  surveyId: string,
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
 */
export async function updateSurveyApi(
  surveyId: string,
  payload: UpdateSurveyPayload,
  config?: RequestConfig,
): Promise<Survey> {
  const response = await api.put<Survey>(`/api/surveys/${surveyId}`, payload, config);
  return response.data;
}
