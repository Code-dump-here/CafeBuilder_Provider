/**
 * Quotation API — mirrors the wire contract for `api/quotations`.
 *
 * The list endpoint filters by the signed-in account server-side: a provider
 * gets only their own quotations, an owner gets the ones sent to their
 * projects. There is no client-side filtering to add on top, and none to
 * forget.
 */

import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  AcceptQuotationResponse,
  AddQuotationAttachmentPayload,
  CreateQuotationPayload,
  Quotation,
  QuotationListResponse,
  QuotationStatus,
  RespondQuotationPayload,
  UpdateQuotationPayload,
} from "./quotation-types";

/**
 * Quotations for one anchor.
 *
 * Endpoint: `GET /api/quotations?applyId=|projectWorkingId=|postId=&status=`
 *
 * `postId` is the comparison view: every provider's bid on one post, side by
 * side. That is the query the owner's decision is actually made from.
 */
export async function getQuotationsApi(
  filter: { applyId?: string; projectWorkingId?: string; postId?: string },
  options?: {
    status?: QuotationStatus;
    pageNumber?: number;
    pageSize?: number;
  },
  config?: RequestConfig,
): Promise<QuotationListResponse> {
  const params = new URLSearchParams();
  if (filter.applyId) params.set("applyId", filter.applyId);
  if (filter.projectWorkingId) params.set("projectWorkingId", filter.projectWorkingId);
  if (filter.postId) params.set("postId", filter.postId);
  if (options?.status) params.set("status", options.status);
  // A bid set is read whole to be compared; paging it would hide a rival bid.
  params.set("pageSize", String(options?.pageSize ?? 50));
  if (options?.pageNumber) params.set("pageNumber", String(options.pageNumber));

  const response = await api.get<QuotationListResponse>(
    `/api/quotations?${params.toString()}`,
    config,
  );
  return response.data;
}

/** Endpoint: `GET /api/quotations/{id}` */
export async function getQuotationApi(
  id: string,
  config?: RequestConfig,
): Promise<Quotation> {
  const response = await api.get<Quotation>(`/api/quotations/${id}`, config);
  return response.data;
}

/**
 * Create a draft. Provider only.
 *
 * Endpoint: `POST /api/quotations`
 */
export async function createQuotationApi(
  payload: CreateQuotationPayload,
  config?: RequestConfig,
): Promise<Quotation> {
  const response = await api.post<Quotation>("/api/quotations", payload, config);
  return response.data;
}

/** Endpoint: `PUT /api/quotations/{id}` — drafts only. */
export async function updateQuotationApi(
  id: string,
  payload: UpdateQuotationPayload,
  config?: RequestConfig,
): Promise<Quotation> {
  const response = await api.put<Quotation>(`/api/quotations/${id}`, payload, config);
  return response.data;
}

/**
 * Publish the draft to the owner (`draft` → `sent`).
 *
 * Endpoint: `POST /api/quotations/{id}/send`
 */
export async function sendQuotationApi(
  id: string,
  config?: RequestConfig,
): Promise<Quotation> {
  const response = await api.post<Quotation>(`/api/quotations/${id}/send`, {}, config);
  return response.data;
}

/**
 * Owner asks for a different version. The reason is mandatory server-side —
 * a revision request with no reason gives the provider nothing to act on.
 *
 * Endpoint: `POST /api/quotations/{id}/request-revision`
 */
export async function requestQuotationRevisionApi(
  id: string,
  payload: RespondQuotationPayload,
  config?: RequestConfig,
): Promise<Quotation> {
  const response = await api.post<Quotation>(
    `/api/quotations/${id}/request-revision`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `POST /api/quotations/{id}/reject` */
export async function rejectQuotationApi(
  id: string,
  payload: RespondQuotationPayload,
  config?: RequestConfig,
): Promise<Quotation> {
  const response = await api.post<Quotation>(
    `/api/quotations/${id}/reject`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Owner approves. Not merely a status change: for an application-anchored
 * quotation this accepts the application, opens the engagement, closes the
 * post and drops every rival bid. Owner role only — not delegable to admin.
 *
 * Endpoint: `POST /api/quotations/{id}/accept`
 */
export async function acceptQuotationApi(
  id: string,
  config?: RequestConfig,
): Promise<AcceptQuotationResponse> {
  const response = await api.post<AcceptQuotationResponse>(
    `/api/quotations/${id}/accept`,
    {},
    config,
  );
  return response.data;
}

/** Endpoint: `POST /api/quotations/{id}/attachments` — file uploaded first via `api/files`. */
export async function addQuotationAttachmentApi(
  id: string,
  payload: AddQuotationAttachmentPayload,
  config?: RequestConfig,
): Promise<Quotation> {
  const response = await api.post<Quotation>(
    `/api/quotations/${id}/attachments`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `DELETE /api/quotations/{id}/attachments/{attachmentId}` */
export async function removeQuotationAttachmentApi(
  id: string,
  attachmentId: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/quotations/${id}/attachments/${attachmentId}`, config);
}

/** Endpoint: `DELETE /api/quotations/{id}` — unsent drafts only. */
export async function deleteQuotationApi(
  id: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/quotations/${id}`, config);
}
