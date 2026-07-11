"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Info,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Video,
} from "lucide-react";

import { Avatar, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OwnerAvatar } from "@/components/data-table";
import { cn } from "@/lib/utils";

import type {
  Message,
  MessageAttachment,
  MessageThread,
} from "@/lib/projects/messages-types";

interface ThreadDetailProps {
  thread: MessageThread | null;
  onOpenInfo: () => void;
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
export function ThreadDetail({ thread, onOpenInfo }: ThreadDetailProps) {
  const t = useTranslations("Messages");
  const format = useFormatter();
  const [draft, setDraft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const endRef = React.useRef<HTMLDivElement | null>(null);

  // Reset composer state when switching threads — otherwise the
  // pending draft + reply target leak between contexts.
  React.useEffect(() => {
    setDraft("");
  }, [thread?.id]);

  // Auto-scroll to bottom whenever the message log grows.
  React.useEffect(() => {
    const node = endRef.current;
    if (!node) return;
    node.scrollIntoView({ block: "end" });
  }, [thread?.messages.length, thread?.messages.at(-1)?.id]);

  if (!thread) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        <MessageSquare aria-hidden className="mr-2 inline size-4" />
        {t("detail.empty")}
      </div>
    );
  }

  const groups = groupByDate(thread.messages);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;
    // Real wiring: emit the message into a message-sending API.
    // For now, locally echo the draft into the bubble so the
    // composer feels responsive.
    setDraft("");
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
      <ThreadHeader thread={thread} onOpenInfo={onOpenInfo} />

      <ScrollArea className="flex-1 bg-stone-50 dark:bg-stone-950/40">
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
      </ScrollArea>

      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
        placeholder={t("detail.composerPlaceholder", {
          name: thread.title,
        })}
        sendLabel={t("detail.send")}
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
}: {
  burst: Burst;
  roleLabel: string;
}) {
  const t = useTranslations("Messages");
  const format = useFormatter();
  const firstAt = format.dateTime(burst.first.createdAt, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex items-start gap-2.5">
      <OwnerAvatar
        name={burst.author.fullName}
        color={burst.author.avatarColor}
        size="default"
        className="size-8 text-xs"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <header className="flex flex-wrap items-baseline gap-2 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            {burst.author.fullName}
          </span>
          <span>{roleLabel}</span>
          <span aria-hidden>·</span>
          <span>{firstAt}</span>
        </header>
        {[burst.first, ...burst.rest].map((message) => (
          <article key={message.id} className="flex flex-col gap-1.5">
            <Bubble body={message.body} />
            {message.attachments.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5 pl-1">
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

function Bubble({ body }: { body: string }) {
  return (
    <div
      className={cn(
        "max-w-prose rounded-2xl rounded-tl-sm bg-card px-3 py-2 text-sm text-foreground shadow-xs ring-1 ring-border/40",
        "wrap-break-word",
      )}
    >
      {body}
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
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  sendLabel: string;
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
      >
        <Paperclip aria-hidden />
      </Button>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 text-sm"
      />
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Emoji"
      >
        <Smile aria-hidden />
      </Button>
      <Button
        type="submit"
        size="icon-sm"
        aria-label={sendLabel}
        disabled={!value.trim()}
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