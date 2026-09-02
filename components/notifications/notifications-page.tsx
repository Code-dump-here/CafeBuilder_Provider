"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Bell, Check, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useUnreadCountQuery,
} from "@/features/notifications/hooks";

import { NotificationDetailDialog } from "./notification-detail-dialog";
import { NotificationListItem } from "./notification-list-item";

// ─── Filter tabs ────────────────────────────────────────────────────────────

type ReadFilter = "all" | "unread" | "read";

interface NotificationsTabsProps {
  value: ReadFilter;
  onChange: (next: ReadFilter) => void;
}

function NotificationsTabs({ value, onChange }: NotificationsTabsProps) {
  const t = useTranslations("Notifications.tabs");
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onChange(next as ReadFilter)}
      className="w-full sm:w-auto"
    >
      <TabsList>
        <TabsTrigger value="all">{t("all")}</TabsTrigger>
        <TabsTrigger value="unread">{t("unread")}</TabsTrigger>
        <TabsTrigger value="read">{t("read")}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

// ─── List page ──────────────────────────────────────────────────────────────

interface NotificationsListProps {
  pageNumber: number;
  onPageChange: (next: number) => void;
  filter: ReadFilter;
  onFilterChange: (next: ReadFilter) => void;
  /** Row to open on arrival — set by the bell dropdown's `?n=` handoff. */
  initialSelectedId: string | null;
}

function NotificationsList({
  pageNumber,
  onPageChange,
  filter,
  onFilterChange,
  initialSelectedId,
}: NotificationsListProps) {
  const t = useTranslations("Notifications");
  const tStates = useTranslations("Notifications.states");
  const tPage = useTranslations("Notifications.pagination");

  // Translate the tab filter into the wire `isRead` flag.
  const isReadParam = filter === "all" ? undefined : filter === "read";
  const { data, isLoading, isError, refetch } = useNotificationsQuery({
    pageNumber,
    pageSize: 20,
    isRead: isReadParam,
  });
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();
  const { count: unreadCount } = useUnreadCountQuery();

  const handleMarkAll = React.useCallback(() => {
    markAllRead.mutate();
  }, [markAllRead]);

  // Held as an id rather than the item itself, so the dialog keeps showing the
  // live cached row — a mark-read elsewhere updates it underneath. Resolving it
  // during render also means the `?n=` handoff opens as soon as the first page
  // lands, with no effect chasing the data.
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialSelectedId,
  );
  const selected = selectedId
    ? (data.items.find((item) => item.id === selectedId) ?? null)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <NotificationsTabs value={filter} onChange={onFilterChange} />
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMarkAll}
              disabled={markAllRead.isPending}
              aria-busy={markAllRead.isPending || undefined}
              className="gap-1.5"
            >
              <Check aria-hidden className="size-3.5" />
              {t("markAll")}
            </Button>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">
          {t("resultsCount", { count: data.totalItems })}
        </span>
      </div>

      {isError ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
          <h2 className="text-sm font-semibold text-foreground">
            {tStates("loadErrorTitle")}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {tStates("loadErrorSubtitle")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => void refetch()}
          >
            {tStates("loadErrorRetry")}
          </Button>
        </div>
      ) : isLoading ? (
        <ListSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        // `overflow-hidden` so a row's hover highlight is clipped to the
        // card's radius instead of squaring off its rounded corners. Row
        // padding lives on the row itself, so the highlight fills it.
        <ul className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
          {data.items.map((item) => (
            <li key={item.id}>
              <NotificationListItem
                item={item}
                variant="page"
                onMarkRead={(id) => markRead.mutate({ notificationId: id })}
                isMarkingRead={
                  markRead.isPending &&
                  markRead.variables?.notificationId === item.id
                }
                onOpen={(opened) => setSelectedId(opened.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        pageNumber={data.pageNumber}
        totalPages={data.totalPages}
        hasPrevious={data.hasPrevious}
        hasNext={data.hasNext}
        onPageChange={onPageChange}
        labels={{
          prev: tPage("prev"),
          next: tPage("next"),
          page: tPage("page", {
            current: data.pageNumber,
            total: Math.max(data.totalPages, 1),
          }),
        }}
      />

      <NotificationDetailDialog
        item={selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <ul className="flex flex-col divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
      {[0, 1, 2, 3, 4].map((slot) => (
        <li key={slot} className="flex items-start gap-3 px-3 py-3">
          <span className="mt-1.5 size-2 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ filter }: { filter: ReadFilter }) {
  const t = useTranslations("Notifications.empty");
  const label =
    filter === "unread"
      ? t("unread")
      : filter === "read"
        ? t("read")
        : t("all");
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-4 py-10 text-center">
      <Inbox aria-hidden className="size-6 text-muted-foreground/60" />
      <h2 className="text-sm font-semibold text-foreground">
        {t("title", { filter: label })}
      </h2>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
        {t("subtitle")}
      </p>
    </div>
  );
}

interface PaginationLabels {
  prev: string;
  next: string;
  page: string;
}

interface PaginationProps {
  pageNumber: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPageChange: (next: number) => void;
  labels: PaginationLabels;
}

function Pagination({
  pageNumber,
  totalPages,
  hasPrevious,
  hasNext,
  onPageChange,
  labels,
}: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hasPrevious}
        onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
      >
        {labels.prev}
      </Button>
      <span className="text-xs text-muted-foreground">{labels.page}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hasNext}
        onClick={() => onPageChange(Math.min(totalPages, pageNumber + 1))}
      >
        {labels.next}
      </Button>
    </div>
  );
}

// ─── Page container ─────────────────────────────────────────────────────────

export function NotificationsPage() {
  const t = useTranslations("Notifications.header");
  const searchParams = useSearchParams();
  const [pageNumber, setPageNumber] = React.useState(1);
  const [filter, setFilter] = React.useState<ReadFilter>("all");

  // Read once, on arrival: the bell dropdown links here as `?n={id}` so the
  // full text is reachable from the preview too. Later navigation inside the
  // inbox drives the dialog through state, not the URL.
  const initialSelectedId = searchParams.get("n");

  // Reset to page 1 whenever the filter changes so the user doesn't
  // land on an empty page after switching tabs.
  const handleFilterChange = React.useCallback((next: ReadFilter) => {
    setFilter(next);
    setPageNumber(1);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <header className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          <Bell aria-hidden className="size-3.5 text-primary" />
          {t("eyebrow")}
        </span>
        <h1 className="font-heading text-3xl leading-[1.1] tracking-tight text-foreground md:text-4xl">
          {t("title")}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <NotificationsList
        pageNumber={pageNumber}
        onPageChange={setPageNumber}
        filter={filter}
        onFilterChange={handleFilterChange}
        initialSelectedId={initialSelectedId}
      />
    </div>
  );
}