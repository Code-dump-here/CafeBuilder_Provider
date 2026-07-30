"use client";

import * as React from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { ChevronDown, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OwnerAvatar } from "@/components/data-table";
import { cn } from "@/lib/utils";

import type { MessageThread } from "@/lib/projects/messages-types";

interface ThreadListProps {
  threads: MessageThread[];
  selectedId: number | null;
  /**
   * Build the href for a thread row. Pages pass `({id}) =>
   * `/projects/${projectId}/messages?threadId=${id}`` so the
   * address bar reflects the active thread and back/forward
   * works without bespoke routing.
   */
  hrefFor: (thread: MessageThread) => string;
  onCreate: () => void;
  /** Show a loading skeleton state in the list area. */
  isLoading?: boolean;
}

type FilterTab = "all" | "direct" | "rooms";

/**
 * Left rail of the messages page. Renders:
 *   - "New message" CTA pinned at the top
 *   - search field that filters by title / snippet / participant name
 *   - tab strip (All / Direct / Rooms) for coarse filtering
 *   - thread rows as `<Link>` elements — clicking navigates to the
 *     thread URL the page builds (typically a `?threadId=` query param
 *     under `/projects/{id}/messages`)
 *
 * The list is intentionally scrollable independently of the page —
 * long thread histories shouldn't push the action bar off-screen.
 */
export function ThreadList({
  threads,
  selectedId,
  hrefFor,
  onCreate,
  isLoading,
}: ThreadListProps) {
  const t = useTranslations("Messages");
  const format = useFormatter();

  const [tab, setTab] = React.useState<FilterTab>("all");
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads
      .filter((thread) => {
        if (tab === "direct" && !participantsDirect(thread)) return false;
        if (tab === "rooms" && !thread.isRoom) return false;
        if (!q) return true;
        return (
          thread.title.toLowerCase().includes(q) ||
          thread.snippet.toLowerCase().includes(q) ||
          thread.participants.some((p) =>
            p.fullName.toLowerCase().includes(q),
          )
        );
      })
      // Pinned threads rise to the top; otherwise newest activity
      // first — matches the user's mental ordering from email / chat.
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.lastActivityAt.getTime() - a.lastActivityAt.getTime();
      });
  }, [threads, tab, search]);

  return (
    <nav
      aria-label={t("list.label")}
      className="flex h-full flex-col overflow-hidden bg-card"
    >
      <header className="flex flex-col gap-2 border-b border-border/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("list.heading")}
            </p>
            <h2 className="text-sm font-semibold text-foreground">
              {t("list.title")}
            </h2>
          </div>
          <Button
            size="sm"
            onClick={onCreate}
            aria-label={t("list.newMessage")}
            className="font-semibold"
          >
            <Plus aria-hidden />
            {t("list.newMessage")}
          </Button>
        </div>

        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("list.searchPlaceholder")}
            aria-label={t("list.searchPlaceholder")}
            className="h-8 pl-7 text-xs"
          />
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as FilterTab)}
          className="w-full"
        >
          <TabsList
            variant="line"
            className="h-7 w-full justify-start gap-1 border-b border-border/60"
          >
            <TabsTrigger
              value="all"
              className="data-[state=active]:text-foreground"
            >
              {t("list.tabs.all")}
            </TabsTrigger>
            <TabsTrigger
              value="direct"
              className="data-[state=active]:text-foreground"
            >
              {t("list.tabs.direct")}
            </TabsTrigger>
            <TabsTrigger
              value="rooms"
              className="data-[state=active]:text-foreground"
            >
              {t("list.tabs.rooms")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {isLoading ? (
        <div className="flex flex-1 flex-col gap-0.5 p-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-start gap-2.5 rounded-lg px-2.5 py-2"
            >
              <div className="size-7 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="h-2 w-full rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted-foreground">
          {t("list.empty")}
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <ul className="flex flex-col gap-0.5 p-2">
            {filtered.map((thread) => (
              <li key={thread.id}>
                <ThreadRow
                  thread={thread}
                  href={hrefFor(thread)}
                  selected={selectedId === thread.id}
                  relativeTime={format.relativeTime(thread.lastActivityAt, new Date())}
                />
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </nav>
  );
}

function participantsDirect(thread: MessageThread) {
  // "Direct" in the tab filter means 1:1 — i.e. rooms and channels
  // are excluded. Track kind explicitly so adding CHANNEL doesn't
  // silently fall in.
  return thread.kind === "DIRECT";
}

interface ThreadRowProps {
  thread: MessageThread;
  href: string;
  selected: boolean;
  relativeTime: string;
}

function ThreadRow({
  thread,
  href,
  selected,
  relativeTime,
}: ThreadRowProps) {
  const t = useTranslations("Messages");
  // Up to 2 chips + overflow. Slack / iMessage pattern: always leave
  // headroom for the `+N` badge so we don't render 3 chips and then
  // have to squeeze an extra bubble in.
  const MAX_VISIBLE = 2;
  const totalCount = thread.participants.length + thread.overflowParticipants;
  const visible = thread.participants.slice(0, MAX_VISIBLE);
  const overflowCount = Math.max(totalCount - MAX_VISIBLE, 0);

  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      data-selected={selected ? "true" : undefined}
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors",
        "hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        selected && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-start gap-2.5">
        <ParticipantStack
          participants={visible}
          overflowCount={overflowCount}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "line-clamp-1 flex-1 text-xs font-semibold",
                thread.unreadCount > 0 ? "text-foreground" : "text-foreground/80",
              )}
            >
              {thread.title}
            </span>
            <span
              className={cn(
                "shrink-0 text-[10px] font-medium uppercase tracking-wider",
                thread.unreadCount > 0
                  ? "font-semibold text-primary"
                  : "text-muted-foreground",
              )}
            >
              {relativeTime}
            </span>
          </div>
          <p
            className={cn(
              "line-clamp-1 text-[11px] wrap-break-word",
              thread.unreadCount > 0
                ? "font-semibold text-foreground/90"
                : "text-muted-foreground",
            )}
          >
            {thread.snippet}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            {thread.channelLabel ? (
              <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                {thread.channelLabel}
              </span>
            ) : (
              <span aria-hidden />
            )}
            <div className="flex items-center gap-1.5">
              {thread.pinned ? (
                <span
                  title={t("list.pinned")}
                  className="inline-flex items-center text-[10px] font-medium text-amber-600 dark:text-amber-300"
                >
                  <ChevronDown aria-hidden className="size-2.5 -rotate-90" />
                  <span className="sr-only">{t("list.pinned")}</span>
                </span>
              ) : null}
              {thread.unreadCount > 0 ? (
                <span
                  aria-label={t("list.unreadBadge", {
                    count: thread.unreadCount,
                  })}
                  className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground"
                >
                  {thread.unreadCount}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

interface ParticipantStackProps {
  participants: { fullName: string; avatarColor: string | null }[];
  overflowCount: number;
}

/**
 * Compact avatar group for a thread row. Layout:
 *
 *   ┌──────────────────────────────────────┐
 *   │  ╭─╮  ╭─╮                            │
 *   │  │HM│ │PA│                            │
 *   │  ╰─╯  ╰─╯                            │
 *   └──────────────────────────────────────┘
 *
 * Implementation notes:
 *
 *   - Up to 2 visible chips. If there are more participants the
 *     second chip is replaced by a `+N` overflow badge — Slack /
 *     iMessage pattern. This keeps the rail visually quiet and
 *     keeps room for the badge even when there are many
 *     participants.
 *   - `flex` + `mr-n` (negative margin) overlap with
 *     `shadow-[0_0_0_2px_var(--card)]` to draw a clean gap between
 *     chips.
 *   - Fixed shell width so single- and multi-participant rows keep
 *     the title column aligned.
 */
function ParticipantStack({
  participants,
  overflowCount,
}: ParticipantStackProps) {
  const chips: React.ReactNode[] = [];

  if (participants.length === 0) {
    return <div aria-hidden className="size-7 shrink-0" />;
  }

  // First chip — always an avatar.
  chips.push(
    <AvatarChip
      key={participants[0].fullName}
      name={participants[0].fullName}
      color={participants[0].avatarColor}
      isFirst
    />,
  );

  // Second slot: avatar when ≤ 2 participants, otherwise the
  // overflow badge so the rail never grows wider than `MAX_VISIBLE`.
  if (participants.length >= 2 && overflowCount === 0) {
    const second = participants[1];
    chips.push(
      <AvatarChip
        key={second.fullName}
        name={second.fullName}
        color={second.avatarColor}
      />,
    );
  } else if (overflowCount > 0) {
    chips.push(
      <span
        key="overflow"
        aria-label={`${overflowCount} more`}
        className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground shadow-[0_0_0_2px_var(--card)] -ml-2"
      >
        +{overflowCount}
      </span>,
    );
  } else {
    // Single-participant row: reserve the second slot so the title
    // column aligns with the rest of the list.
    chips.push(<OverflowPlaceholder key="placeholder" />);
  }

  return (
    <div
      className="flex items-center"
      // 2 chips 28px + 8px overlap = 48px. Locked so titles align.
      style={{ width: 48, height: 28 }}
    >
      {chips}
    </div>
  );
}

function AvatarChip({
  name,
  color,
  isFirst = false,
}: {
  name: string;
  color: string | null;
  isFirst?: boolean;
}) {
  return (
    <OwnerAvatar
      name={name}
      color={color}
      size="sm"
      className={cn(
        "size-7 text-[10px]",
        "shadow-[0_0_0_2px_var(--card)]",
        // overlap each chip on the previous one; skip the first
        !isFirst && "-ml-2",
      )}
    />
  );
}

function OverflowPlaceholder() {
  return (
    <span
      aria-hidden
      className="-ml-2 inline-block size-7 rounded-full border border-dashed border-border/50 bg-transparent"
    />
  );
}