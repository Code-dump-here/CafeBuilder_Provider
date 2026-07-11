import { api } from "@/lib/http/axios";
import type { AccountSummary, UserRole } from "@/features/auth/api";
import type { ApiSuccessResponse, RequestConfig } from "@/lib/http/types";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Identifier alias for the logged-in account's basic summary. Equivalent to
 * `AccountSummary` from the auth feature — kept here so callers that only
 * care about user-profile concerns don't need to import from auth.
 */
export type Account = AccountSummary;

/**
 * Shape returned by `GET /api/auth/me`. Backend uses the `{ data, message?, meta? }`
 * envelope for this endpoint, so `getMe` unwraps `.data`. If the backend ever
 * drops the envelope, switch to reading `response.data` directly.
 */
export type Me = {
  accountId: number;
  email: string;
  role: UserRole;
  fullName?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
};

export type UpdateMePayload = Partial<
  Pick<Me, "fullName" | "phoneNumber" | "avatarUrl">
>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function unwrapEnvelope<T>(payload: ApiSuccessResponse<T>): T {
  return payload.data;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

export async function getMe(config?: RequestConfig): Promise<Me> {
  const response = await api.get<ApiSuccessResponse<Me>>(
    "/api/auth/me",
    config,
  );
  return unwrapEnvelope(response.data);
}

export async function updateMe(
  payload: UpdateMePayload,
  config?: RequestConfig,
): Promise<Me> {
  const response = await api.patch<ApiSuccessResponse<Me>>(
    "/api/auth/me",
    payload,
    config,
  );
  return unwrapEnvelope(response.data);
}