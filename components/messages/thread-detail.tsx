"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import {
  Info,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Trash2,
  Video,
} from "lucide-react";

import { Avatar, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OwnerAvatar } from "@/components/data-table";
import { cn } from "@/lib/utils";
import { useResetOnChange } from "@/hooks/use-reset-on-change";

import type {
  Message,
  MessageAttachment,
  MessageThread,
} from "@/features/projects/messages-types";

interface ThreadDetailProps {
  thread: MessageThread | null;
  onOpenInfo: () => void;
  /** Called when the user submits the composer form. */
  onSend?: (body: string, files?: File[]) => Promise<void>;
  /** Called when the user clicks delete on a message. */
  onDeleteMessage?: (messageId: number) => void;
  /** The current user's account id — used to show delete affordances. */
  currentAccountId?: number | null;
  /** Disable the composer while a send is in flight (no optimistic bubble). */
  isSending?: boolean;
}

const ROLE_BY_AUTHOR: Record<number, string> = {
  7: "Lead Designer",
  8: "Junior Designer",
  12: "Owner",
  21: "General Contractor",
  33: "MEP Engineer",
  41: "Procurement",
};

/**
 * Center column of the messages page. Renders:
 *   - thread header (title, role, action row)
 *   - vertical timeline grouped by date, then by author "burst"
 *   - per-message bubble (header only on burst start)
 *   - typing indicator using the most recent `pending` message
 *   - composer pinned at the bottom
 */
export function ThreadDetail({ thread, onOpenInfo, onSend, onDeleteMessage, currentAccountId, isSending }: ThreadDetailProps) {
  const t = useTranslations("Messages");
  const format = useFormatter();
  const [draft, setDraft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const endRef = React.useRef<HTMLDivElement | null>(null);
  const viewportRef = React.useRef<HTMLDivElement | null>(null);

  // Reset composer state when switching threads — otherwise the
  // pending draft + reply target leak between contexts.
  useResetOnChange(thread?.id, () => {
    setDraft("");
  });

  // Auto-scroll to bottom whenever the message log grows.
  // We pin to the bottom on every message change (incl. optimistic ones)
  // and also force-scroll on initial mount / thread switch via `instant`.
  // Using `scrollTop = scrollHeight` instead of `scrollIntoView` because
  // the latter is a no-op when the target element is already inside the
  // viewport, which caused the "message stuck on top until F5" bug.
  const lastMessageId = thread?.messages.at(-1)?.id;
  const messageCount = thread?.messages.length ?? 0;
  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    // Defer to the next frame so the browser has finished laying out the
    // newly appended bubble (and recomputed scrollHeight). Without this
    // rAF, scrollTop is set to the OLD scrollHeight and the new bubble
    // stays below the viewport — the user sees the old tail and the new
    // message effectively "hidden off-screen" until F5 re-measures.
    const raf = requestAnimationFrame(() => {
      // Double-RAF: ensures layout has committed after the first paint
      // with the new DOM nodes.
      requestAnimationFrame(() => {
        if (viewportRef.current) {
          viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
        }
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [messageCount, lastMessageId, thread?.id]);

  if (!thread) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        <MessageSquare aria-hidden className="mr-2 inline size-4" />
        {t("detail.empty")}
      </div>
    );
  }

  const groups = groupByDate(thread.messages);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;
    if (onSend) {
      await onSend(draft);
    }
    setDraft("");
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
      <ThreadHeader thread={thread} onOpenInfo={onOpenInfo} />

      <ScrollAreaPrimitive.Root
        className="flex-1 overflow-hidden bg-stone-50 dark:bg-stone-950/40"
      >
        <ScrollAreaPrimitive.Viewport
          ref={viewportRef}
          className="size-full"
        >
          <div ref={scrollRef} className="flex flex-col gap-3 px-4 pt-4 pb-3">
            {thread.messages.length === 0 ? (
              <p className="mx-auto mt-12 text-center text-xs text-muted-foreground">
                {t("detail.noMessages")}
              </p>
            ) : null}

            {groups.map(({ dateKey, bursts }) => {
              const dateLabel = format.dateTime(new Date(dateKey), {
                weekday: "long",
                month: "long",
                day: "numeric",
              });
              return (
                <section
                  key={dateKey}
                  aria-label={dateLabel}
                  className="flex flex-col gap-2"
                >
                  <DateSeparator label={dateLabel} />
                  {bursts.map((burst) => (
                    <MessageBurst
                      key={burst.first.id}
                      burst={burst}
                      roleLabel={t(`roles.${roleKey(burst.first.author.id)}`, {
                        defaultValue: ROLE_BY_AUTHOR[burst.first.author.id],
                      })}
                      currentAccountId={currentAccountId}
                      onDeleteMessage={onDeleteMessage}
                    />
                  ))}
                </section>
              );
            })}

            <TypingIndicator
              name={
                thread.messages.at(-1)?.pending
                  ? (thread.messages.at(-1)?.author.fullName ?? "")
                  : ""
              }
            />

            <div ref={endRef} aria-hidden />
          </div>
        </ScrollAreaPrimitive.Viewport>
        <ScrollAreaPrimitive.Scrollbar
          orientation="vertical"
          className="flex touch-none p-px transition-colors select-none h-full w-2.5 border-l border-l-transparent"
        >
          <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
        </ScrollAreaPrimitive.Scrollbar>
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>

      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
        placeholder={t("detail.composerPlaceholder", {
          name: thread.title,
        })}
        sendLabel={t("detail.send")}
        disabled={isSending}
      />
    </article>
  );
}

// ---------------------------------------------------------------------------
// Header

function ThreadHeader({
  thread,
  onOpenInfo,
}: {
  thread: MessageThread;
  onOpenInfo: () => void;
}) {
  const t = useTranslations("Messages");
  const format = useFormatter();

  const lastAuthor = thread.messages.at(-1)?.author ?? thread.participants[0];
  const lastActivityLabel = format.dateTime(thread.lastActivityAt, {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <AvatarGroup>
          {thread.participants.slice(0, 3).map((p) => (
            <ParticipantAvatar key={p.id} name={p.fullName} color={p.avatarColor} />
          ))}
          {thread.participants.length > 3 ? (
            <AvatarGroupCount>
              +{thread.participants.length - 3}
            </AvatarGroupCount>
          ) : null}
        </AvatarGroup>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-foreground">
            {thread.title}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            <span
              aria-hidden
              className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500 align-middle"
            />
            {t("detail.lastActive", {
              author: lastAuthor.fullName,
              date: lastActivityLabel,
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button size="icon-sm" variant="ghost" aria-label={t("header.phone")}>
          <Phone aria-hidden />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label={t("header.video")}>
          <Video aria-hidden />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label={t("header.search")}>
          <Search aria-hidden />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onOpenInfo}
          aria-label={t("header.info")}
        >
          <Info aria-hidden />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label={t("header.more")}>
          <MoreHorizontal aria-hidden />
        </Button>
      </div>
    </header>
  );
}

function ParticipantAvatar({
  name,
  color,
}: {
  name: string;
  color: string | null;
}) {
  return (
    <Avatar size="default" className="size-7 border-2 border-card">
      <OwnerAvatar
        name={name}
        color={color}
        size="default"
        className="size-7 text-xs"
      />
    </Avatar>
  );
}

// ---------------------------------------------------------------------------
// Date separator

function DateSeparator({ label }: { label: string }) {
  return (
    <div
      role="separator"
      className="my-2 flex items-center justify-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
    >
      <span aria-hidden className="h-px flex-1 bg-border/60" />
      <span>{label}</span>
      <span aria-hidden className="h-px flex-1 bg-border/60" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Burst / bubbles

interface Burst {
  author: Message["author"];
  first: Message;
  rest: Message[];
}

function MessageBurst({
  burst,
  roleLabel,
  currentAccountId,
  onDeleteMessage,
}: {
  burst: Burst;
  roleLabel: string;
  currentAccountId?: number | null;
  onDeleteMessage?: (messageId: number) => void;
}) {
  const t = useTranslations("Messages");
  const format = useFormatter();
  const firstAt = format.dateTime(burst.first.createdAt, {
    hour: "numeric",
    minute: "2-digit",
  });

  const isMine =
    currentAccountId != null && burst.author.id === currentAccountId;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5",
        isMine && "flex-row-reverse",
      )}
    >
      {isMine ? (
        <div aria-hidden className="size-8 shrink-0" />
      ) : (
        <OwnerAvatar
          name={burst.author.fullName}
          color={burst.author.avatarColor}
          size="default"
          className="size-8 text-xs"
        />
      )}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-1",
          isMine && "items-end",
        )}
      >
        {!isMine ? (
          <header className="flex flex-wrap items-baseline gap-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">
              {burst.author.fullName}
            </span>
            <span>{roleLabel}</span>
            <span aria-hidden>·</span>
            <span>{firstAt}</span>
          </header>
        ) : (
          <header className="flex flex-wrap items-baseline justify-end gap-2 text-[11px] text-muted-foreground">
            <span aria-hidden>·</span>
            <span>{firstAt}</span>
          </header>
        )}
        {[burst.first, ...burst.rest].map((message) => (
          <article
            key={message.id}
            className={cn(
              "group relative flex flex-col gap-1.5",
              isMine && "items-end",
            )}
          >
            <Bubble
              body={message.body}
              isMine={isMine}
              pending={message.pending}
              canDelete={isMine}
              onDelete={onDeleteMessage ? () => onDeleteMessage(message.id) : undefined}
            />
            {message.attachments.length > 0 ? (
              <ul
                className={cn(
                  "flex flex-wrap gap-1.5 pl-1",
                  isMine && "justify-end pl-0 pr-1",
                )}
              >
                {message.attachments.map((attachment) => (
                  <AttachmentChip
                    key={attachment.id}
                    attachment={attachment}
                  />
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function Bubble({
  body,
  isMine,
  canDelete,
  onDelete,
  pending,
}: {
  body: string;
  isMine?: boolean;
  canDelete?: boolean;
  onDelete?: () => void;
  pending?: boolean;
}) {
  return (
    <div
      className={cn(
        "max-w-prose rounded-2xl px-3 py-2 text-sm shadow-xs ring-1",
        "wrap-break-word",
        isMine
          ? "rounded-tr-sm bg-blue-600 text-white ring-blue-600 dark:bg-blue-500 dark:ring-blue-500"
          : "rounded-tl-sm bg-card text-foreground ring-border/40",
        canDelete && "group-hover:ring-destructive/40",
        pending && "opacity-70",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span>{body}</span>
        {canDelete && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete message"
            className={cn(
              "mt-0.5 shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100",
              isMine
                ? "text-white/70 hover:text-white"
                : "text-muted-foreground hover:text-destructive",
            )}
          >
            <Trash2 aria-hidden className="size-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}

function AttachmentChip({ attachment }: { attachment: MessageAttachment }) {
  return (
    <li>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
      >
        <Paperclip aria-hidden className="size-3 text-muted-foreground" />
        <span className="max-w-[20ch] truncate">{attachment.title}</span>
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator

function TypingIndicator({ name }: { name: string }) {
  const t = useTranslations("Messages");
  if (!name) return null;
  return (
    <div
      aria-live="polite"
      className="flex items-center gap-2 px-2 text-[11px] text-muted-foreground"
    >
      <span className="inline-flex items-center gap-0.5 rounded-full bg-card px-2 py-1 ring-1 ring-border/40">
        <Dot className="size-1.5 animate-pulse" />
        <Dot className="size-1.5 animate-pulse [animation-delay:120ms]" />
        <Dot className="size-1.5 animate-pulse [animation-delay:240ms]" />
      </span>
      <span>{t("detail.typing", { name })}</span>
    </div>
  );
}

function Dot({ className }: { className?: string }) {
  return <span aria-hidden className={cn("rounded-full bg-muted-foreground", className)} />;
}

// ---------------------------------------------------------------------------
// Composer

function Composer({
  value,
  onChange,
  onSubmit,
  placeholder,
  sendLabel,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  sendLabel: string;
  disabled?: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-2 border-t border-border/60 bg-card px-3 py-2.5"
    >
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Attach file"
        disabled={disabled}
      >
        <Paperclip aria-hidden />
      </Button>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={disabled}
        className="h-9 text-sm"
      />
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Emoji"
        disabled={disabled}
      >
        <Smile aria-hidden />
      </Button>
      <Button
        type="submit"
        size="icon-sm"
        aria-label={sendLabel}
        disabled={!value.trim() || disabled}
      >
        <Send aria-hidden />
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Helpers

interface BurstGroup {
  dateKey: string;
  bursts: Burst[];
}

/** Group messages into calendar-day buckets, then collapse consecutive
 *  same-author messages into a single burst for cleaner rendering. */
function groupByDate(messages: Message[]): BurstGroup[] {
  const groups: BurstGroup[] = [];
  for (const message of messages) {
    const dateKey = dateOnlyKey(message.createdAt);
    let group = groups.find((g) => g.dateKey === dateKey);
    if (!group) {
      group = { dateKey, bursts: [] };
      groups.push(group);
    }
    const lastBurst = group.bursts.at(-1);
    if (lastBurst && lastBurst.author.id === message.author.id) {
      lastBurst.rest.push(message);
    } else {
      group.bursts.push({
        author: message.author,
        first: message,
        rest: [],
      });
    }
  }
  return groups;
}

function dateOnlyKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function roleKey(authorId: number) {
  switch (authorId) {
    case 7:
      return "designer";
    case 8:
      return "juniorDesigner";
    case 12:
      return "owner";
    case 21:
      return "contractor";
    case 33:
      return "mep";
    case 41:
      return "procurement";
    default:
      return "default";
  }
}