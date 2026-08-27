/**
 * Payment batch API — mirrors the wire contract for `api/payment-batches`.
 *
 * There is deliberately no `create`: instalments come from the approved
 * quotation when the contract is signed. See `payment-batch-types.ts`.
 */

import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  LinkConstructionItemPayload,
  PaymentBatch,
  PaymentBatchListResponse,
  PaymentBatchStatus,
  RejectPaymentBatchPayload,
  SubmitPaymentProofPayload,
} from "./payment-batch-types";

/**
 * Instalments of one contract or one engagement.
 *
 * Endpoint: `GET /api/payment-batches?contractId=|projectWorkingId=&status=`
 *
 * Ordered by contract then `sortOrder`, so the list reads as the payment
 * schedule it came from.
 */
export async function getPaymentBatchesApi(
  filter: { contractId?: string; projectWorkingId?: string },
  options?: {
    status?: PaymentBatchStatus;
    pageNumber?: number;
    pageSize?: number;
  },
  config?: RequestConfig,
): Promise<PaymentBatchListResponse> {
  const params = new URLSearchParams();
  if (filter.contractId) params.set("contractId", filter.contractId);
  if (filter.projectWorkingId) params.set("projectWorkingId", filter.projectWorkingId);
  if (options?.status) params.set("status", options.status);
  // A payment schedule is short and is read as a whole — the header totals are
  // wrong if a second page is left out of them.
  params.set("pageSize", String(options?.pageSize ?? 50));
  if (options?.pageNumber) params.set("pageNumber", String(options.pageNumber));

  const response = await api.get<PaymentBatchListResponse>(
    `/api/payment-batches?${params.toString()}`,
    config,
  );
  return response.data;
}

/** Endpoint: `GET /api/payment-batches/{id}` */
export async function getPaymentBatchApi(
  id: string,
  config?: RequestConfig,
): Promise<PaymentBatch> {
  const response = await api.get<PaymentBatch>(`/api/payment-batches/${id}`, config);
  return response.data;
}

/**
 * Owner declares a transfer. Callable more than once — for a batch paid in
 * parts, or after the provider rejected the previous proof.
 *
 * Endpoint: `POST /api/payment-batches/{id}/proofs`
 */
export async function submitPaymentProofApi(
  id: string,
  payload: SubmitPaymentProofPayload,
  config?: RequestConfig,
): Promise<PaymentBatch> {
  const response = await api.post<PaymentBatch>(
    `/api/payment-batches/${id}/proofs`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Provider confirms the money arrived. Also flips the linked construction
 * item's `isPaid`.
 *
 * Endpoint: `POST /api/payment-batches/{id}/confirm`
 */
export async function confirmPaymentBatchApi(
  id: string,
  config?: RequestConfig,
): Promise<PaymentBatch> {
  const response = await api.post<PaymentBatch>(
    `/api/payment-batches/${id}/confirm`,
    {},
    config,
  );
  return response.data;
}

/** Endpoint: `POST /api/payment-batches/{id}/reject` */
export async function rejectPaymentBatchApi(
  id: string,
  payload: RejectPaymentBatchPayload,
  config?: RequestConfig,
): Promise<PaymentBatch> {
  const response = await api.post<PaymentBatch>(
    `/api/payment-batches/${id}/reject`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Provider ties an instalment to the milestone it pays for. Send `null` to
 * unlink.
 *
 * Endpoint: `PUT /api/payment-batches/{id}/construction-item`
 */
export async function linkPaymentBatchConstructionItemApi(
  id: string,
  payload: LinkConstructionItemPayload,
  config?: RequestConfig,
): Promise<PaymentBatch> {
  const response = await api.put<PaymentBatch>(
    `/api/payment-batches/${id}/construction-item`,
    payload,
    config,
  );
  return response.data;
}
