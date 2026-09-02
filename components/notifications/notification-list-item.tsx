"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  deriveNotificationHref,
  type NotificationItem,
} from "@/features/notifications/api";

// ─── Relative time ──────────────────────────────────────────────────────────

/**
 * Locale-relative "X minutes ago" label. Avoids pulling in `date-fns`
 * for a one-liner.
 */
function useRelativeTime(): (iso: string) => string {
  const format = useFormatter();
  return React.useCallback(
    (iso: string) => {
      const ts = new Date(iso).getTime();
      if (Number.isNaN(ts)) return iso;
      const diff = Date.now() - ts;
      const minutes = Math.floor(diff / 60_000);
      if (minutes < 1) return format.dateTime(new Date(ts), "time");
      if (minutes < 60) return format.relativeTime(ts, new Date());
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return format.relativeTime(ts, new Date());
      return format.dateTime(new Date(ts), "short");
    },
    [format],
  );
}

// ─── List item ──────────────────────────────────────────────────────────────

export interface NotificationListItemProps {
  item: NotificationItem;
  /**
   * `page` is the inbox row, `preview` the dropdown's denser one. Both mark
   * the item read on open.
   *
   * Where they differ is the destination. The inbox opens the notification in
   * full via `onOpen`, because the row clamps the body to two lines and there
   * was otherwise nowhere to read the rest. The preview has no room for a
   * dialog of its own, so it links into the inbox with the row preselected.
   */
  variant: "preview" | "page";
  onMarkRead: (id: string) => void;
  isMarkingRead: boolean;
  /**
   * Show the full notification. Supplied by the inbox; when absent the row
   * falls back to deep-linking straight at the referenced project.
   */
  onOpen?: (item: NotificationItem) => void;
}

export function NotificationListItem({
  item,
  variant,
  onMarkRead,
  isMarkingRead,
  onOpen,
}: NotificationListItemProps) {
  const t = useTranslations("Notifications.item");
  const relative = useRelativeTime();

  // The readable part of the row. Kept apart from the mark-read control so the
  // `page` variant can make this — and only this — the clickable element: a
  // <button> may not contain another <button>, and nesting them is a hydration
  // error, not just invalid markup.
  const body = (
    <>
      {/* Red means unread, full stop. This used to be tinted per notification
          type, which left most types on the same muted grey as a read row —
          the one state the dot exists to distinguish. */}
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          item.isRead ? "bg-muted-foreground/30" : "bg-red-500",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p
          className={cn(
            "truncate text-sm leading-snug",
            item.isRead ? "font-normal text-muted-foreground" : "font-medium text-foreground",
          )}
        >
          {item.title}
        </p>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {item.message}
        </p>
        <span className="text-[11px] text-muted-foreground/80">
          {relative(item.createdAt)}
        </span>
      </div>
    </>
  );

  const markReadButton = !item.isRead ? (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={t("markRead")}
      disabled={isMarkingRead}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onMarkRead(item.id);
      }}
      className="mt-2.5 shrink-0"
    >
      {isMarkingRead ? (
        <Loader2 aria-hidden className="size-3 animate-spin" />
      ) : (
        <Check aria-hidden className="size-3" />
      )}
    </Button>
  ) : null;

  // Opening a notification is reading it. Without this the badge only ever
  // cleared via the small check button, so it sat at the same count no matter
  // how many times the row was opened.
  const markReadOnOpen = () => {
    if (!item.isRead) onMarkRead(item.id);
  };

  if (variant === "page") {
    // Wrapper carries the hover/focus highlight that used to sit on the
    // clickable itself, so the row still lights up as one surface even though
    // it is now two siblings.
    //
    // It also owns the row's horizontal padding and has no radius of its own.
    // Inset with a small radius, the highlight floated inside the row instead
    // of filling it, and its corners cut across the card's much rounder ones.
    // The card clips it now (`overflow-hidden` on the <ul>), so the first and
    // last rows follow the card's curve exactly.
    const openClass =
      "flex min-w-0 flex-1 items-start gap-3 py-2.5 text-left focus-visible:outline-none";
    return (
      <div className="flex items-start gap-3 px-4 transition-colors hover:bg-accent focus-within:bg-accent">
        {onOpen ? (
          <button
            type="button"
            onClick={() => {
              markReadOnOpen();
              onOpen(item);
            }}
            className={openClass}
          >
            {body}
          </button>
        ) : (
          <Link
            href={deriveNotificationHref(item)}
            onClick={markReadOnOpen}
            className={openClass}
          >
            {body}
          </Link>
        )}
        {markReadButton}
      </div>
    );
  }
  // The dropdown hands off to the inbox with this row preselected, so the full
  // text is one click away from the bell as well.
  //
  // This one stays a single <Link> root: `DropdownMenuItem asChild` clones
  // whatever element is returned here into the menu item, so splitting it into
  // a wrapper would make the menu item a <div> that no longer navigates on
  // select.
  return (
    <Link
      href={`/notifications?n=${encodeURIComponent(item.id)}`}
      onClick={markReadOnOpen}
      className="flex w-full items-start gap-3 px-2 py-2.5 transition-colors"
    >
      {body}
      {markReadButton}
    </Link>
  );
}
