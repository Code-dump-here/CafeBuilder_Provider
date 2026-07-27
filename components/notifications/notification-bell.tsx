"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Check, Loader2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/lib/auth/user-context";
import { cn } from "@/lib/utils";
import {
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useUnreadCountQuery,
} from "@/lib/notifications/hooks";
import type { NotificationItem } from "@/lib/notifications/api";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── List item ───────────────────────────────────────────────────────────────

interface NotificationListItemProps {
  item: NotificationItem;
  /**
   * When true the row renders as a `<Link>` (or a button that
   * marks-as-read before navigating). When false it renders as a
   * static row — used by the dropdown preview where we trigger the
   * mutation directly without deep-linking.
   */
  variant: "preview" | "page";
  onMarkRead: (id: number) => void;
  isMarkingRead: boolean;
}

function NotificationListItem({
  item,
  variant,
  onMarkRead,
  isMarkingRead,
}: NotificationListItemProps) {
  const t = useTranslations("Notifications.item");
  const relative = useRelativeTime();

  const content = (
    <div className="flex w-full items-start gap-3 py-2.5">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          item.isRead ? "bg-muted-foreground/30" : "bg-primary",
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

  if (variant === "page" && item.actionUrl) {
    return (
      <Link
        href={item.actionUrl}
        className="block rounded-md px-2 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
      >
        {content}
      </Link>
    );
  }
  return <div className="px-2">{content}</div>;
}

// ─── Bell button (dropdown trigger + unread badge) ──────────────────────────

interface NotificationBellProps {
  /**
   * Number of unread items to render as the badge. Defaults to the
   * live `useUnreadCountQuery()` value; can be overridden (e.g. by
   * the sidebar tile that owns its own count subscription).
   */
  count?: number;
}

export function NotificationBell({ count: countProp }: NotificationBellProps = {}) {
  const t = useTranslations("Notifications");
  const { account } = useCurrentUser();
  const { count: liveCount } = useUnreadCountQuery();

  // Signed-out users see a disabled bell — no point in a bell that
  // never updates. The `Notifications` link in the sidebar handles
  // the redirect to /login for guests.
  if (!account) {
    return (
<Button
          variant="outline"
          size="icon"
          aria-label={t("title")}
          disabled
        >
          <Bell aria-hidden className="h-[1.2rem] w-[1.2rem]" />
        </Button>
    );
  }

  const count = countProp ?? liveCount;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("title")}
          className="relative"
        >
          <Bell aria-hidden className="h-[1.2rem] w-[1.2rem]" />
          {count > 0 ? (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground ring-2 ring-background"
            >
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <NotificationDropdownPreview />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Dropdown preview (fetches first page of notifications) ──────────────────

function NotificationDropdownPreview() {
  const t = useTranslations("Notifications");
  const { data, isLoading } = useNotificationsQuery({
    pageNumber: 1,
    pageSize: 6,
  });
  const markRead = useMarkNotificationReadMutation();

  return (
    <div className="flex max-h-[480px] flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <DropdownMenuLabel className="px-0 text-sm font-semibold text-foreground">
          {t("title")}
        </DropdownMenuLabel>
        <span className="text-[11px] text-muted-foreground">
          {data.totalItems > 0
            ? t("preview.total", { count: data.totalItems })
            : null}
        </span>
      </div>
      <DropdownMenuSeparator />

      {isLoading ? (
        <div className="flex flex-col gap-1 px-2 py-2">
          {[0, 1, 2].map((slot) => (
            <div key={slot} className="flex items-start gap-3 px-2 py-2">
              <Skeleton className="mt-1.5 size-2 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 px-4 py-8 text-center">
          <Bell aria-hidden className="size-5 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">
            {t("preview.emptyTitle")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("preview.emptySubtitle")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {data.items.slice(0, 5).map((item) => (
            <DropdownMenuItem
              key={item.id}
              asChild
              className="cursor-pointer p-0 focus:bg-accent"
            >
              <NotificationListItem
                item={item}
                variant="preview"
                onMarkRead={(id) => markRead.mutate({ notificationId: id })}
                isMarkingRead={
                  markRead.isPending &&
                  markRead.variables?.notificationId === item.id
                }
              />
            </DropdownMenuItem>
          ))}
        </div>
      )}

      <DropdownMenuSeparator />
      <div className="p-1">
        <DropdownMenuItem asChild className="cursor-pointer rounded-md">
          <Link
            href="/notifications"
            className="flex w-full items-center justify-center py-1.5 text-xs font-medium text-primary"
          >
            {t("preview.viewAll")}
          </Link>
        </DropdownMenuItem>
      </div>
    </div>
  );
}