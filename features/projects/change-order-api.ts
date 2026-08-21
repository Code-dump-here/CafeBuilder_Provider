import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  ChangeOrder,
  ChangeOrderListResponse,
  ChangeOrderStatus,
  ChangeOrderSummary,
  CreateChangeOrderPayload,
  RevisionQuota,
  UpdateChangeOrderPayload,
} from "./change-order-types";

/**
 * Change orders on one engagement.
 *
 * Endpoint: `GET /api/change-orders?projectWorkingId=&status=&pageNumber=&pageSize=`
 */
export async function getChangeOrdersApi(
  projectWorkingId: string,
  options?: { status?: ChangeOrderStatus; pageNumber?: number; pageSize?: number },
  config?: RequestConfig,
): Promise<ChangeOrderListResponse> {
  const params = new URLSearchParams();
  params.set("projectWorkingId", projectWorkingId);
  params.set("pageSize", String(options?.pageSize ?? 50));
  if (options?.status) params.set("status", options.status);
  if (options?.pageNumber) params.set("pageNumber", String(options.pageNumber));

  const response = await api.get<ChangeOrderListResponse>(
    `/api/change-orders?${params.toString()}`,
    config,
  );
  return response.data;
}

/** Endpoint: `GET /api/change-orders/summary?projectWorkingId=` */
export async function getChangeOrderSummaryApi(
  projectWorkingId: string,
  config?: RequestConfig,
): Promise<ChangeOrderSummary> {
  const response = await api.get<ChangeOrderSummary>(
    `/api/change-orders/summary?projectWorkingId=${projectWorkingId}`,
    config,
  );
  return response.data;
}

/**
 * Revision budget for one design.
 *
 * Endpoint: `GET /api/change-orders/revision-quota/{designId}`
 */
export async function getRevisionQuotaApi(
  designId: string,
  config?: RequestConfig,
): Promise<RevisionQuota> {
  const response = await api.get<RevisionQuota>(
    `/api/change-orders/revision-quota/${designId}`,
    config,
  );
  return response.data;
}

/** Endpoint: `POST /api/change-orders` */
export async function createChangeOrderApi(
  payload: CreateChangeOrderPayload,
  config?: RequestConfig,
): Promise<ChangeOrder> {
  const response = await api.post<ChangeOrder>("/api/change-orders", payload, config);
  return response.data;
}

/**
 * Endpoint: `PUT /api/change-orders/{id}`
 *
 * Only the side that raised it, and only while it is still `pending`.
 */
export async function updateChangeOrderApi(
  id: string,
  payload: UpdateChangeOrderPayload,
  config?: RequestConfig,
): Promise<ChangeOrder> {
  const response = await api.put<ChangeOrder>(`/api/change-orders/${id}`, payload, config);
  return response.data;
}

/**
 * Endpoint: `POST /api/change-orders/{id}/accept`
 *
 * Refused with 401 for the side that raised it — the other party decides.
 */
export async function acceptChangeOrderApi(
  id: string,
  config?: RequestConfig,
): Promise<ChangeOrder> {
  const response = await api.post<ChangeOrder>(
    `/api/change-orders/${id}/accept`,
    {},
    config,
  );
  return response.data;
}

/** Endpoint: `POST /api/change-orders/{id}/reject` — reason is required. */
export async function rejectChangeOrderApi(
  id: string,
  rejectReason: string,
  config?: RequestConfig,
): Promise<ChangeOrder> {
  const response = await api.post<ChangeOrder>(
    `/api/change-orders/${id}/reject`,
    { rejectReason },
    config,
  );
  return response.data;
}

/**
 * Endpoint: `DELETE /api/change-orders/{id}`
 *
 * Withdrawal, available only while pending. Once answered it is a record of a
 * decision and the server refuses to remove it.
 */
export async function withdrawChangeOrderApi(
  id: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/change-orders/${id}`, config);
}
