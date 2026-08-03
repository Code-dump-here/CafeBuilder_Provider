/**
 * Chat view — orchestrates the messages page with real API data.
 *
 * Responsibilities:
 * 1. Fetch the current user's serviceProviderProfileId.
 * 2. Find the matching engagement on this project → projectWorkingId.
 * 3. Fetch conversations, map to `MessageThread[]`, hand off to existing UI.
 * 4. Polling for new messages in the active conversation.
 * 5. Send message / create thread / delete thread / delete message mutations.
 */

"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";

import { ThreadContextRail } from "@/components/messages/thread-context-rail";
import { ThreadDetail } from "@/components/messages/thread-detail";
import { ThreadList } from "@/components/messages/thread-list";
import { CreateThreadDialog } from "@/components/messages/create-thread-dialog";
import { projectActionToast } from "@/components/project-overview/project-action-toast";
import { useProjectDetail } from "@/features/projects/use-project-detail";
import { useCurrentUser } from "@/features/auth/user-context";

import type {
  Message,
  MessageAuthor,
  MessageThread,
} from "@/features/projects/messages-types";

import type { ConversationDetailResponse, ConversationSummary } from "@/features/chat";

import {
  apiConversationToThread,
  apiMessageToDisplay,
  useChatPolling,
  useCreateConversation,
  useDeleteConversation,
  useDeleteMessage,
  useSendMessage,
  getConversationApi,
  getConversationsApi,
} from "@/features/chat";

interface ChatViewProps {
  /** Rendered inside the project layout — `id` is the projectShopOwner id. */
  projectId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatView({ projectId }: ChatViewProps) {
  const t = useTranslations("Messages");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { project } = useProjectDetail(projectId);
  const { account } = useCurrentUser();

  // Current user's account id — used for ownership checks
  const currentAccountId = account?.id ?? null;

  // projectWorkingId: find the engagement whose providerId matches the current
  // user's serviceProviderProfile.id on THIS project.
  const projectWorkingId = React.useMemo(() => {
    if (!account?.serviceProvider) return null;
    const provider = project.providers.find(
      (p) => p.providerId === account.serviceProvider!.id,
    );
    return provider?.projectWorkingId ?? null;
  }, [project.providers, account?.serviceProvider]);

  // ── Conversation list ─────────────────────────────────────────────────────

  const [conversations, setConversations] = React.useState<
    (ConversationSummary | ConversationDetailResponse)[]
  >([]);
  const [conversationsLoading, setConversationsLoading] = React.useState(false);

  const loadConversations = React.useCallback(async () => {
    if (!projectWorkingId) return;
    setConversationsLoading(true);
    try {
      const result = await getConversationsApi({
        projectWorkingId,
        pageNumber: 1,
        pageSize: 100,
      });
      setConversations(result.items);
    } catch {
      // Keep existing conversations on error — don't lose the list
    } finally {
      setConversationsLoading(false);
    }
  }, [projectWorkingId]);

  React.useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Thread ↔ Conversation bridge ─────────────────────────────────────────

  // The existing UI expects `MessageThread[]`. We build them from conversations.
  // messages + attachments are populated lazily when a thread is opened.
  const [threads, setThreads] = React.useState<MessageThread[]>([]);
  const [threadMessages, setThreadMessages] = React.useState<
    Map<number, Message[]>
  >(new Map());

  React.useEffect(() => {
    setThreads(
      conversations.map((conv) =>
        apiConversationToThread(conv, parseInt(projectId, 10) || 0),
      ),
    );
  }, [conversations, projectId]);

  // ── Active thread selection ───────────────────────────────────────────────

  const rawThreadId = searchParams?.get("threadId") ?? null;
  const numericThreadId = rawThreadId ? Number.parseInt(rawThreadId, 10) : NaN;
  const isThreadIdValid =
    rawThreadId !== null &&
    !Number.isNaN(numericThreadId) &&
    threads.some((thread) => thread.id === numericThreadId);

  const fallbackId = React.useMemo(() => {
    const unread = threads.find((th) => th.unreadCount > 0);
    if (unread) return unread.id;
    const pinned = threads.find((th) => th.pinned);
    if (pinned) return pinned.id;
    return threads[0]?.id ?? null;
  }, [threads]);

  const effectiveThreadId =
    (isThreadIdValid ? numericThreadId : null) ?? fallbackId;

  // Canonicalize URL when landing without threadId
  React.useEffect(() => {
    if (effectiveThreadId == null) return;
    if (rawThreadId !== null && isThreadIdValid) return;
    const params = searchParams ?? new URLSearchParams();
    const next = new URLSearchParams(params.toString());
    next.set("threadId", String(effectiveThreadId));
    router.replace(
      `/projects/${projectId}/messages?${next.toString()}`,
      { scroll: false },
    );
  }, [
    effectiveThreadId,
    isThreadIdValid,
    projectId,
    rawThreadId,
    router,
    searchParams,
  ]);

  const selectedThread = React.useMemo(
    () => threads.find((thread) => thread.id === effectiveThreadId) ?? null,
    [threads, effectiveThreadId],
  );

  // ── Load messages for active thread ─────────────────────────────────────

  const [loadedMessages, setLoadedMessages] = React.useState<Message[]>([]);

  // Optimistic messages per thread — shown immediately on send, replaced
  // when the server-side message arrives (via polling or mutation success).
  const [optimisticMessages, setOptimisticMessages] = React.useState<
    Map<number, Message[]>
  >(new Map());

  const loadMessages = React.useCallback(async (conversationId: number) => {
    try {
      const detail = await getConversationApi(conversationId);
      const mapped: Message[] = detail.messages.map((msg) =>
        apiMessageToDisplay(msg, conversationId),
      );
      setLoadedMessages(mapped);
      setThreadMessages((prev) => {
        const next = new Map(prev);
        next.set(conversationId, mapped);
        return next;
      });
    } catch {
      setLoadedMessages([]);
    }
  }, []);

  React.useEffect(() => {
    if (effectiveThreadId != null) {
      const cached = threadMessages.get(effectiveThreadId);
      if (cached) {
        setLoadedMessages(cached);
      } else {
        loadMessages(effectiveThreadId);
      }
    } else {
      setLoadedMessages([]);
    }
  }, [effectiveThreadId, threadMessages, loadMessages]);

  // ── Polling ───────────────────────────────────────────────────────────────

  const initialSinceId = loadedMessages.at(-1)?.id ?? null;

  const { newMessages } = useChatPolling({
    conversationId: effectiveThreadId,
    initialSinceId: initialSinceId ?? undefined,
    intervalMs: 3000,
    onMessages: (msgs) => {
      if (!effectiveThreadId) return;
      const mapped: Message[] = msgs.map((msg) =>
        apiMessageToDisplay(msg, effectiveThreadId),
      );
      setLoadedMessages((prev) => [...prev, ...mapped]);
      if (msgs.length > 0) {
        const latest = msgs[msgs.length - 1];
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === effectiveThreadId
              ? { ...conv, lastMessage: latest, updatedAt: latest.sentAt }
              : conv,
          ),
        );
      }
    },
  });

  // Effective messages: merge loaded + polled new + optimistic pending,
// then dedupe by id and sort by `createdAt` ASC so the newest message
// is always at the BOTTOM of the list (matches chat convention and
// keeps auto-scroll behaviour predictable).
//
// Optimistic bubbles are kept until the matching real message arrives
// (matched by id when the mutation response lands, or by author+body
// when polling pulls it in earlier). Once matched, the optimistic is
// dropped to avoid showing the same text twice.
const effectiveMessages: Message[] = React.useMemo(() => {
    if (!selectedThread) return [];
    const base: Message[] = threadMessages.get(selectedThread.id) ?? [];
    const baseIds = new Set(base.map((m) => m.id));
    const newOnes = newMessages
      .map((msg) => apiMessageToDisplay(msg, selectedThread.id))
      .filter((m) => !baseIds.has(m.id));

    const realMessages = [...base, ...newOnes];

    // Drop optimistic bubbles already represented by a real message
    // (same author + body). FIFO so the most-recent user send stays
    // visible until its own server response lands.
    const realFingerprints = new Set(
      realMessages.map((m) => `${m.author.id}|${m.body}`),
    );
    const pendingList = optimisticMessages.get(selectedThread.id) ?? [];
    let droppedOne = false;
    const pending = pendingList.filter((m) => {
      if (m.id >= 0) return true;
      const fp = `${m.author.id}|${m.body}`;
      if (!droppedOne && realFingerprints.has(fp)) {
        droppedOne = true;
        return false;
      }
      return true;
    });

    // Final dedupe by id (a real message could appear in both `base`
    // and `pending` after the mutation's optimistic drop), then sort
    // by `createdAt` ASC — newest at the bottom.
    const all = [...realMessages, ...pending];
    const deduped: Message[] = [];
    const seenIds = new Set<number>();
    for (const m of all) {
      if (seenIds.has(m.id)) continue;
      seenIds.add(m.id);
      deduped.push(m);
    }
    return deduped.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }, [selectedThread, threadMessages, newMessages, optimisticMessages]);

  // ── Send message ─────────────────────────────────────────────────────────

  const sendMutation = useSendMessage();

  const handleSend = React.useCallback(
    async (body: string, files?: File[]) => {
      if (!effectiveThreadId) return;
      const trimmedBody = body.trim();
      if (!trimmedBody && (!files || files.length === 0)) return;

      // ── Optimistic update removed ────────────────────────────────────
      // We no longer inject a pending bubble on send. Reasons:
      //  - Sorting by createdAt was unreliable: client `new Date()` can
      //    sit before older real messages, pushing the optimistic ABOVE
      //    them and confusing the user.
      //  - The server response arrives in <500 ms typically; the user
      //    perceives it as instant anyway.
      //  - The mutation's `setSending(true)` below still disables the
      //    composer so the user gets clear feedback that their send is
      //    in flight.
      void effectiveThreadId;

      try {
        const realMessage = await sendMutation.mutateAsync({
          conversationId: effectiveThreadId,
          payload: { body: trimmedBody || undefined, files },
        });

        // Inject the real message straight into threadMessages. Polling
        // will dedupe via the `seenIds` check in `effectiveMessages`.
        const realDisplay = apiMessageToDisplay(realMessage, effectiveThreadId);
        setThreadMessages((prev) => {
          const next = new Map(prev);
          const list = next.get(effectiveThreadId) ?? [];
          if (!list.some((m) => m.id === realDisplay.id)) {
            next.set(effectiveThreadId, [...list, realDisplay]);
          }
          return next;
        });
        // Update the conversation list's snippet immediately so the
        // thread-list sidebar reflects the new last message without
        // waiting for the conversations refetch.
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === effectiveThreadId
              ? {
                  ...conv,
                  lastMessage: realMessage,
                  updatedAt: realMessage.sentAt,
                }
              : conv,
          ),
        );
      } catch {
        toast.error("Failed to send message.");
      } finally {
        // Make sure we never leave a stuck optimistic bubble behind
        // (e.g. if a previous code path still had one in state).
        setOptimisticMessages((prev) => {
          const next = new Map(prev);
          next.set(effectiveThreadId, []);
          return next;
        });
      }
    },
    [effectiveThreadId, sendMutation],
  );

  // ── Create conversation ───────────────────────────────────────────────────

  const createMutation = useCreateConversation();

  const handleCreateThread = React.useCallback(
    async (topic: string) => {
      if (!projectWorkingId) {
        toast.error("No active engagement found.");
        return;
      }
      try {
        const conversation = await createMutation.mutateAsync({
          projectWorkingId,
          topic: topic.trim() || undefined,
        });
        // conversation may be undefined if the API returns 201 but the response
        // body is empty or doesn't match the expected ApiSuccessResponse shape
        if (!conversation || typeof conversation.id !== "number") {
          console.error("[chat] Unexpected conversation response:", conversation);
          toast.error("Thread created but failed to open. Please refresh.");
          return;
        }
        setCreateDialogOpen(false);
        const next = new URLSearchParams();
        next.set("threadId", String(conversation.id));
        router.replace(`/projects/${projectId}/messages?${next.toString()}`);
        toast.success("Thread created.");
        await loadConversations();
      } catch (err) {
        console.error("[chat] Failed to create thread:", err);
        toast.error("Failed to create thread.");
      }
    },
    [projectWorkingId, createMutation, projectId, router, loadConversations],
  );

  // ── Delete thread ────────────────────────────────────────────────────────

  const deleteConversationMutation = useDeleteConversation(
    projectWorkingId ?? 0,
  );

  const handleDeleteThread = React.useCallback(
    (threadId: number) => {
      if (currentAccountId === null) return;
      const conv = conversations.find((c) => c.id === threadId);
      if (conv && conv.createdBy.accountId !== currentAccountId) {
        toast.error("Only the thread creator can delete it.");
        return;
      }
      deleteConversationMutation.mutate(threadId, {
        onSuccess: () => {
          if (effectiveThreadId === threadId) {
            router.replace(`/projects/${projectId}/messages`);
          }
          loadConversations();
          projectActionToast("Thread deleted.");
        },
      });
    },
    [
      currentAccountId,
      conversations,
      deleteConversationMutation,
      effectiveThreadId,
      projectId,
      router,
      loadConversations,
    ],
  );

  // ── Delete message ───────────────────────────────────────────────────────

  const deleteMessageMutation = useDeleteMessage(effectiveThreadId ?? 0);

  const handleDeleteMessage = React.useCallback(
    (messageId: number) => {
      if (currentAccountId === null) return;
      deleteMessageMutation.mutate(messageId, {
        onSuccess: () => {
          if (effectiveThreadId) loadMessages(effectiveThreadId);
        },
      });
    },
    [currentAccountId, deleteMessageMutation, effectiveThreadId, loadMessages],
  );

  // ── Build thread with messages ───────────────────────────────────────────

  const activeThread: MessageThread | null = React.useMemo(() => {
    if (!selectedThread) return null;

    // Derive "members" from distinct message authors. We do not surface
    // a presence status (online/last-seen) because the chat uses HTTP
    // polling — there is no realtime presence channel to pull from, and
    // faking a green dot would be misleading. The list shows everyone
    // who has actually participated in this thread.
    const memberMap = new Map<number, MessageAuthor>();
    for (const message of effectiveMessages) {
      const author = message.author;
      if (!memberMap.has(author.id)) {
        memberMap.set(author.id, author);
      }
    }
    // Fall back to the original room members if for some reason the
    // message log is empty (brand-new thread before first send).
    const derivedMembers =
      memberMap.size > 0
        ? Array.from(memberMap.values())
        : selectedThread.members;

    return {
      ...selectedThread,
      messages: effectiveMessages,
      members: derivedMembers,
    };
  }, [selectedThread, effectiveMessages]);

  // ── URL helpers ──────────────────────────────────────────────────────────

  const basePath = `/projects/${projectId}/messages`;
  const hrefFor = React.useCallback(
    (thread: MessageThread): string => {
      const next = new URLSearchParams();
      next.set("threadId", String(thread.id));
      return `${basePath}?${next.toString()}`;
    },
    [basePath],
  );

  // ── Create thread dialog ──────────────────────────────────────────────────

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  const handleOpenCreateDialog = () => {
    if (!projectWorkingId) {
      toast.error("No active engagement found.");
      return;
    }
    setCreateDialogOpen(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <CreateThreadDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onConfirm={handleCreateThread}
        isPending={createMutation.isPending}
      />

      <div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <ThreadList
            threads={threads}
            selectedId={effectiveThreadId}
            hrefFor={hrefFor}
            onCreate={handleOpenCreateDialog}
            isLoading={conversationsLoading}
          />
        </div>

        <ThreadDetail
          thread={activeThread}
          onOpenInfo={() => projectActionToast(t("infoComingSoon"))}
          onSend={handleSend}
          onDeleteMessage={handleDeleteMessage}
          currentAccountId={currentAccountId}
          isSending={sendMutation.isPending}
        />

        <ThreadContextRail thread={activeThread} />
      </div>
    </>
  );
}
