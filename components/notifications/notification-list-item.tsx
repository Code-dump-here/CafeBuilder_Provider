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

// ─── Type icons ─────────────────────────────────────────────────────────────

/**
 * `react-notifications` doesn't ship per-type icons. For the five
 * lifecycle types introduced by `a.md` §6 we surface a coloured dot so
 * the bell preview and inbox at least groups them visually until the
 * design system grows per-type icons.
 */
function typeAccent(type: NotificationItem["type"]): string {
  switch (type) {
    case "engagement_completion_requested":
      return "bg-sky-500";
    case "engagement_completed":
      return "bg-emerald-500";
    case "engagement_terminated":
      return "bg-rose-500";
    case "project_completed":
      return "bg-emerald-500";
    case "project_cancelled":
      return "bg-destructive";
    default:
      return "bg-muted-foreground/30";
  }
}

// ─── List item ──────────────────────────────────────────────────────────────

export interface NotificationListItemProps {
  item: NotificationItem;
  /**
   * When `page` the row deep-links via `item.actionUrl` (when set) or
   * the `referenceType`/`referenceId` pair (see `deriveNotificationHref`).
   * When `preview` it renders as a static row — used by the dropdown
   * preview where the mark-as-read action is fired directly.
   */
  variant: "preview" | "page";
  onMarkRead: (id: number) => void;
  isMarkingRead: boolean;
}

export function NotificationListItem({
  item,
  variant,
  onMarkRead,
  isMarkingRead,
}: NotificationListItemProps) {
  const t = useTranslations("Notifications.item");
  const relative = useRelativeTime();

  const accentClass = typeAccent(item.type);

  const content = (
    <div className="flex w-full items-start gap-3 py-2.5">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          item.isRead ? "bg-muted-foreground/30" : accentClass,
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
      {!item.isRead ? (
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
          className="shrink-0"
        >
          {isMarkingRead ? (
            <Loader2 aria-hidden className="size-3 animate-spin" />
          ) : (
            <Check aria-hidden className="size-3" />
          )}
        </Button>
      ) : null}
    </div>
  );

  if (variant === "page") {
    return (
      <Link
        href={deriveNotificationHref(item)}
        className="block rounded-md px-2 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
      >
        {content}
      </Link>
    );
  }
  return <div className="px-2">{content}</div>;
}
