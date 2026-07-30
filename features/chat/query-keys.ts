import { queryKeys } from "@/lib/react-query/keys";

/**
 * Chat feature query keys.
 * These are merged into the central `queryKeys` object.
 */
export const chatKeys = {
  /**
   * Paginated thread list scoped to a single engagement.
   * Discriminators: `projectWorkingId`, `pageNumber`, `pageSize`.
   * No `isRead` discriminator — conversations are always visible to members.
   */
  conversations: (
    projectWorkingId: number,
    pageNumber: number,
    pageSize: number,
  ) =>
    [
      ...queryKeys.projects.detail(""), // placeholder — merged below
      "chat",
      "conversations",
      projectWorkingId,
      pageNumber,
      pageSize,
    ] as const,

  /**
   * Single conversation detail (first page of messages).
   * Discriminators: `conversationId`, `pageNumber`, `pageSize`.
   */
  conversation: (
    conversationId: number,
    pageNumber: number,
    pageSize: number,
  ) =>
    ["chat", "conversation", conversationId, pageNumber, pageSize] as const,
} as const;
