/**
 * Feature-level types for the Chat API.
 * Derived from `Chat-API.md` — mirrors the wire format exactly so
 * responses from `/api/chat/*` deserialize without transformation.
 */

// ─── Shared sub-types ────────────────────────────────────────────────────────

export interface SenderInfo {
  accountId: string;
  displayName: string;
  role: "owner" | "provider" | "admin";
  /** Always null in v1 — reserved for future avatar CDN. */
  avatarUrl: string | null;
}

export interface MessageAttachmentResponse {
  id: string;
  messageId: string;
  /** Object name on GCS — internal only. */
  url: string;
  /** ✅ Public CDN URL — FE always uses this. */
  viewUrl: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string; // ISO 8601 UTC
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  sender: SenderInfo;
  /** null = message contains only attachments */
  body: string | null;
  attachments: MessageAttachmentResponse[];
  sentAt: string; // ISO 8601 UTC
}

// ─── Conversation (thread) types ────────────────────────────────────────────

/**
 * Summary shape returned by `GET /api/chat/conversations`.
 * `lastMessage` is null when the thread has no messages yet.
 */
export interface ConversationSummary {
  id: string;
  projectWorkingId: string;
  /** null when the service auto-generated "Thread #N". */
  topic: string | null;
  createdBy: SenderInfo;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  lastMessage: MessageResponse | null;
  /** Always 0 in v1 — no read-receipts table. */
  unreadCount: number;
}

/**
 * Detail shape returned by `GET /api/chat/conversations/{id}`.
 * Includes the first page of messages (SentAt ASC = oldest → newest).
 */
export interface ConversationDetailResponse {
  id: string;
  projectWorkingId: string;
  topic: string | null;
  createdBy: SenderInfo;
  createdAt: string;
  updatedAt: string;
  messages: MessageResponse[]; // SentAt ASC
}

// ─── API request/response shapes ─────────────────────────────────────────────

export interface ConversationListParams {
  projectWorkingId: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface ConversationListResponse {
  items: ConversationSummary[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ConversationDetailParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateConversationPayload {
  projectWorkingId: string;
  /** Optional — backend auto-generates "Thread #N" if empty. */
  topic?: string;
}

export interface PatchConversationPayload {
  /** null / empty → topic unchanged. */
  topic?: string | null;
}

export interface MessageListParams {
  conversationId: string;
  /**
   * Primary cursor — returns messages with `id > sinceId`.
   * Omit for the initial load (no cursor, returns up to `limit` messages).
   */
  sinceId?: string;
  /**
   * Fallback cursor when `sinceId` is unavailable.
   * Returns messages with `sentAt > sinceSentAt`.
   */
  sinceSentAt?: string;
  /** Default 100, max 500. */
  limit?: number;
}

export interface SendMessagePayload {
  body?: string;
  files?: File[];
}
