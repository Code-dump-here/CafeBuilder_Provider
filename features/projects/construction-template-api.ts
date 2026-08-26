import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  ApplyConstructionTemplatePayload,
  ApplyConstructionTemplateResult,
  ConstructionTemplate,
  ConstructionTemplateListResponse,
  CreateConstructionTemplatePayload,
  ReorderConstructionTemplateItemsPayload,
  TemplateServiceKind,
} from "./construction-template-types";

/**
 * Templates the caller may use: the system's public ones plus their own.
 *
 * Endpoint: `GET /api/construction-templates?serviceKind=&pageNumber=&pageSize=`
 *
 * Page size defaults to 50 because this list feeds a "pick one" dialog — a
 * second page would hide templates behind a control the dialog doesn't have.
 */
export async function getConstructionTemplatesApi(
  options?: {
    serviceKind?: TemplateServiceKind;
    pageNumber?: number;
    pageSize?: number;
  },
  config?: RequestConfig,
): Promise<ConstructionTemplateListResponse> {
  const params = new URLSearchParams();
  if (options?.serviceKind) params.set("serviceKind", options.serviceKind);
  params.set("pageSize", String(options?.pageSize ?? 50));
  if (options?.pageNumber) params.set("pageNumber", String(options.pageNumber));

  const response = await api.get<ConstructionTemplateListResponse>(
    `/api/construction-templates?${params.toString()}`,
    config,
  );
  return response.data;
}

/** Endpoint: `GET /api/construction-templates/{id}` */
export async function getConstructionTemplateApi(
  id: string,
  config?: RequestConfig,
): Promise<ConstructionTemplate> {
  const response = await api.get<ConstructionTemplate>(
    `/api/construction-templates/${id}`,
    config,
  );
  return response.data;
}

/**
 * Author a new template. Provider only, and always private — see
 * `CreateConstructionTemplatePayload`.
 *
 * Endpoint: `POST /api/construction-templates`
 */
export async function createConstructionTemplateApi(
  payload: CreateConstructionTemplatePayload,
  config?: RequestConfig,
): Promise<ConstructionTemplate> {
  const response = await api.post<ConstructionTemplate>(
    "/api/construction-templates",
    payload,
    config,
  );
  return response.data;
}

/**
 * Copy a template onto an engagement, generating its milestones and tasks.
 *
 * Endpoint: `POST /api/construction-templates/{id}/apply`
 *
 * Refused with 409 unless the engagement has a confirmed contract, and again
 * if `startDate` is in the past — every generated `estimateAt` counts forward
 * from it, so a back-dated start produces a plan that is already overdue.
 */
export async function applyConstructionTemplateApi(
  id: string,
  payload: ApplyConstructionTemplatePayload,
  config?: RequestConfig,
): Promise<ApplyConstructionTemplateResult> {
  const response = await api.post<ApplyConstructionTemplateResult>(
    `/api/construction-templates/${id}/apply`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Reorder a template's phases.
 *
 * Endpoint: `PUT /api/construction-templates/{id}/items/reorder`
 *
 * Author (or admin) only, and only ever affects future applications — applying
 * a template copies it, so plans generated earlier keep the order they got.
 */
export async function reorderConstructionTemplateItemsApi(
  id: string,
  payload: ReorderConstructionTemplateItemsPayload,
  config?: RequestConfig,
): Promise<ConstructionTemplate> {
  const response = await api.put<ConstructionTemplate>(
    `/api/construction-templates/${id}/items/reorder`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `DELETE /api/construction-templates/{id}` */
export async function deleteConstructionTemplateApi(
  id: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/construction-templates/${id}`, config);
}
