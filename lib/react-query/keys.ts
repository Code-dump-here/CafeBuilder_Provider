export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
    account: () => ["auth", "account"] as const,
  },
  users: {
    detail: (id: string) => ["users", "detail", id] as const,
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
      briefId: number,
      page: { pageNumber: number; pageSize: number },
    ) => ["projects", "aiRecommendations", briefId, page.pageNumber, page.pageSize] as const,
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
};