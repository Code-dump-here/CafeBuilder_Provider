"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import {
  createContractApi,
  getContractsApi,
  getContractApi,
  updateContractApi,
  sendContractOtpApi,
  confirmContractOtpApi,
  cancelContractApi,
} from "./contract-api";
import type {
  Contract,
  ContractListResponse,
  CreateContractPayload,
  UpdateContractPayload,
  ConfirmOtpPayload,
} from "./contract-types";

// ─── Toast messages ─────────────────────────────────────────────────────────

const TOAST = {
  createSuccess: "Hợp đồng đã được tạo.",
  updateSuccess: "Hợp đồng đã được cập nhật.",
  otpSent: "Mã OTP đã được gửi đến email của chủ dự án.",
  confirmSuccess: "Hợp đồng đã được xác nhận thành công.",
  cancelSuccess: "Hợp đồng đã được hủy.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy hợp đồng.",
  validation: "Thông tin chưa hợp lệ.",
  invalidOtp: "Mã OTP không đúng. Vui lòng thử lại.",
  generic: "Không thể thực hiện. Vui lòng thử lại sau.",
} as const;

// ─── Get Contracts Query ─────────────────────────────────────────────────────

export interface UseContractsOptions {
  projectWorkingId: number | string;
  enabled?: boolean;
}

export interface UseContractsResult {
  contracts: Contract[];
  latestContract: Contract | null;
  confirmedContract: Contract | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useContracts(options: UseContractsOptions): UseContractsResult {
  const { projectWorkingId, enabled = true } = options;

  const query = useQuery<ContractListResponse, Error>({
    queryKey: ["contracts", { projectWorkingId }],
    queryFn: async ({ signal }) => {
      return getContractsApi(Number(projectWorkingId), { signal });
    },
    enabled: enabled && Boolean(projectWorkingId),
    staleTime: 30 * 1000,
  });

  const contracts = query.data?.items ?? [];

  // Get the latest contract (highest id)
  const latestContract = React.useMemo(() => {
    if (contracts.length === 0) return null;
    return [...contracts].sort((a, b) => b.id - a.id)[0];
  }, [contracts]);

  // Get the confirmed contract if any
  const confirmedContract = React.useMemo(() => {
    return contracts.find((c) => c.status === "confirmed") ?? null;
  }, [contracts]);

  return {
    contracts,
    latestContract,
    confirmedContract,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Get Single Contract Query ───────────────────────────────────────────────

export interface UseContractOptions {
  contractId: number | string;
  enabled?: boolean;
}

export interface UseContractResult {
  contract: Contract | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useContract(options: UseContractOptions): UseContractResult {
  const { contractId, enabled = true } = options;

  const query = useQuery<Contract, Error>({
    queryKey: ["contracts", "detail", { contractId }],
    queryFn: async ({ signal }) => {
      return getContractApi(Number(contractId), { signal });
    },
    enabled: enabled && Boolean(contractId),
    staleTime: 30 * 1000,
  });

  return {
    contract: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Create Contract Mutation ────────────────────────────────────────────────

export interface CreateContractOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (contract: Contract) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useCreateContractMutation(
  options: CreateContractOptions = {},
) {
  return useMutation<Contract, AppError, CreateContractPayload>({
    mutationFn: (payload) => createContractApi(payload),

    onSuccess: (contract) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.createSuccess;
        console.log(message); // TODO: wire to toast
      }
      options.onSuccessSideEffect?.(contract);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        console.log(message); // TODO: wire to toast
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Update Contract Mutation ─────────────────────────────────────────────────

export interface UpdateContractOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (contract: Contract) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useUpdateContractMutation(
  options: UpdateContractOptions = {},
) {
  return useMutation<
    Contract,
    AppError,
    { contractId: number; payload: UpdateContractPayload }
  >({
    mutationFn: ({ contractId, payload }) =>
      updateContractApi(contractId, payload),

    onSuccess: (contract) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.updateSuccess;
        console.log(message); // TODO: wire to toast
      }
      options.onSuccessSideEffect?.(contract);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        console.log(message); // TODO: wire to toast
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Send OTP Mutation ───────────────────────────────────────────────────────

export interface SendContractOtpOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (contract: Contract) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useSendContractOtpMutation(
  options: SendContractOtpOptions = {},
) {
  return useMutation<Contract, AppError, number>({
    mutationFn: (contractId) => sendContractOtpApi(contractId),

    onSuccess: (contract) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.otpSent;
        console.log(message); // TODO: wire to toast
      }
      options.onSuccessSideEffect?.(contract);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        console.log(message); // TODO: wire to toast
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Confirm OTP Mutation ─────────────────────────────────────────────────────

export interface ConfirmContractOtpOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (contract: Contract) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useConfirmContractOtpMutation(
  options: ConfirmContractOtpOptions = {},
) {
  return useMutation<
    Contract,
    AppError,
    { contractId: number; payload: ConfirmOtpPayload }
  >({
    mutationFn: ({ contractId, payload }) =>
      confirmContractOtpApi(contractId, payload),

    onSuccess: (contract) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.confirmSuccess;
        console.log(message); // TODO: wire to toast
      }
      options.onSuccessSideEffect?.(contract);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        console.log(message); // TODO: wire to toast
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Cancel Contract Mutation ─────────────────────────────────────────────────

export interface CancelContractOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (contract: Contract) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useCancelContractMutation(
  options: CancelContractOptions = {},
) {
  return useMutation<Contract, AppError, number>({
    mutationFn: (contractId) => cancelContractApi(contractId),

    onSuccess: (contract) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.cancelSuccess;
        console.log(message); // TODO: wire to toast
      }
      options.onSuccessSideEffect?.(contract);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        console.log(message); // TODO: wire to toast
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveErrorMessage(error: AppError): string {
  if (error.isNetworkError) return TOAST.network;
  if (error.isTimeout) return TOAST.timeout;

  switch (error.status) {
    case 400:
      // Check for OTP-specific error
      if (
        error.message &&
        error.message.toLowerCase().includes("otp")
      ) {
        return TOAST.invalidOtp;
      }
      return TOAST.validation;
    case 401:
      return TOAST.unauthorized;
    case 403:
      return TOAST.forbidden;
    case 404:
      return TOAST.notFound;
    default:
      if (
        error.message &&
        error.message.trim().length > 0 &&
        !/^Request failed/i.test(error.message)
      ) {
        return error.message;
      }
      return TOAST.generic;
  }
}
