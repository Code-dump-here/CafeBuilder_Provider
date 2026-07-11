export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
    account: () => ["auth", "account"] as const,
  },
  users: {
    detail: (id: string) => ["users", "detail", id] as const,
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