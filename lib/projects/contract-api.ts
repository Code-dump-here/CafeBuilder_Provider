import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  Contract,
  ContractListResponse,
  CreateContractPayload,
  UpdateContractPayload,
  ConfirmOtpPayload,
} from "./contract-types";

/**
 * Create a new contract (provider only).
 *
 * Endpoint: `POST /api/contracts`
 *
 * Authorization:
 *   Bearer access token required (provider creating the contract).
 *
 * Error shape:
 *   - 400  — invalid body.
 *   - 401  — no / expired access token.
 *   - 404  — projectWorkingId doesn't exist or engagement not in valid state.
 */
export async function createContractApi(
  payload: CreateContractPayload,
  config?: RequestConfig,
): Promise<Contract> {
  const response = await api.post<Contract>("/api/contracts", payload, config);
  return response.data;
}

/**
 * Get contracts for an engagement (paginated).
 *
 * Endpoint: `GET /api/contracts?projectWorkingId=`
 *
 * Authorization:
 *   Bearer access token required.
 */
export async function getContractsApi(
  projectWorkingId: number,
  config?: RequestConfig,
): Promise<ContractListResponse> {
  const response = await api.get<ContractListResponse>(
    `/api/contracts?projectWorkingId=${projectWorkingId}`,
    config,
  );
  return response.data;
}

/**
 * Get a single contract by ID.
 *
 * Endpoint: `GET /api/contracts/{id}`
 *
 * Authorization:
 *   Bearer access token required.
 */
export async function getContractApi(
  contractId: number,
  config?: RequestConfig,
): Promise<Contract> {
  const response = await api.get<Contract>(`/api/contracts/${contractId}`, config);
  return response.data;
}

/**
 * Update a contract (only while drafted).
 *
 * Endpoint: `PUT /api/contracts/{id}`
 *
 * Authorization:
 *   Bearer access token required (provider who created the contract).
 *
 * Error shape:
 *   - 400  — invalid body.
 *   - 401  — no / expired access token.
 *   - 403  — not the contract owner or contract not in drafted status.
 *   - 404  — contract not found.
 */
export async function updateContractApi(
  contractId: number,
  payload: UpdateContractPayload,
  config?: RequestConfig,
): Promise<Contract> {
  const response = await api.put<Contract>(
    `/api/contracts/${contractId}`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Send OTP to owner for contract confirmation.
 *
 * Endpoint: `POST /api/contracts/{id}/send-otp`
 *
 * Authorization:
 *   Bearer access token required (provider).
 *
 * Effect:
 *   Contract status changes from `drafted` → `pending_otp`.
 *   Response includes `otpExpiresAt`.
 *
 * Error shape:
 *   - 400  — contract not in drafted status.
 *   - 401  — no / expired access token.
 *   - 403  — not the contract owner.
 *   - 404  — contract not found.
 */
export async function sendContractOtpApi(
  contractId: number,
  config?: RequestConfig,
): Promise<Contract> {
  const response = await api.post<Contract>(
    `/api/contracts/${contractId}/send-otp`,
    undefined,
    config,
  );
  return response.data;
}

/**
 * Confirm contract with OTP (owner).
 *
 * Endpoint: `POST /api/contracts/{id}/confirm-otp`
 *
 * Authorization:
 *   Bearer access token required (owner).
 *
 * Input:
 *   - `otpCode` — the 6-digit code sent to owner's email.
 *   - `confirmedBy` — owner's accountId.
 *
 * Effect:
 *   Contract status changes from `pending_otp` → `confirmed`.
 *
 * Error shape:
 *   - 400  — invalid OTP or contract not in pending_otp status.
 *   - 401  — no / expired access token.
 *   - 404  — contract not found.
 */
export async function confirmContractOtpApi(
  contractId: number,
  payload: ConfirmOtpPayload,
  config?: RequestConfig,
): Promise<Contract> {
  const response = await api.post<Contract>(
    `/api/contracts/${contractId}/confirm-otp`,
    payload,
    config,
  );
  return response.data;
}

/**
 * Cancel a contract (provider, before confirmation).
 *
 * Endpoint: `POST /api/contracts/{id}/cancel`
 *
 * Authorization:
 *   Bearer access token required (provider).
 *
 * Effect:
 *   Contract status changes to `cancelled`. Only allowed before confirmation.
 *
 * Error shape:
 *   - 400  — contract already confirmed or cancelled.
 *   - 401  — no / expired access token.
 *   - 403  — not the contract owner.
 *   - 404  — contract not found.
 */
export async function cancelContractApi(
  contractId: number,
  config?: RequestConfig,
): Promise<Contract> {
  const response = await api.post<Contract>(
    `/api/contracts/${contractId}/cancel`,
    undefined,
    config,
  );
  return response.data;
}
