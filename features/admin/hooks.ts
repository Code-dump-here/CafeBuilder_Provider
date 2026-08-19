"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query/keys";

import {
  getAdminOverview,
  getRevenueReport,
  getTransactions,
  getAccounts,
  getAccount,
  updateAccountStatus,
  deleteAccount,
} from "./api";

import type {
  AccountListParams,
  RevenueParams,
  TransactionListParams,
  UpdateAccountStatusPayload,
} from "./types";

// ─── Overview ─────────────────────────────────────────────────────────────────

export function useAdminOverview() {
  return useQuery({
    queryKey: queryKeys.admin.overview(),
    queryFn: getAdminOverview,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ─── Revenue ─────────────────────────────────────────────────────────────────

export function useRevenueReport(params?: RevenueParams) {
  return useQuery({
    queryKey: queryKeys.admin.revenue(params),
    queryFn: () => getRevenueReport(params),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useTransactions(params?: TransactionListParams) {
  return useQuery({
    queryKey: queryKeys.admin.transactions(params),
    queryFn: () => getTransactions(params),
    staleTime: 30 * 1000,
  });
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export function useAccounts(params?: AccountListParams) {
  return useQuery({
    queryKey: queryKeys.admin.accounts(params),
    queryFn: () => getAccounts(params),
    staleTime: 15 * 1000,
  });
}

export function useAccount(id: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.account(id),
    queryFn: () => getAccount(id!),
    enabled: id !== null,
    staleTime: 30 * 1000,
  });
}

export function useUpdateAccountStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAccountStatusPayload }) =>
      updateAccountStatus(id, payload),
    onSuccess: (_, variables) => {
      // Invalidate accounts list
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.accounts() });
      // Invalidate specific account
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.account(variables.id) });
      // Invalidate overview (account counts may have changed)
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview() });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      // Invalidate accounts list
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.accounts() });
      // Invalidate overview
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview() });
    },
  });
}
