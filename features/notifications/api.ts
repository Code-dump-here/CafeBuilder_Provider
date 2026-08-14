import { api } from "@/lib/http/axios";
import type {
  ApiSuccessResponse,
  RequestConfig,
} from "@/lib/http/types";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Discriminator for the notification channel. Mirrors the backend
 * `Notification.type` enum. New values are expected (mobile push,
 * system banner, etc.) — keep this open as `string` until the
 * backend publishes a closed enum.
 */
export type NotificationKind = string;

/**
 * A single notification record as returned by `GET /api/notifications`.
 *
 * `actionUrl` is optional — some notifications are informational only
 * (e.g. "Your profile was verified") and don't deep-link anywhere.
 *
 * `referenceType` + `referenceId` are the structured deep-link payload
 * introduced by the close-collaboration flow (`a.md` §6). When the
 * backend populates these (e.g. `referenceType: "project"` /
 * `referenceId: 42`), the FE can derive a stable href from them even
 * if the `actionUrl` is missing or stale.
 *
 * `meta` remains a free-form bag for backend-specific extensions we
 * don't want to bake into the contract yet (e.g. an embedded `actorId`,
 * `contractId`, or `submissionId`).
 */
export interface NotificationItem {
  id: number;
  /** Short headline — what the bell badge should surface. */
  title: string;
  /** Long-form description, optionally with HTML. Render as plain text. */
  message: string;
  /** Channel / category tag. */
  type: NotificationKind;
  /** Whether the user has marked the notification as read. */
  isRead: boolean;
  /** Optional deep-link target. When present, the bell preview and the
   *  list item render the row as a `<Link>` pointing here. */
  actionUrl: string | null;
  /** Structured link target — see `referenceId`. */
  referenceType?: string | null;
  /** Numeric id the deep-link resolver uses (engagementId / projectId / …). */
  referenceId?: number | null;
  /** Free-form backend payload (actor, project id, contract id, …). */
  meta: Record<string, unknown> | null;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp — populated when the user marks the item read. */
  readAt: string | null;
}

/**
 * Resolve the in-app deep-link for a notification.
 *
 * Order of precedence:
 *   1. `actionUrl` (full URL the backend already computed).
 *   2. `referenceType` + `referenceId` — used by the close-collaboration
 *      notifications (see `a.md` §6 for the canonical mapping).
 *   3. Fall through to the notifications list (`/notifications`) — there's
 *      no per-notification detail page (`/notifications/{id}` was never
 *      built; no matching route under app/[locale]/), so a bare id would
 *      404. Not deleting the original fallback below — swap it back in
 *      once that page exists.
 */
export function deriveNotificationHref(item: NotificationItem): string {
  if (typeof item.actionUrl === "string" && item.actionUrl.length > 0) {
    return item.actionUrl;
  }
  const refType = item.referenceType ?? null;
  const refId = item.referenceId ?? null;
  if (typeof refId === "number" && refId > 0) {
    if (refType === "project_provider") return `/my-projects`;
    if (refType === "project") return `/projects/${refId}`;
  }
  // return `/notifications/${item.id}`;
  return `/notifications`;
}

/**
 * Standard paged envelope. Mirrors the project's `PagedResponse<T>`
 * convention — kept local to `features/notifications` so callers don't
 * reach into `features/projects` for a non-project shape.
 */
export interface PagedNotifications {
  items: NotificationItem[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// ─── List endpoint ───────────────────────────────────────────────────────────

/**
 * Filters accepted by `GET /api/notifications`. `isRead` is the only
 * optional field; the rest are required by the backend.
 */
export interface FetchNotificationsParams {
  accountId: number;
  pageNumber: number;
  pageSize: number;
  /** When set, restrict the list to read or unread items. */
  isRead?: boolean;
}

/**
 * GET /api/notifications — fetch the current user's notifications.
 *
 * The endpoint returns the standard paged envelope. `accountId` is
 * sent as a query string parameter per the Swagger contract — the
 * auth context identifies the user too, but the backend explicitly
 * reads the param.
 */
export async function fetchNotificationsApi(
  params: FetchNotificationsParams,
  config?: RequestConfig,
): Promise<PagedNotifications> {
  const response = await api.get<PagedNotifications>("/api/notifications", {
    ...config,
    params: {
      accountId: params.accountId,
      pageNumber: params.pageNumber,
      pageSize: params.pageSize,
      // Only include the param when the caller actually wants a
      // read/unread filter — leaving it out returns every item.
      ...(params.isRead === undefined ? {} : { isRead: params.isRead }),
    },
  });
  return response.data;
}

// ─── Unread count ────────────────────────────────────────────────────────────

export interface FetchUnreadCountParams {
  accountId: number;
}

/**
 * GET /api/notifications/unread-count?accountId={id}.
 *
 * Returns the bare integer count. The endpoint is wrapped in the
 * standard success envelope (`{ data: number, message?, meta? }`)
 * per the rest of the codebase — the Swagger screenshot showed the
 * `200` response as a raw integer, but every other backend endpoint
 * uses the envelope, so we follow the convention here and adjust if
 * the real wire format is plain.
 */
export async function fetchUnreadCountApi(
  params: FetchUnreadCountParams,
  config?: RequestConfig,
): Promise<number> {
  const response = await api.get<ApiSuccessResponse<number>>(
    "/api/notifications/unread-count",
    {
      ...config,
      params: { accountId: params.accountId },
    },
  );
  return response.data.data;
}

// ─── Mark as read ────────────────────────────────────────────────────────────

/**
 * PUT /api/notifications/{id}/read — mark a single notification read.
 *
 * Body is empty per the Swagger contract. We still type the second
 * argument so the endpoint can accept future fields (e.g. a
 * `readSource` for analytics) without breaking call sites.
 */
export async function markNotificationReadApi(
  notificationId: number,
  config?: RequestConfig,
): Promise<void> {
  await api.put<ApiSuccessResponse<null>>(
    `/api/notifications/${notificationId}/read`,
    null,
    config,
  );
}

// ─── Mark all as read ────────────────────────────────────────────────────────

export interface MarkAllNotificationsReadParams {
  accountId: number;
}

/**
 * POST /api/notifications/mark-all-read?accountId={id}.
 *
 * Idempotent — calling twice is a no-op. The backend reads
 * `accountId` from the query string per the Swagger contract; the
 * auth context identifies the user too, but the backend explicitly
 * reads the param.
 *
 * Response is wrapped in `ApiSuccessResponse` for parity with the
 * rest of the codebase. Returns `void` — the call site's optimistic
 * update flips the cached list directly, so the response payload
 * isn't used.
 */
export async function markAllNotificationsReadApi(
  params: MarkAllNotificationsReadParams,
  config?: RequestConfig,
): Promise<void> {
  await api.post<ApiSuccessResponse<null>>(
    "/api/notifications/mark-all-read",
    null,
    {
      ...config,
      params: { accountId: params.accountId },
    },
  );
}
