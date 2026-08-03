"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

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

// ---------------------------------------------------------------------------
// Page component
//
// Renders the marketplace landing page:
//   1. Hero — sets context + open-brief stat from the live API.
//   2. Filter bar — search + service / status / sort + reset.
//   3. Grid — responsive post cards (skeleton while loading, error block on
//      failure, empty state when filters return nothing).
//   4. Pagination — first / prev / numbers / next / last.
//
// Filter + page state live in this component; the page is the only owner
// of `useMarketplacePosts` so pagination resets when filters change.

export default function MarketplacePage() {
  const t = useTranslations("Marketplace");

  const [filters, setFilters] =
    React.useState<MarketplaceFilters>(DEFAULT_FILTERS);

  const { data, isLoading, isFetching, error, refetch } =
    useMarketplacePosts(filters);

  const openCount = useOpenMarketplacePostCount();

  // Show the full-page skeleton only on the very first load. After data is
  // present, `keepPreviousData` keeps the previous page visible while the
  // next request is in flight — the only visual change is a subtle "Loading"
  // hint inside the grid footer.
  const showSkeleton = isLoading;

  const handlePageChange = React.useCallback((nextPage: number) => {
    setFilters((prev) => ({ ...prev, pageNumber: nextPage }));
  }, []);

  const handleResetFilters = React.useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <title>{t("meta.title")}</title>

      <MarketplaceHero openCount={openCount} />

      <div className="flex flex-col gap-5">
        <MarketplaceFilterBar
          filters={filters}
          onChange={setFilters}
          totalCount={data.totalItems}
        />

        <MarketplaceGrid
          posts={data.items}
          onClearFilters={handleResetFilters}
          isLoading={showSkeleton}
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

        {/* Subtle indicator for background refreshes after the first load. */}
        {isFetching && !isLoading ? (
          <p
            aria-live="polite"
            className="text-center text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            Refreshing…
          </p>
        ) : null}
      </div>
    </div>
  );
}