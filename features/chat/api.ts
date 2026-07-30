/**
 * API functions for the Chat feature.
 * Base URL: `https://api.smartcoffeebuilder.vn/api` (same Axios instance).
 *
 * All functions assume the Axios interceptor already attached the Bearer token,
 * so no manual `Authorization` header wiring is needed.
 */

import { api } from "@/lib/http/axios";
import type {
  ApiSuccessResponse,
  RequestConfig,
} from "@/lib/http/types";

import type {
  ConversationDetailParams,
  ConversationDetailResponse,
  ConversationListParams,
  ConversationListResponse,
  ConversationSummary,
  CreateConversationPayload,
  MessageListParams,
  MessageResponse,
  PatchConversationPayload,
  SendMessagePayload,
} from "./types";

// ─── Conversations ───────────────────────────────────────────────────────────

/**
 * `GET /api/chat/conversations?projectWorkingId=&pageNumber=&pageSize=`
 *
 * Returns the paginated list of threads (conversations) scoped to a
 * single engagement.
 */
export async function getConversationsApi(
  params: ConversationListParams,
  config?: RequestConfig,
): Promise<ConversationListResponse> {
  const { projectWorkingId, pageNumber = 1, pageSize = 20 } = params;
  const response =
    await api.get<ApiSuccessResponse<ConversationListResponse> | ConversationListResponse>(
      "/api/chat/conversations",
      {
        ...config,
        params: { projectWorkingId, pageNumber, pageSize },
      },
    );
  // Backend may return flat object or wrapped response
  const result = (response.data as ApiSuccessResponse<ConversationListResponse>).data ?? (response.data as ConversationListResponse);
  if (!result || !Array.isArray(result.items)) {
    console.error("[chat] getConversationsApi: unexpected response shape", { response, result });
    throw new Error("Invalid response from server");
  }
  return result;
}

/**
 * `GET /api/chat/conversations/{id}?pageNumber=&pageSize=`
 *
 * Returns the conversation detail with its first page of messages.
 * Messages are in SentAt ASC order (oldest → newest).
 */
export async function getConversationApi(
  conversationId: number,
  params: ConversationDetailParams = {},
  config?: RequestConfig,
): Promise<ConversationDetailResponse> {
  const { pageNumber = 1, pageSize = 50 } = params;
  const response =
    await api.get<ApiSuccessResponse<ConversationDetailResponse> | ConversationDetailResponse>(
      `/api/chat/conversations/${conversationId}`,
      {
        ...config,
        params: { pageNumber, pageSize },
      },
    );
  // Backend may return flat object or wrapped response
  const result = (response.data as ApiSuccessResponse<ConversationDetailResponse>).data ?? (response.data as ConversationDetailResponse);
  if (!result || typeof result.id !== "number") {
    console.error("[chat] getConversationApi: unexpected response shape", { response, result });
    throw new Error("Invalid response from server");
  }
  return result;
}

/**
 * `POST /api/chat/conversations`
 *
 * Creates a new thread within an engagement.
 * The service auto-generates "Thread #N" if `topic` is empty/whitespace.
 */
export async function createConversationApi(
  payload: CreateConversationPayload,
  config?: RequestConfig,
): Promise<ConversationDetailResponse> {
  const response =
    await api.post<ApiSuccessResponse<ConversationDetailResponse> | ConversationDetailResponse>(
      "/api/chat/conversations",
      payload,
      config,
    );

  // Backend may return flat object (no ApiSuccessResponse wrapper) or wrapped response
  // { data: ConversationDetailResponse } vs ConversationDetailResponse directly
  const result = (response.data as ApiSuccessResponse<ConversationDetailResponse>).data ?? (response.data as ConversationDetailResponse);
  
  if (!result || typeof result.id !== "number") {
    console.error("[chat] createConversationApi: unexpected response shape", { response, result });
    throw new Error("Invalid response from server");
  }
  
  return result;
}

/**
 * `PATCH /api/chat/conversations/{id}`
 *
 * Updates conversation metadata. Sending `{}` or `null` leaves topic unchanged.
 */
export async function patchConversationApi(
  conversationId: number,
  payload: PatchConversationPayload,
  config?: RequestConfig,
): Promise<ConversationSummary> {
  const response =
    await api.patch<ApiSuccessResponse<ConversationSummary> | ConversationSummary>(
      `/api/chat/conversations/${conversationId}`,
      payload,
      config,
    );
  // Backend may return flat object or wrapped response
  const result = (response.data as ApiSuccessResponse<ConversationSummary>).data ?? (response.data as ConversationSummary);
  if (!result || typeof result.id !== "number") {
    console.error("[chat] patchConversationApi: unexpected response shape", { response, result });
    throw new Error("Invalid response from server");
  }
  return result;
}

/**
 * `DELETE /api/chat/conversations/{id}`
 *
 * Deletes a thread and cascades all its messages + attachment files
 * (both DB records and GCS objects).
 *
 * Only the thread creator (`createdBy`) can delete.
 */
export async function deleteConversationApi(
  conversationId: number,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/chat/conversations/${conversationId}`, config);
}

// ─── Messages ───────────────────────────────────────────────────────────────

/**
 * `GET /api/chat/messages?conversationId=&sinceId=&sinceSentAt=&limit=`
 *
 * Polling endpoint for new messages.
 *
 * - With `sinceId`: returns messages with `id > sinceId` (fastest, preferred).
 * - With `sinceSentAt`: returns messages with `sentAt > sinceSentAt`
 *   (fallback when `sinceId` is unavailable).
 * - Without either: returns up to `limit` messages (default 100) for the
 *   initial load or reconnect scenario.
 *
 * Returns `MessageResponse[]` — an empty array `[]` when there are no new
 * messages. Never throws on an empty result.
 */
export async function getMessagesApi(
  params: MessageListParams,
  config?: RequestConfig,
): Promise<MessageResponse[]> {
  const { conversationId, sinceId, sinceSentAt, limit = 100 } = params;
  const response = await api.get<MessageResponse[]>(
    "/api/chat/messages",
    {
      ...config,
      params: {
        conversationId,
        ...(sinceId !== undefined ? { sinceId } : {}),
        ...(sinceSentAt !== undefined ? { sinceSentAt } : {}),
        limit,
      },
    },
  );
  return response.data;
}

/**
 * `POST /api/chat/messages/{conversationId}` (multipart/form-data)
 *
 * Sends a message with optional file attachments.
 *
 * Rules (enforced by the backend):
 * - At least one of `body` or `files` must be non-empty.
 * - `body` is optional when the message contains only attachments.
 * - No limit on number of files per request.
 * - Max request size: ~51 MB (Kestrel default).
 *
 * Returns the persisted `MessageResponse` with resolved attachment URLs.
 */
export async function sendMessageApi(
  conversationId: number,
  payload: SendMessagePayload,
  config?: RequestConfig,
): Promise<MessageResponse> {
  const form = new FormData();

  if (payload.body && payload.body.trim()) {
    form.append("body", payload.body.trim());
  }

  if (payload.files && payload.files.length > 0) {
    for (const file of payload.files) {
      form.append("files", file);
    }
  }

  // Remove default Content-Type to let Axios auto-detect for FormData
  const { "Content-Type": _ct, ...restConfig } = (config ?? {}) as object & Record<string, unknown>;
  const cleanConfig = {
    ...(restConfig as RequestConfig),
    headers: {
      ...(restConfig as RequestConfig)?.headers,
      "Content-Type": "multipart/form-data",
    },
  };

  const response =
    await api.post<ApiSuccessResponse<MessageResponse> | MessageResponse>(
      `/api/chat/messages/${conversationId}`,
      form,
      cleanConfig,
    );

  // Backend may return flat object or wrapped response
  const result = (response.data as ApiSuccessResponse<MessageResponse>).data ?? (response.data as MessageResponse);
  if (!result || typeof result.id !== "number") {
    console.error("[chat] sendMessageApi: unexpected response shape", { response, result });
    throw new Error("Invalid response from server");
  }
  return result;
}

/**
 * `DELETE /api/chat/messages/{id}`
 *
 * Deletes a message and cascades its attachment files (both DB records
 * and GCS objects).
 *
 * Only the message sender (`senderId`) can delete.
 */
export async function deleteMessageApi(
  messageId: number,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/chat/messages/${messageId}`, config);
}
