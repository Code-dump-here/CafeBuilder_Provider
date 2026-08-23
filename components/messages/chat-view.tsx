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
import { useQueryClient } from "@tanstack/react-query";
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

import type {
  ConversationListResponse,
  ConversationSummary,
  MessageResponse,
} from "@/features/chat";

import {
  apiConversationToThread,
  apiMessageToDisplay,
  useChatPolling,
  useConversation,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useDeleteMessage,
  useSendMessage,
} from "@/features/chat";

import { queryKeys } from "@/lib/react-query/keys";

interface ChatViewProps {
  /** Rendered inside the project layout — `id` is the projectShopOwner id. */
  projectId: string;
}

/**
 * Paging for the conversation list. Module-scope so the object identity is
 * stable — it feeds both the query key and the cache patcher's dependencies.
 */
const CONVERSATIONS_PAGE = { pageNumber: 1, pageSize: 100 } as const;

/** Same, for a single thread's message page. Must match `useConversation`'s
 *  defaults so the query key lines up with what its mutations invalidate. */
const CONVERSATION_PAGE = { pageNumber: 1, pageSize: 50 } as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatView({ projectId }: ChatViewProps) {
  const t = useTranslations("Messages");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { project } = useProjectDetail(projectId);
  const { account } = useCurrentUser();
  const queryClient = useQueryClient();

  // Current user's account id — used for ownership checks
  const currentAccountId = account?.id ?? null;

  // Narrowed to a primitive up front, same as `currentAccountId` above. The
  // memo below used to depend on the `account?.serviceProvider` OBJECT and then
  // dereference it with a non-null assertion inside the callback. That reads
  // `account` while declaring a narrower dependency, which the React Compiler
  // can't reconcile — it bailed out of the whole component rather than trust
  // the hand-written memo. A number also can't change identity on an
  // `/api/auth/me` refetch the way the profile object can.
  const serviceProviderId = account?.serviceProvider?.id ?? null;

  // projectWorkingId: find the engagement whose providerId matches the current
  // user's serviceProviderProfile.id on THIS project.
  const projectWorkingId = React.useMemo(() => {
    if (serviceProviderId === null) return null;
    const provider = project.providers.find(
      (p) => p.providerId === serviceProviderId,
    );
    return provider?.projectWorkingId ?? null;
  }, [project.providers, serviceProviderId]);

  // ── Conversation list ─────────────────────────────────────────────────────

  // `useConversations` already existed in `features/chat/hooks.ts` and was
  // unused; this component hand-rolled the same fetch with useState + useEffect,
  // which is what produced the cascading-render warning (the loader flag was set
  // synchronously inside the effect). React Query also gives us caching and
  // request cancellation the manual version didn't have.
  const conversationsQuery = useConversations({
    projectWorkingId,
    ...CONVERSATIONS_PAGE,
  });

  // The list endpoint returns summaries, not full details — `ConversationSummary`
  // is what the cache holds, so the patcher below stays assignable to it.
  const conversations: ConversationSummary[] = React.useMemo(
    () => conversationsQuery.data?.items ?? [],
    [conversationsQuery.data],
  );
  const conversationsLoading = conversationsQuery.isLoading;
  const refetchConversations = conversationsQuery.refetch;

  // Patch the cached list in place — used to move a thread's snippet forward
  // when a message arrives, without waiting for a refetch.
  const patchConversations = React.useCallback(
    (update: (prev: ConversationSummary[]) => ConversationSummary[]) => {
      queryClient.setQueryData<ConversationListResponse>(
        queryKeys.chat.conversations(
          projectWorkingId ?? "",
          CONVERSATIONS_PAGE.pageNumber,
          CONVERSATIONS_PAGE.pageSize,
        ),
        (prev) =>
          prev ? { ...prev, items: update(prev.items) } : prev,
      );
    },
    [queryClient, projectWorkingId],
  );

  // ── Thread ↔ Conversation bridge ─────────────────────────────────────────

  // The existing UI expects `MessageThread[]`. We build them from conversations.
  // messages + attachments are populated lazily when a thread is opened.
  //
  // Derived, not stored: this used to be state written from an effect, which
  // rendered once with the previous thread list before the effect caught up.
  // Nothing else ever set it, so a memo is equivalent and one render shorter.
  const threads = React.useMemo<MessageThread[]>(
    () =>
      conversations.map((conv) =>
        apiConversationToThread(conv, projectId || ""),
      ),
    [conversations, projectId],
  );

  // ── Active thread selection ───────────────────────────────────────────────

  // The query string already carries the thread's uuid, so it is used as-is.
  // It used to be parsed to a number, which is why this needed a validity
  // check for NaN.
  const rawThreadId = searchParams?.get("threadId") ?? null;
  const isThreadIdValid =
    rawThreadId !== null && threads.some((thread) => thread.id === rawThreadId);

  const fallbackId = React.useMemo(() => {
    const unread = threads.find((th) => th.unreadCount > 0);
    if (unread) return unread.id;
    const pinned = threads.find((th) => th.pinned);
    if (pinned) return pinned.id;
    return threads[0]?.id ?? null;
  }, [threads]);

  const effectiveThreadId =
    (isThreadIdValid ? rawThreadId : null) ?? fallbackId;

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

  // Messages for the active thread. `useConversation` is the sibling of
  // `useConversations` — also already present and also unused, while this
  // component reimplemented it as a `Map<threadId, Message[]>` kept warm by a
  // fetch-on-miss effect. React Query caches per conversation id, so the map
  // and the effect were duplicating it by hand; the effect was the second
  // cascading-render warning.
  const conversationQuery = useConversation({
    conversationId: effectiveThreadId,
    ...CONVERSATION_PAGE,
  });

  const refetchConversation = conversationQuery.refetch;

  const baseMessages = React.useMemo<Message[]>(() => {
    if (effectiveThreadId == null) return [];
    const detail = conversationQuery.data;
    if (!detail) return [];
    return detail.messages.map((msg: MessageResponse) =>
      apiMessageToDisplay(msg, effectiveThreadId),
    );
  }, [conversationQuery.data, effectiveThreadId]);

  // ── Polling ───────────────────────────────────────────────────────────────

  // Cursor for the first poll after a thread switch. `useChatPolling` reads this
  // only when `conversationId` changes and owns the cursor afterwards, so it
  // wants "newest message already loaded", not "newest message known" — which
  // is why deriving from the cache rather than from polled results is correct
  // (and why there's no feedback loop with `newMessages`).
  const initialSinceId = baseMessages.at(-1)?.id ?? null;

  const { newMessages } = useChatPolling({
    conversationId: effectiveThreadId,
    initialSinceId: initialSinceId ?? undefined,
    intervalMs: 3000,
    onMessages: (msgs) => {
      if (!effectiveThreadId) return;
      if (msgs.length > 0) {
        const latest = msgs[msgs.length - 1];
        patchConversations((prev) =>
          prev.map((conv) =>
            conv.id === effectiveThreadId
              ? { ...conv, lastMessage: latest, updatedAt: latest.sentAt }
              : conv,
          ),
        );
      }
    },
  });

  // Effective messages: merge the loaded page with anything polling has pulled
  // in since, dedupe by id, and sort by `createdAt` ASC so the newest message
  // is always at the BOTTOM of the list (matches chat convention and keeps
  // auto-scroll behaviour predictable).
  //
  // There is no optimistic layer to reconcile. Optimistic sending was built and
  // then deliberately removed (see `handleSend`) because a client-side
  // `new Date()` could sort a pending bubble above older real messages. The
  // fingerprint-matching that used to drop superseded bubbles lived here and
  // has gone with it — `optimisticMessages` was only ever written as an empty
  // map, so the branch had been unreachable rather than merely unused.
  const effectiveMessages: Message[] = React.useMemo(() => {
    if (!selectedThread) return [];
    const baseIds = new Set(baseMessages.map((m) => m.id));
    const newOnes = newMessages
      .map((msg) => apiMessageToDisplay(msg, selectedThread.id))
      .filter((m) => !baseIds.has(m.id));

    // `baseMessages` can already contain a message polling also returned: a send
    // invalidates the conversation query, so a refetch and a poll tick can both
    // deliver it. The id dedupe still earns its keep.
    const deduped: Message[] = [];
    const seenIds = new Set<string>();
    for (const m of [...baseMessages, ...newOnes]) {
      if (seenIds.has(m.id)) continue;
      seenIds.add(m.id);
      deduped.push(m);
    }
    return deduped.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }, [selectedThread, baseMessages, newMessages]);

  // ── Send message ─────────────────────────────────────────────────────────

  const sendMutation = useSendMessage();

  const handleSend = React.useCallback(
    async (body: string, files?: File[]) => {
      if (!effectiveThreadId) return;
      const trimmedBody = body.trim();
      if (!trimmedBody && (!files || files.length === 0)) return;

      // No optimistic bubble on send, deliberately:
      //  - Sorting by createdAt was unreliable: client `new Date()` can
      //    sit before older real messages, pushing the optimistic ABOVE
      //    them and confusing the user.
      //  - The server response arrives in <500 ms typically; the user
      //    perceives it as instant anyway.
      //  - `sendMutation.isPending` still disables the composer, so the
      //    user gets clear feedback that their send is in flight.
      try {
        // No manual cache writes here: `useSendMessage` already invalidates
        // both ["chat","conversation",id] and ["chat","conversations"] on
        // success, so the thread and its sidebar snippet refetch themselves.
        // Hand-patching them as well is what the old `threadMessages` map and
        // the snippet patch were doing, and it drifted from the server.
        await sendMutation.mutateAsync({
          conversationId: effectiveThreadId,
          payload: { body: trimmedBody || undefined, files },
        });
      } catch {
        toast.error("Failed to send message.");
      }
    },
    [effectiveThreadId, sendMutation],
  );

  // ── Create conversation ───────────────────────────────────────────────────

  // Declared here, not next to the dialog markup further down: `handleCreateThread`
  // closes the dialog on success, and a `const` referenced ~130 lines above its
  // declaration is a temporal-dead-zone hazard. It only worked because the
  // callback never runs during the first render.
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

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
        if (!conversation || typeof conversation.id !== "string") {
          console.error("[chat] Unexpected conversation response:", conversation);
          toast.error("Thread created but failed to open. Please refresh.");
          return;
        }
        setCreateDialogOpen(false);
        const next = new URLSearchParams();
        next.set("threadId", String(conversation.id));
        router.replace(`/projects/${projectId}/messages?${next.toString()}`);
        toast.success("Thread created.");
        await refetchConversations();
      } catch (err) {
        console.error("[chat] Failed to create thread:", err);
        toast.error("Failed to create thread.");
      }
    },
    [projectWorkingId, createMutation, projectId, router, refetchConversations],
  );

  // ── Delete thread ────────────────────────────────────────────────────────

  const deleteConversationMutation = useDeleteConversation(
    projectWorkingId ?? "",
  );

  const handleDeleteThread = React.useCallback(
    (threadId: string) => {
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
          refetchConversations();
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
      refetchConversations,
    ],
  );

  // ── Delete message ───────────────────────────────────────────────────────

  const deleteMessageMutation = useDeleteMessage(effectiveThreadId ?? "");

  const handleDeleteMessage = React.useCallback(
    (messageId: string) => {
      if (currentAccountId === null) return;
      deleteMessageMutation.mutate(messageId, {
        onSuccess: () => {
          // Re-read the thread so the deleted message disappears. Polling only
          // ever appends (it fetches `sinceId` forward), so it can't notice a
          // removal on its own.
          void refetchConversation();
        },
      });
    },
    [currentAccountId, deleteMessageMutation, refetchConversation],
  );

  // ── Build thread with messages ───────────────────────────────────────────

  const activeThread: MessageThread | null = React.useMemo(() => {
    if (!selectedThread) return null;

    // Derive "members" from distinct message authors. We do not surface
    // a presence status (online/last-seen) because the chat uses HTTP
    // polling — there is no realtime presence channel to pull from, and
    // faking a green dot would be misleading. The list shows everyone
    // who has actually participated in this thread.
    const memberMap = new Map<string, MessageAuthor>();
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
