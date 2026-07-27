"use client";

import * as React from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useCurrentUser } from "@/lib/auth/user-context";
import { tokenStore } from "@/lib/auth/token-store";
import { queryKeys } from "@/lib/react-query/keys";

import {
  fetchNotificationsApi,
  fetchUnreadCountApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  type PagedNotifications,
} from "./api";

// ─── Hydration gate ──────────────────────────────────────────────────────────

/**
 * Returns `true` once the token store has hydrated. SSR returns `true`
 * so the queries don't pend forever on the server.
 */
function useAuthHydrated(): boolean {
  return React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.isHydrated(),
    () => true,
  );
}

// ─── Default page size ───────────────────────────────────────────────────────

/**
 * Notifications are short (titles + 1-line messages) so a 20-row
 * page fits the bell preview without scroll jank. The list page can
 * override via `pageSize` if it wants a denser table.
 */
export const DEFAULT_NOTIFICATIONS_PAGE_SIZE = 20;

// ─── Query: notifications list ───────────────────────────────────────────────

export interface UseNotificationsParams {
  /** 1-indexed page number. */
  pageNumber: number;
  /** Override the default page size. */
  pageSize?: number;
  /** When set, restrict the list to read or unread items. */
  isRead?: boolean;
}

export interface UseNotificationsResult {
  data: PagedNotifications;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * Fetch the current user's notifications.
 *
 * Disabled until both the token store has hydrated AND we have a
 * resolved account id. Sending `accountId=0` to the backend would
 * return an empty list, which is misleading — better to wait.
 *
 * `placeholderData: keepPreviousData` keeps the previous page rendered
 * while the next page loads, so pagination feels instant.
 */
export function useNotificationsQuery(
  params: UseNotificationsParams,
): UseNotificationsResult {
  const { account, isLoading: accountLoading } = useCurrentUser();
  const hydrated = useAuthHydrated();

  const pageSize = params.pageSize ?? DEFAULT_NOTIFICATIONS_PAGE_SIZE;
  const accountId = account?.id ?? 0;

  const enabled =
    hydrated && !accountLoading && Boolean(account && account.id > 0);

  const query = useQuery<PagedNotifications, Error>({
    queryKey: queryKeys.notifications.list({
      accountId,
      pageNumber: params.pageNumber,
      pageSize,
      isRead: params.isRead,
    }),
    queryFn: ({ signal }) =>
      fetchNotificationsApi(
        {
          accountId,
          pageNumber: params.pageNumber,
          pageSize,
          isRead: params.isRead,
        },
        { signal },
      ),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000, // 30s — notifications update frequently
  });

  return {
    data: query.data ?? {
      items: [],
      pageNumber: params.pageNumber,
      pageSize,
      totalItems: 0,
      totalPages: 1,
      hasPrevious: false,
      hasNext: false,
    },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Query: unread count ─────────────────────────────────────────────────────

export interface UseUnreadCountResult {
  count: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * GET /api/notifications/unread-count — bell badge source of truth.
 *
 * Polled every 60s while the user is signed in. The interval is short
 * enough to feel "live" (project applicants / proposal feedback land
 * here within a minute) but long enough that we're not hammering the
 * backend. Polling pauses when the tab is hidden via
 * `refetchIntervalInBackground: false`.
 */
export function useUnreadCountQuery(): UseUnreadCountResult {
  const { account } = useCurrentUser();
  const hydrated = useAuthHydrated();

  const accountId = account?.id ?? 0;

  const query = useQuery<number, Error>({
    queryKey: queryKeys.notifications.unreadCount(accountId),
    queryFn: ({ signal }) =>
      fetchUnreadCountApi({ accountId }, { signal }),
    enabled: hydrated && Boolean(account && account.id > 0),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });

  return {
    count: query.data ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Mutation: mark as read ──────────────────────────────────────────────────

export interface MarkNotificationReadVariables {
  notificationId: number;
}

/**
 * PUT /api/notifications/{id}/read.
 *
 * Optimistic update: flip the matching item to `isRead: true` in every
 * cached list query so the bell badge decrements instantly and the
 * unread tab drops the row without a refetch round-trip. The unread
 * count is decremented optimistically too — the polling interval will
 * reconcile against the server's truth within 60s.
 *
 * If the request fails, the optimistic update is rolled back and the
 * unread count is refetched.
 */
export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  const { account } = useCurrentUser();
  const accountId = account?.id ?? 0;

  return useMutation<void, Error, MarkNotificationReadVariables, {
    previousLists: Array<[readonly unknown[], PagedNotifications | undefined]>;
    previousCount: number | undefined;
  }>({
    mutationFn: ({ notificationId }) =>
      markNotificationReadApi(notificationId),

    onMutate: async ({ notificationId }) => {
      // Cancel any in-flight refetches so they don't overwrite our
      // optimistic patch before it lands.
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.list({ accountId, pageNumber: 0, pageSize: 0 }),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.unreadCount(accountId),
      });

      const listEntries = queryClient.getQueriesData<PagedNotifications>({
        queryKey: ["notifications", "list"],
      });
      const previousLists: Array<
        [readonly unknown[], PagedNotifications | undefined]
      > = listEntries.map(([key, value]) => [key, value]);

      // Patch every cached list page.
      queryClient.setQueriesData<PagedNotifications>(
        { queryKey: ["notifications", "list"] },
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((item) =>
              item.id === notificationId
                ? { ...item, isRead: true, readAt: new Date().toISOString() }
                : item,
            ),
          };
        },
      );

      // Decrement unread count optimistically.
      const countKey = queryKeys.notifications.unreadCount(accountId);
      const previousCount = queryClient.getQueryData<number>(countKey);
      if (typeof previousCount === "number" && previousCount > 0) {
        queryClient.setQueryData<number>(countKey, previousCount - 1);
      }

      return { previousLists, previousCount };
    },

    onError: (_err, _variables, context) => {
      if (!context) return;
      // Roll back the list patches.
      for (const [key, value] of context.previousLists) {
        queryClient.setQueryData(key, value);
      }
      // Roll back the count.
      if (typeof context.previousCount === "number") {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount(accountId),
          context.previousCount,
        );
      }
    },

    onSettled: () => {
      // Reconcile against the server. Skip the immediate refetch for
      // the list — `keepPreviousData` keeps the optimistic state
      // visible while the real fetch lands.
      void queryClient.invalidateQueries({
        queryKey: ["notifications", "list"],
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(accountId),
      });
    },
  });
}

// ─── Mutation: mark all as read ──────────────────────────────────────────────

/**
 * POST /api/notifications/mark-all-read.
 *
 * Optimistic update: flip every cached list page to `isRead: true`
 * and zero the unread count. Failed mutations roll back through
 * the saved snapshot.
 *
 * Triggered exclusively from the inbox header — the bell preview
 * doesn't surface a "Mark all" affordance because the dropdown is
 * already a small preview, not the canonical inbox.
 */
export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  const { account } = useCurrentUser();
  const accountId = account?.id ?? 0;

  return useMutation<
    void,
    Error,
    void,
    {
      previousLists: Array<[readonly unknown[], PagedNotifications | undefined]>;
      previousCount: number | undefined;
    }
  >({
    mutationFn: () => markAllNotificationsReadApi({ accountId }),

    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["notifications", "list"],
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.unreadCount(accountId),
      });

      const listEntries = queryClient.getQueriesData<PagedNotifications>({
        queryKey: ["notifications", "list"],
      });
      const previousLists: Array<
        [readonly unknown[], PagedNotifications | undefined]
      > = listEntries.map(([key, value]) => [key, value]);

      const now = new Date().toISOString();

      // Mark every cached item read in every cached page.
      queryClient.setQueriesData<PagedNotifications>(
        { queryKey: ["notifications", "list"] },
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((item) =>
              item.isRead
                ? item
                : { ...item, isRead: true, readAt: item.readAt ?? now },
            ),
          };
        },
      );

      // Zero the unread count.
      const countKey = queryKeys.notifications.unreadCount(accountId);
      const previousCount = queryClient.getQueryData<number>(countKey);
      queryClient.setQueryData<number>(countKey, 0);

      return { previousLists, previousCount };
    },

    onError: (_err, _variables, context) => {
      if (!context) return;
      for (const [key, value] of context.previousLists) {
        queryClient.setQueryData(key, value);
      }
      if (typeof context.previousCount === "number") {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount(accountId),
          context.previousCount,
        );
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["notifications", "list"],
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(accountId),
      });
    },
  });
}