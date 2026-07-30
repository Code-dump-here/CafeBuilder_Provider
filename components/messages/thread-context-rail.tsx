"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Download, FileText, Image, Search, Users } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OwnerAvatar } from "@/components/data-table";
import { cn } from "@/lib/utils";

import type { MessageAttachment, MessageThread } from "@/lib/projects/messages-types";

interface ThreadContextRailProps {
  thread: MessageThread | null;
}

/**
 * Right rail of the messages page. Layout:
 *
 *   ┌──────────────────────────┐
 *   │  Files                   │
 *   │  ┌────────────────────┐  │
 *   │  │ 🔍 search files…   │  │
 *   │  └────────────────────┘  │
 *   │  ┌─ [PDF]  Counter rev… │  │
 *   │  │ [DWG]  Design brief… │  │
 *   │  └──────────────────────┘ │
 *   │                          │
 *   │  Members                 │
 *   │  👤 Hoa My     ● online  │
 *   │  👤 Minh Anh   ● online  │
 *   └──────────────────────────┘
 *
 * Tabs were dropped (Media / Voice) — we keep the surface focused
 * on what the design review workflow actually consumes (PDFs,
 * DWGs, PNGs). Voice notes and photo galleries are out of scope.
 */
export function ThreadContextRail({ thread }: ThreadContextRailProps) {
  const t = useTranslations("Messages");
  const [search, setSearch] = React.useState("");

  const filteredFiles = React.useMemo(() => {
    if (!thread) return [];
    const q = search.trim().toLowerCase();
    if (!q) return thread.attachments;
    return thread.attachments.filter((a) =>
      a.title.toLowerCase().includes(q),
    );
  }, [thread, search]);

  if (!thread) {
    return (
      <aside className="hidden h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card lg:flex">
        <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-muted-foreground">
          {t("rail.files.empty")}
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label={t("rail.label")}
      className="hidden h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card lg:flex"
    >
      <header className="flex flex-col gap-2 border-b border-border/60 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("rail.heading")}
        </p>
        <h2 className="text-sm font-semibold text-foreground">
          {t("rail.files.title")}
          <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {thread.attachments.length}
          </span>
        </h2>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("rail.files.searchPlaceholder")}
            aria-label={t("rail.files.searchPlaceholder")}
            className="h-8 pl-7 text-xs"
          />
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-3">
          <section className="flex flex-col gap-2">
            {filteredFiles.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
                {search.trim()
                  ? t("rail.files.emptySearch")
                  : t("rail.files.empty")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {filteredFiles.map((attachment) => (
                  <li key={attachment.id}>
                    <FileCard attachment={attachment} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h4 className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Users aria-hidden className="size-3" />
              {t("rail.members")}
            </h4>
            {thread.members.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
                {t("rail.membersEmpty")}
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {thread.members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-2.5 rounded-md border border-border/40 bg-card/60 px-2 py-1.5"
                  >
                    <OwnerAvatar
                      name={member.fullName}
                      color={member.avatarColor}
                      size="default"
                      className="size-7 text-[11px]"
                    />
                    <p className="line-clamp-1 flex-1 text-xs font-medium text-foreground">
                      {member.fullName}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}

function FileCard({ attachment }: { attachment: MessageAttachment }) {
  const Icon = attachment.kind === "MEDIA" ? Image : FileText;
  const swatch =
    attachment.kind === "MEDIA"
      ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
      : "bg-stone-500/15 text-stone-700 dark:text-stone-300";

  return (
    <article
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-border/40 bg-card p-2.5",
        "transition-colors hover:bg-muted/40",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tracking-wider",
          swatch,
        )}
      >
        {attachment.fileType ? (
          <span>{attachment.fileType.slice(0, 4).toUpperCase()}</span>
        ) : (
          <Icon className="size-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-xs font-semibold text-foreground">
          {attachment.title}
        </p>
        {attachment.subtitle ? (
          <p className="line-clamp-1 text-[10px] text-muted-foreground">
            {attachment.subtitle}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Download"
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Download aria-hidden className="size-3.5" />
      </button>
    </article>
  );
}