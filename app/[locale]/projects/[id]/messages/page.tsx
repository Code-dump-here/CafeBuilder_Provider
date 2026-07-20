"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { ThreadContextRail } from "@/components/messages/thread-context-rail";
import { ThreadDetail } from "@/components/messages/thread-detail";
import { ThreadList } from "@/components/messages/thread-list";
import { projectActionToast } from "@/components/project-overview/project-action-toast";
import { useMessageThreads } from "@/lib/projects/use-message-threads";

/**
 * Three-column messaging page mirroring the design mock:
 *
 *   ┌──────────┬─────────────────────────┬───────────┐
 *   │ Threads  │       Conversation      │  Context  │
 *   │  list    │       (header + body)   │   rail    │
 *   └──────────┴─────────────────────────┴───────────┘
 *
 * Routing:
 *   - URL is `/projects/{id}/messages` (matches the sidebar
 *     "Messages" item — `scope: "project"` resolves to this suffix).
 *   - Active thread is encoded in the `?threadId=` query param so
 *     users can bookmark / share / back-navigate to a specific
 *     conversation. Falls back to "first unread → first pinned →
 *     first room" when the param is absent or stale.
 */
export default function MessagesPage() {
  const params = useParams<{ id: string; locale?: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = params?.id ?? "";
  const threads = useMessageThreads(projectIdParam);
  const t = useTranslations("Messages");

  // `threadId` from the URL. Keep the raw string around so we can
  // decide whether to *redirect* (canonical URL) or just *render*.
  const rawThreadId = searchParams?.get("threadId") ?? null;
  const numericThreadId = rawThreadId ? Number.parseInt(rawThreadId, 10) : NaN;
  const isThreadIdValid =
    rawThreadId !== null &&
    !Number.isNaN(numericThreadId) &&
    threads.some((thread) => thread.id === numericThreadId);

  // Pick the fallback (first unread → first pinned → first thread).
  const fallbackId = React.useMemo(() => {
    const unread = threads.find((th) => th.unreadCount > 0);
    if (unread) return unread.id;
    const pinned = threads.find((th) => th.pinned);
    if (pinned) return pinned.id;
    return threads[0]?.id ?? null;
  }, [threads]);

  const effectiveThreadId =
    (isThreadIdValid ? numericThreadId : null) ?? fallbackId;

  // Canonicalise the URL whenever we land without `?threadId=` (or
  // with an invalid one). Only do this once the thread list is
  // hydrated so we don't bounce on the first render.
  React.useEffect(() => {
    if (effectiveThreadId == null) return;
    if (rawThreadId !== null && isThreadIdValid) return;
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    next.set("threadId", String(effectiveThreadId));
    router.replace(
      `/projects/${projectIdParam}/messages?${next.toString()}`,
      { scroll: false },
    );
  }, [
    effectiveThreadId,
    isThreadIdValid,
    projectIdParam,
    rawThreadId,
    router,
    searchParams,
  ]);

  const selectedThread = React.useMemo(
    () =>
      threads.find((thread) => thread.id === effectiveThreadId) ?? null,
    [threads, effectiveThreadId],
  );

  const basePath = `/projects/${projectIdParam}/messages`;

  const hrefFor = React.useCallback(
    (threadId: number): string => {
      const next = new URLSearchParams();
      next.set("threadId", String(threadId));
      return `${basePath}?${next.toString()}`;
    },
    [basePath],
  );

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <ThreadList
          threads={threads}
          selectedId={effectiveThreadId}
          hrefFor={(thread) => hrefFor(thread.id)}
          onCreate={() => projectActionToast(t("createComingSoon"))}
        />
      </div>

      <ThreadDetail
        thread={selectedThread}
        onOpenInfo={() => projectActionToast(t("infoComingSoon"))}
      />

      <ThreadContextRail thread={selectedThread} />
    </div>
  );
}
