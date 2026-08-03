import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  AdminOverview,
  RevenueReport,
  TransactionListResponse,
  AccountListResponse,
  Account,
  UpdateAccountStatusPayload,
  AccountListParams,
  RevenueParams,
  TransactionListParams,
} from "./types";

// ─── Overview ─────────────────────────────────────────────────────────────────

export async function getAdminOverview(): Promise<AdminOverview> {
  const response = await api.get<AdminOverview>("/api/admin/overview", {
    ...requestConfig(),
  });
  return response.data;
}

// ─── Revenue ─────────────────────────────────────────────────────────────────

export async function getRevenueReport(
  params?: RevenueParams
): Promise<RevenueReport> {
  const config = requestConfig();
  if (params?.from) config.params = { ...config.params, from: params.from };
  if (params?.to) config.params = { ...config.params, to: params.to };
  if (params?.groupBy) config.params = { ...config.params, groupBy: params.groupBy };

  const response = await api.get<RevenueReport>("/api/admin/revenue", config);
  return response.data;
}

export async function getTransactions(
  params?: TransactionListParams
): Promise<TransactionListResponse> {
  const config = requestConfig();
  if (params?.pageNumber)
    config.params = { ...config.params, pageNumber: params.pageNumber };
  if (params?.pageSize)
    config.params = { ...config.params, pageSize: params.pageSize };
  if (params?.status) config.params = { ...config.params, status: params.status };
  if (params?.purpose) config.params = { ...config.params, purpose: params.purpose };
  if (params?.from) config.params = { ...config.params, from: params.from };
  if (params?.to) config.params = { ...config.params, to: params.to };

  const response = await api.get<TransactionListResponse>(
    "/api/admin/revenue/transactions",
    config
  );
  return response.data;
}

// ─── Account Management ────────────────────────────────────────────────────────

export async function getAccounts(
  params?: AccountListParams
): Promise<AccountListResponse> {
  const config = requestConfig();
  if (params?.pageNumber)
    config.params = { ...config.params, pageNumber: params.pageNumber };
  if (params?.pageSize)
    config.params = { ...config.params, pageSize: params.pageSize };
  if (params?.role) config.params = { ...config.params, role: params.role };
  if (params?.status) config.params = { ...config.params, status: params.status };
  if (params?.search) config.params = { ...config.params, search: params.search };
  if (params?.includeDeleted)
    config.params = { ...config.params, includeDeleted: params.includeDeleted };

  const response = await api.get<AccountListResponse>(
    "/api/admin/accounts",
    config
  );
  return response.data;
}

export async function getAccount(id: number): Promise<Account> {
  const response = await api.get<Account>(`/api/admin/accounts/${id}`, requestConfig());
  return response.data;
}

export async function updateAccountStatus(
  id: number,
  payload: UpdateAccountStatusPayload
): Promise<Account> {
  const response = await api.patch<Account>(
    `/api/admin/accounts/${id}/status`,
    payload,
    requestConfig()
  );
  return response.data;
}

export async function deleteAccount(id: number): Promise<void> {
  await api.delete(`/api/admin/accounts/${id}`, requestConfig());
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requestConfig(): RequestConfig {
  return {
    headers: { "Content-Type": "application/json" },
  };
}
