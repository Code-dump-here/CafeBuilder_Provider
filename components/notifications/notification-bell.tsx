"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { useTranslations } from "next-intl";

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
import { useCurrentUser } from "@/features/auth/user-context";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useUnreadCountQuery,
} from "@/features/notifications/hooks";

import { NotificationListItem } from "./notification-list-item";

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
  const markAllRead = useMarkAllNotificationsReadMutation();
  // The server's count, not `data.items.filter(...)`: the dropdown only holds
  // the first six rows, so counting them would grey the button out while older
  // notifications were still unread. Shares its cache entry with the bell
  // badge, so this costs no extra request.
  const { count: unreadCount } = useUnreadCountQuery();

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
      {/* Two actions, not one. Clearing the badge is what people open the bell
          to do, so it leads; the inbox — filters, older pages — sits beside
          it. */}
      <div className="flex items-center gap-1 p-1">
        <DropdownMenuItem
          disabled={unreadCount === 0 || markAllRead.isPending}
          aria-busy={markAllRead.isPending || undefined}
          onSelect={(event) => {
            // Hold the dropdown open: watching the rows shed their unread
            // styling is the only confirmation this action gives.
            event.preventDefault();
            markAllRead.mutate();
          }}
          className="flex-1 cursor-pointer justify-center gap-1.5 whitespace-nowrap rounded-md py-1.5 text-xs font-medium"
        >
          <Check aria-hidden className="size-3.5" />
          {t("preview.markAll")}
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="flex-1 cursor-pointer rounded-md">
          <Link
            href="/notifications"
            className="flex w-full items-center justify-center whitespace-nowrap py-1.5 text-xs font-medium text-primary"
          >
            {t("preview.viewAll")}
          </Link>
        </DropdownMenuItem>
      </div>
    </div>
  );
}