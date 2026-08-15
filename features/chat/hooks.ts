/**
 * React Query hooks for the Chat feature.
 *
 * Architecture:
 * - `useConversations` — fetches the thread list for an engagement.
 *   Accepts an optional `override` for the mock-override pattern used by
 *   the existing `useMessageThreads` → `THREADS_OVERRIDE` swap.
 * - `useConversation` — fetches a single conversation detail (first page of messages).
 * - `useSendMessage` — sends a message with optional file attachments.
 * - `useCreateConversation` — creates a new thread.
 * - `useDeleteConversation` — deletes a thread.
 * - `useDeleteMessage` — deletes a message.
 * - `useChatPolling` — polling hook for real-time message updates.
 */

"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { tokenStore } from "@/features/auth/token-store";

import type {
  ConversationDetailParams,
  ConversationDetailResponse,
  ConversationListParams,
  ConversationListResponse,
  ConversationSummary,
  CreateConversationPayload,
  MessageAttachmentResponse,
  MessageListParams,
  MessageResponse,
  SendMessagePayload,
} from "./types";

import {
  createConversationApi,
  deleteConversationApi,
  deleteMessageApi,
  getConversationApi,
  getConversationsApi,
  getMessagesApi,
  sendMessageApi,
} from "./api";

// ─── Polling backoff ─────────────────────────────────────────────────────────

/** Doubling steps applied to `intervalMs` after consecutive poll failures. */
const MAX_BACKOFF_STEPS = 5;
/** Ceiling for the backed-off poll interval (1 minute). */
const MAX_POLL_INTERVAL_MS = 60_000;

// ─── Hydration gate (mirrors use-project-detail.ts) ────────────────────────────

function useAuthHydrated(): boolean {
  return React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.isHydrated(),
    () => true,
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** ISO date string → Date (always valid, no-op in SSR). */
function parseDate(iso: string): Date {
  return new Date(iso);
}

// ─── Conversation list ────────────────────────────────────────────────────────

export interface UseConversationsOptions {
  projectWorkingId: number | null;
  pageNumber?: number;
  pageSize?: number;
  /**
   * Optional override: return data from this fn instead of the API.
   * Mirrors the `__setMessagesOverride` pattern used by `useMessageThreads`.
   */
  override?: (projectWorkingId: number) => ConversationListResponse | null;
}

export interface UseConversationsResult {
  data: ConversationListResponse | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useConversations(
  options: UseConversationsOptions,
): UseConversationsResult {
  const {
    projectWorkingId,
    pageNumber = 1,
    pageSize = 20,
    override,
  } = options;

  const hydrated = useAuthHydrated();
  const enabled = hydrated && projectWorkingId != null;

  const query = useQuery<ConversationListResponse, Error>({
    queryKey: queryKeys.chat.conversations(
      projectWorkingId ?? 0,
      pageNumber,
      pageSize,
    ),
    queryFn: ({ signal }) =>
      getConversationsApi(
        { projectWorkingId: projectWorkingId!, pageNumber, pageSize },
        { signal },
      ),
    enabled,
    staleTime: 30_000,
  });

  if (override && projectWorkingId != null) {
    return {
      data: override(projectWorkingId),
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: async () => {},
    };
  }

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Single conversation detail ────────────────────────────────────────────────

export interface UseConversationOptions {
  conversationId: number | null;
  pageNumber?: number;
  pageSize?: number;
  override?: (
    conversationId: number,
  ) => ConversationDetailResponse | null;
}

export interface UseConversationResult {
  data: ConversationDetailResponse | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useConversation(
  options: UseConversationOptions,
): UseConversationResult {
  const {
    conversationId,
    pageNumber = 1,
    pageSize = 50,
    override,
  } = options;

  const hydrated = useAuthHydrated();
  const enabled = hydrated && conversationId != null;

  const query = useQuery<ConversationDetailResponse, Error>({
    queryKey: queryKeys.chat.conversation(
      conversationId ?? 0,
      pageNumber,
      pageSize,
    ),
    queryFn: ({ signal }) =>
      getConversationApi(conversationId!, { pageNumber, pageSize }, { signal }),
    enabled,
    staleTime: 30_000,
  });

  if (override && conversationId != null) {
    return {
      data: override(conversationId),
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: async () => {},
    };
  }

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Message polling ─────────────────────────────────────────────────────────

export interface UseChatPollingOptions {
  conversationId: number | null;
  /**
   * Called whenever a new batch of messages arrives.
   * Return `true` to indicate the messages were handled (stop appending
   * automatically — caller manages the state). Return `false` or omit
   * to let the hook append to a local accumulator.
   */
  onMessages?: (messages: MessageResponse[]) => boolean | void;
  /** Cursor: id of the most recently seen message. Defaults to latest from the conversation page. */
  initialSinceId?: number;
  /** Polling interval in ms. Default 3000. */
  intervalMs?: number;
}

export interface UseChatPollingResult {
  /**
   * Accumulated new messages received since the hook mounted.
   * Caller can display these in addition to the initial message list.
   */
  /** Owned by the hook — treat as immutable; consumers map/filter, never push. */
  newMessages: readonly MessageResponse[];
  isPolling: boolean;
}

/**
 * Returned when the accumulator holds another conversation's batches. A single
 * frozen instance so `newMessages` keeps a stable identity across renders —
 * consumers put it in `useMemo` dependency arrays.
 */
const NO_MESSAGES: readonly MessageResponse[] = Object.freeze([]);

/**
 * Polls `GET /api/chat/messages?conversationId=&sinceId=` at `intervalMs`.
 *
 * Strategy (per Chat-API.md):
 * - On mount: poll with `sinceId` = `initialSinceId` (latest known message).
 *   If `initialSinceId` is absent: poll without cursor (full initial load).
 * - After each successful poll with results: advance `sinceId` to the last
 *   received message id.
 * - After send: caller should call `refetch()` to poll immediately.
 * - On unmount: clear the timer.
 *
 * The `onMessages` callback receives each batch. If it returns `true`,
 * the hook does NOT append to the local accumulator.
 */
export function useChatPolling(
  options: UseChatPollingOptions,
): UseChatPollingResult {
  const {
    conversationId,
    onMessages,
    initialSinceId,
    intervalMs = 3000,
  } = options;

  const lastIdRef = React.useRef<number | null>(initialSinceId ?? null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  // Set by the effect cleanup so an in-flight poll can't reschedule itself
  // after teardown. See the `finally` block in `poll`.
  const stoppedRef = React.useRef(false);
  const failureCountRef = React.useRef(0);

  // Polled batches, tagged with the conversation they belong to. Storing the id
  // alongside them lets a thread switch clear the list by DERIVATION below,
  // instead of an effect calling `setNewMessages([])` synchronously — which is
  // what triggered the cascading-render error. It also closes a race the reset
  // had: a poll for the old thread that resolved after the switch could append
  // to the new thread's list, and `chat-view` re-tags whatever it gets with the
  // active thread id, so those messages would have surfaced under the wrong
  // conversation.
  const [accumulated, setAccumulated] = React.useState<{
    conversationId: number | null;
    messages: MessageResponse[];
  }>({ conversationId: null, messages: [] });

  const newMessages =
    accumulated.conversationId === conversationId
      ? accumulated.messages
      : NO_MESSAGES;

  const [isPolling, setIsPolling] = React.useState(false);

  const poll = React.useCallback(async () => {
    if (conversationId == null) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsPolling(true);
    try {
      const params: MessageListParams = { conversationId };
      if (lastIdRef.current != null) {
        params.sinceId = lastIdRef.current;
      }

      const messages = await getMessagesApi(params, {
        signal: abortRef.current.signal,
      });

      if (messages.length > 0) {
        lastIdRef.current = messages[messages.length - 1].id;
        const skipAccumulate = onMessages?.(messages) === true;
        if (!skipAccumulate) {
          setAccumulated((prev) =>
            prev.conversationId === conversationId
              ? { conversationId, messages: [...prev.messages, ...messages] }
              : { conversationId, messages },
          );
        }
      }
      // Reset backoff after a clean round-trip.
      failureCountRef.current = 0;
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return;
      // Log polling errors without crashing — the next tick will retry.
      console.error("[chat] polling error", err);
      failureCountRef.current += 1;
    } finally {
      // `finally` runs even on the AbortError `return` above. Without this
      // guard, tearing down (unmount or switching conversation) left the
      // aborted request to schedule a fresh timer that nothing held a
      // reference to — so every conversation switch leaked an immortal poll
      // loop against the previous conversation.
      if (!stoppedRef.current) {
        setIsPolling(false);
        // Back off on consecutive failures so a down backend isn't hammered
        // at a flat 3s; reset to `intervalMs` on the next success.
        const backoff = Math.min(
          intervalMs * 2 ** Math.min(failureCountRef.current, MAX_BACKOFF_STEPS),
          MAX_POLL_INTERVAL_MS,
        );
        timerRef.current = setTimeout(poll, backoff);
      }
    }
  }, [conversationId, onMessages, intervalMs]);

  // Start polling when conversationId is set
  React.useEffect(() => {
    if (conversationId == null) return;

    stoppedRef.current = false;
    failureCountRef.current = 0;
    lastIdRef.current = initialSinceId ?? null;
    // No `setNewMessages([])` here — `newMessages` is derived from whether the
    // accumulator's conversation id matches the active one, so the switch has
    // already emptied it by the time this runs.
    timerRef.current = setTimeout(poll, 0);

    return () => {
      // Order matters: flag first, so a poll that is mid-flight when we abort
      // below sees `stoppedRef` set by the time its `finally` runs.
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // `pollMemo` used to sit here — `useCallback(poll, [poll])`, memoising an
  // already-memoised callback, never read by anything. It carried its own
  // eslint-disable and one of this file's compiler errors.
  //
  // The empty `useEffect` on [intervalMs] went with it: it ran no code, and
  // the behaviour it documented (a changed interval is picked up on the next
  // cycle) is a property of `poll` reading `intervalMs` when it reschedules,
  // not of anything that effect did.

  return {
    newMessages,
    isPolling,
  };
}

// ─── Send message ─────────────────────────────────────────────────────────────

export interface UseSendMessageOptions {
  onSuccessSideEffect?: (message: MessageResponse) => void;
}

export function useSendMessage(options: UseSendMessageOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccessSideEffect } = options;

  return useMutation<
    MessageResponse,
    Error,
    { conversationId: number; payload: SendMessagePayload }
  >({
    mutationFn: ({ conversationId, payload }) =>
      sendMessageApi(conversationId, payload),
    onSuccess: async (message, variables) => {
      // Invalidate conversation detail to pick up the new message
      queryClient.invalidateQueries({
        queryKey: ["chat", "conversation", variables.conversationId],
      });
      // Also invalidate conversation list (lastMessage + updatedAt changed)
      const conv = message.conversationId;
      queryClient.invalidateQueries({
        queryKey: ["chat", "conversations"],
      });
      onSuccessSideEffect?.(message);
    },
  });
}

// ─── Create conversation ──────────────────────────────────────────────────────

export function useCreateConversation(
  onSuccessSideEffect?: (conversation: ConversationDetailResponse) => void,
) {
  const queryClient = useQueryClient();

  return useMutation<
    ConversationDetailResponse,
    Error,
    CreateConversationPayload
  >({
    mutationFn: (payload) => createConversationApi(payload),
    onSuccess: (conversation, payload) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(
          payload.projectWorkingId,
          1,
          20,
        ),
      });
      onSuccessSideEffect?.(conversation);
    },
  });
}

// ─── Delete conversation ─────────────────────────────────────────────────────

export function useDeleteConversation(
  projectWorkingId: number,
  onSuccessSideEffect?: () => void,
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (conversationId) => deleteConversationApi(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversations(projectWorkingId, 1, 20),
      });
      onSuccessSideEffect?.();
    },
  });
}

// ─── Delete message ──────────────────────────────────────────────────────────

export function useDeleteMessage(
  conversationId: number,
  onSuccessSideEffect?: () => void,
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (messageId) => deleteMessageApi(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.conversation(conversationId, 1, 50),
      });
      onSuccessSideEffect?.();
    },
  });
}

// ─── Utility: parse API message to display shape ─────────────────────────────

/**
 * Converts an API `MessageResponse` to the display-friendly `Message` shape
 * expected by the existing `thread-detail.tsx` and `thread-list.tsx` components.
 *
 * This is the bridge: the API uses `SenderInfo`, `sentAt`, `viewUrl`.
 * The UI components use `MessageAuthor`, `createdAt`, `title`.
 */
export function apiMessageToDisplay(
  msg: MessageResponse,
  threadId: number,
): {
  id: number;
  threadId: number;
  author: {
    id: number;
    fullName: string;
    avatarColor: string | null;
  };
  body: string;
  createdAt: Date;
  attachments: Array<{
    id: number;
    kind: "FILE" | "MEDIA" | "VOICE";
    title: string;
    subtitle: string | null;
    fileType: string | null;
  }>;
  pending?: boolean;
} {
  const fileType = getFileType(msg.body ?? "", msg.attachments);

  return {
    id: msg.id,
    threadId,
    author: {
      id: msg.sender.accountId,
      fullName: msg.sender.displayName,
      avatarColor: null, // avatarUrl always null in v1
    },
    body: msg.body ?? "",
    createdAt: parseDate(msg.sentAt),
    attachments: msg.attachments.map((att) => ({
      id: att.id,
      kind: fileKind(att.contentType),
      title: att.fileName,
      subtitle: formatFileSize(att.sizeBytes),
      fileType,
    })),
  };
}

function getFileType(
  body: string,
  attachments: MessageAttachmentResponse[],
): string | null {
  if (attachments.length === 0) return null;
  const ext = attachments[0].fileName.split(".").pop()?.toUpperCase() ?? "";
  return ext.length > 0 ? ext.slice(0, 4) : null;
}

function fileKind(contentType: string): "FILE" | "MEDIA" | "VOICE" {
  if (contentType.startsWith("image/")) return "MEDIA";
  if (contentType.startsWith("audio/")) return "VOICE";
  return "FILE";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Converts an API `ConversationSummary` or `ConversationDetailResponse`
 * to the display `MessageThread` shape expected by the existing UI components.
 *
 * Note: `lastMessage.body` may be null (file-only message).
 */
export function apiConversationToThread(
  conv: ConversationSummary | ConversationDetailResponse,
  projectId: number,
): {
  id: number;
  projectId: number;
  title: string;
  snippet: string;
  participants: Array<{
    id: number;
    fullName: string;
    avatarColor: string | null;
  }>;
  overflowParticipants: number;
  lastActivityAt: Date;
  unreadCount: number;
  pinned: boolean;
  kind: "DIRECT" | "ROOM" | "CHANNEL";
  channelLabel: string | null;
  isRoom: boolean;
  messages: Array<ReturnType<typeof apiMessageToDisplay>>;
  members: Array<{
    id: number;
    fullName: string;
    avatarColor: string | null;
  }>;
  attachments: Array<{
    id: number;
    kind: "FILE" | "MEDIA" | "VOICE";
    title: string;
    subtitle: string | null;
    fileType: string | null;
  }>;
} {
  const sender = conv.createdBy;

  // ConversationSummary has `lastMessage`, ConversationDetailResponse has `messages[]`.
  // Determine which shape we have by checking for the `lastMessage` property.
  const hasSummaryShape = "lastMessage" in conv;
  const lastMsg = hasSummaryShape ? (conv as ConversationSummary).lastMessage : null;
  const lastMsgSender = lastMsg?.sender ?? sender;

  // Use topic or fall back to generated name
  const title = conv.topic ?? `Thread #${conv.id}`;
  // snippet: last message preview, or "No messages yet"
  const snippet =
    lastMsg?.body ?? (lastMsg ? "Attachment" : "No messages yet");

  // Participants = last message sender + thread creator (deduped)
  const participantMap = new Map<number, { id: number; fullName: string; avatarColor: string | null }>();
  if (lastMsgSender) {
    participantMap.set(lastMsgSender.accountId, {
      id: lastMsgSender.accountId,
      fullName: lastMsgSender.displayName,
      avatarColor: null,
    });
  }
  if (sender.accountId !== lastMsgSender?.accountId) {
    participantMap.set(sender.accountId, {
      id: sender.accountId,
      fullName: sender.displayName,
      avatarColor: null,
    });
  }
  const participants = Array.from(participantMap.values());

  return {
    id: conv.id,
    projectId,
    title,
    snippet,
    participants,
    overflowParticipants: 0,
    lastActivityAt: parseDate(conv.updatedAt),
    unreadCount: hasSummaryShape ? (conv as ConversationSummary).unreadCount : 0,
    pinned: false, // No pinned field in API v1
    kind: "ROOM", // No kind field in API v1 — default to ROOM
    channelLabel: null, // No channel label in API v1
    isRoom: true, // No kind → conservatively assume room
    messages: [], // Loaded separately via useConversation
    members: participants, // Approximation — full members list needs separate API
    attachments: lastMsg?.attachments.map((att: MessageAttachmentResponse) => ({
      id: att.id,
      kind: fileKind(att.contentType),
      title: att.fileName,
      subtitle: formatFileSize(att.sizeBytes),
      fileType: att.fileName.split(".").pop()?.toUpperCase() ?? null,
    })) ?? [],
  };
}
