export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
    account: () => ["auth", "account"] as const,
  },
  admin: {
    overview: () => ["admin", "overview"] as const,
    revenue: (params?: unknown) => ["admin", "revenue", params] as const,
    transactions: (params?: unknown) => ["admin", "transactions", params] as const,
    accounts: (params?: unknown) => ["admin", "accounts", params] as const,
    account: (id: string | null) => ["admin", "account", id] as const,
  },
  users: {
    detail: (id: string) => ["users", "detail", id] as const,
  },
  serviceProviderProfiles: {
    /**
     * Single service-provider profile by id:
     * `GET /api/service-provider-profiles/{id}`.
     * Used by the public provider detail page and any screen that
     * needs the canonical profile record outside of `auth.me`.
     */
    detail: (id: string) => ["serviceProviderProfiles", "detail", id] as const,
  },
  payments: {
    /**
     * Catalogue of plans: `GET /api/payments/plans`.
     * No parameters — the server returns the full list and pagination
     * isn't part of the contract today. The discriminator is the
     * `targetRole` filter applied by `selectPaymentPlansForRole`,
     * which the UI uses to slice the cached result for the current
     * viewer without re-issuing the request.
     */
    plans: () => ["payments", "plans"] as const,
  },
  notifications: {
    /**
     * Paged list of the current user's notifications:
     *   `GET /api/notifications?accountId={id}&pageNumber={n}&pageSize={n}&isRead={bool}`.
     * `accountId` is the primary discriminator — two viewers never
     * share this cache. `pageNumber` / `pageSize` are part of the key
     * so pagination state doesn't bleed across page sizes; `isRead`
     * is included so an "unread" tab doesn't render data from an
     * "all" query (or vice-versa).
     */
    list: (params: {
      accountId: string;
      pageNumber: number;
      pageSize: number;
      isRead?: boolean;
    }) =>
      [
        "notifications",
        "list",
        params.accountId,
        params.pageNumber,
        params.pageSize,
        params.isRead ?? "any",
      ] as const,
    /**
     * Unread count for the bell badge:
     *   `GET /api/notifications/unread-count?accountId={id}`.
     * One cached entry per account. Invalidated whenever a
     * "mark as read" mutation succeeds.
     */
    unreadCount: (accountId: string) =>
      ["notifications", "unreadCount", accountId] as const,
  },
  projects: {
    /** Single-project GET /api/project-shop-owners/{id}. `id` is the discriminator. */
    detail: (id: string) => ["projects", "detail", id] as const,
    /**
     * Paged design briefs for a project: GET /api/design-briefs.
     * `(projectId, pageNumber, pageSize)` is the discriminator — page
     * size also goes into the key so two callers with different page
     * sizes don't collide.
     */
    designBriefs: (
      projectId: string,
      page: { pageNumber: number; pageSize: number },
    ) => ["projects", "designBriefs", projectId, page.pageNumber, page.pageSize] as const,
    /**
     * Paged AI recommendations for a single design brief:
     * `GET /api/ai-recommendations?briefId={id}`.
     * The briefId is the discriminator — page size is included so two
     * callers with different page sizes don't collide in the cache.
     */
    aiRecommendations: (
      briefId: string,
      page: { pageNumber: number; pageSize: number },
    ) => ["projects", "aiRecommendations", briefId, page.pageNumber, page.pageSize] as const,
  },
  designs: {
    /**
     * Paged full-history of design snapshots:
     *   `GET /api/designs/{id}/versions?pageNumber=&pageSize=`.
     * Discriminators are `(designId, pageNumber, pageSize)` so two
     * designs — or two pages of the same design — never collide. The
     * list endpoint orders by `snapshottedAt DESC`, so the freshest
     * snapshot is always on page 1.
     *
     * Invalidation target after every submit / approve / start-revision /
     * request-revision mutation on the same `designId`.
     */
    versions: (
      designId: string,
      page: { pageNumber: number; pageSize: number },
    ) =>
      [
        "designs",
        "versions",
        designId,
        page.pageNumber,
        page.pageSize,
      ] as const,
    /**
     * Single snapshot detail:
     *   `GET /api/designs/{designId}/versions/{versionId}`.
     * Includes the list of images *as they were* at the moment of the
     * snapshot (independent of any later edits / deletions to the
     * source design images).
     */
    versionSnapshot: (designId: string, versionId: string) =>
      ["designs", "versionSnapshot", designId, versionId] as const,
  },
  comments: {
    /**
     * Thread for one target: `GET /api/comments?targetType=&targetId=`.
     * Discriminated by the (targetType, targetId) pair, since ids are only
     * unique within a target type. Invalidate after posting or deleting a
     * comment on the same target.
     */
    list: (targetType: string, targetId: string) =>
      ["comments", targetType, targetId] as const,
  },
  marketplace: {
    /** All `list` queries share the `marketplace.list` prefix for easy
     * invalidation from any mutation that touches posts. The filter
     * tuple is the discriminator so two pages with different filters
     * don't collide. */
    list: (filters: Record<string, unknown>) =>
      ["marketplace", "list", filters] as const,
    /** Open-brief count surfaced in the marketplace hero. */
    openCount: () => ["marketplace", "openCount"] as const,
  },
  myProjects: {
    /**
     * Provider-facing list of their own project-workings:
     *   `GET /api/project-workings?serviceProviderProfileId={id}`.
     * `serviceProviderProfileId` is the discriminator — two providers
     * never share this cache. `pageNumber` / `pageSize` go into the
     * key so pagination state doesn't bleed across filters. `status`
     * is the (optional) wire filter — when omitted the backend returns
     * every engagement for the provider, when present the cache is
     * scoped to the matching status only (e.g. `requested` for the
     * invitations tab).
     */
    list: (params: {
      serviceProviderProfileId: string;
      pageNumber: number;
      pageSize: number;
      status?: string;
      contractType?: string;
    }) =>
      [
        "myProjects",
        "list",
        params.serviceProviderProfileId,
        params.pageNumber,
        params.pageSize,
        params.status ?? "all",
        // Part of the identity: a provider who does both kinds of work can
        // narrow the same status tab to design or construction, and those
        // are different result sets.
        params.contractType ?? "all",
      ] as const,
    /**
     * Prefix key for invalidating every `myProjects.list` entry for a
     * single provider (all pages × all statuses). Use this after a
     * mutation that touches the provider's project-working set
     * (accept / reject / status change) so the next visit pulls the
     * freshest rows.
     */
    listAll: (serviceProviderProfileId: string) =>
      ["myProjects", "list", serviceProviderProfileId] as const,
  },
  chat: {
    /**
     * Paginated thread list for a single engagement:
     *   `GET /api/chat/conversations?projectWorkingId=&pageNumber=&pageSize=`.
     * Discriminators are `projectWorkingId`, `pageNumber`, `pageSize`.
     * Invalidation target after create/delete conversation mutations.
     */
    conversations: (
      projectWorkingId: string,
      pageNumber: number,
      pageSize: number,
    ) =>
      [
        "chat",
        "conversations",
        projectWorkingId,
        pageNumber,
        pageSize,
      ] as const,
    /**
     * Single conversation detail (first page of messages):
     *   `GET /api/chat/conversations/{id}?pageNumber=&pageSize=`.
     * Discriminators are `conversationId`, `pageNumber`, `pageSize`.
     */
    conversation: (
      conversationId: string,
      pageNumber: number,
      pageSize: number,
    ) =>
      [
        "chat",
        "conversation",
        conversationId,
        pageNumber,
        pageSize,
      ] as const,
  },
};