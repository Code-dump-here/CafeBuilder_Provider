"use client";

import * as React from "react";

import { MarketplaceFilterBar } from "@/components/marketplace/marketplace-filter-bar";
import { MarketplaceHero } from "@/components/marketplace/marketplace-hero";
import {
  MarketplaceGrid,
  MarketplacePagination,
} from "@/components/marketplace/marketplace-grid";
import {
  DEFAULT_FILTERS,
  type MarketplaceFilters,
} from "@/features/projects/marketplace-types";
import {
  useMarketplacePosts,
  useOpenMarketplacePostCount,
} from "@/features/projects/use-marketplace";

/**
 * Marketplace page — `/[locale]/(public)/projects`.
 *
 * Public browsing experience for design studios and contractors. Renders a
 * hero, a filter bar, a responsive card grid of posts, and pagination.
 *
 * - Lives under the `(public)` route group, so the shared `PublicLayout`
 *   already supplies the navbar + intl provider. No need to repeat them.
 * - Filter / sort / pagination state lives in `useState` here; the data
 *   layer is `useMarketplacePosts(filters)`, which derives a paged
 *   response. URL syncing is intentionally deferred until the backend
 *   lands (no need to ship search params today).
 */
export default function MarketplacePage() {
  const [filters, setFilters] =
    React.useState<MarketplaceFilters>(DEFAULT_FILTERS);

  const { data, isLoading, error, refetch } = useMarketplacePosts(filters);

  // Open count for the hero — fetched separately so the headline reflects
  // the platform's pulse rather than the user's current view.
  const openCount = useOpenMarketplacePostCount();

  const resetFilters = React.useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  const handlePageChange = (nextPage: number) => {
    setFilters((prev) => ({ ...prev, pageNumber: nextPage }));
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <MarketplaceHero openCount={openCount} />

      <div className="flex flex-col gap-5">
        <MarketplaceFilterBar
          filters={filters}
          onChange={setFilters}
          totalCount={data.totalItems}
        />

        <MarketplaceGrid
          posts={data.items}
          onClearFilters={resetFilters}
          isLoading={isLoading}
          error={error}
          onRetry={() => {
            void refetch();
          }}
        />

        {data.totalPages > 1 ? (
          <MarketplacePagination
            pageNumber={data.pageNumber}
            totalPages={data.totalPages}
            hasPrevious={data.hasPrevious}
            hasNext={data.hasNext}
            onPageChange={handlePageChange}
          />
        ) : null}
      </div>
    </div>
  );
}