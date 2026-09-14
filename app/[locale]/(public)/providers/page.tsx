"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Briefcase } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AppError } from "@/lib/http/errors";
import {
  ProviderCard,
  ProviderFilterBar,
  ProviderPagination,
} from "@/components/provider-profile";
import {
  DEFAULT_PROVIDER_FILTERS,
  type ServiceProviderProfileFilters,
} from "@/features/service-provider-profiles/api";
import { useServiceProviderProfiles } from "@/features/service-provider-profiles/use-providers";

/**
 * The owner-facing provider directory.
 *
 * Filter bar → responsive card grid → pagination. Sort is fixed
 * server-side by `AvgRating DESC, CreatedAt DESC` so verified, well-
 * rated providers float to the top of every page.
 *
 * State lives in this component so the filter bar and pagination
 * share the same `filters` object — toggling a filter resets
 * `pageNumber` to 1.
 */
export default function ProvidersPage() {
  const t = useTranslations("ProviderDirectory");

  const [filters, setFilters] =
    React.useState<ServiceProviderProfileFilters>(DEFAULT_PROVIDER_FILTERS);

  // Incremented by `handleReset` so the filter bar's debounced search
  // input snaps back to the new (empty) `filters.search` without us
  // having to setState inside an effect.
  const [resetKey, setResetKey] = React.useState(0);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useServiceProviderProfiles(filters);

  const handlePageChange = React.useCallback((nextPage: number) => {
    setFilters((prev) => ({ ...prev, pageNumber: nextPage }));
  }, []);

  const handleReset = React.useCallback(() => {
    setFilters({ ...DEFAULT_PROVIDER_FILTERS });
    setResetKey((k) => k + 1);
  }, []);

  const showSkeleton = isLoading;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <title>{t("meta.title")}</title>

      {/* Header */}
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      {/* Filter bar */}
      <ProviderFilterBar
        filters={filters}
        onChange={setFilters}
        totalCount={data.totalItems}
        resetKey={resetKey}
      />

      {/* Body */}
      {showSkeleton ? (
        <GridSkeleton />
      ) : isError ? (
        <ErrorState
          title={t("errors.title")}
          subtitle={t("errors.subtitle")}
          retryLabel={t("errors.retry")}
          message={
            error instanceof AppError && error.message
              ? error.message
              : t("errors.generic")
          }
          onRetry={() => {
            void refetch();
          }}
        />
      ) : data.items.length === 0 ? (
        <EmptyProvidersState onReset={handleReset} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>

          <ProviderPagination
            pageNumber={data.pageNumber}
            totalPages={data.totalPages}
            hasPrevious={data.hasPrevious}
            hasNext={data.hasNext}
            onPageChange={handlePageChange}
          />

          {isFetching ? (
            <p
              aria-live="polite"
              className="text-center text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              {t("refreshing")}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div
          key={idx}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <Skeleton className="h-28 w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyProvidersState({ onReset }: { onReset: () => void }) {
  const t = useTranslations("ProviderDirectory");
  return (
    <EmptyState
      icon={Briefcase}
      title={t("empty.title")}
      description={t("empty.description")}
      actionLabel={t("empty.action")}
      onAction={onReset}
    />
  );
}
