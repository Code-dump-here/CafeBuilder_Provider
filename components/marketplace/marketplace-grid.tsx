"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { MarketplacePostCard } from "./marketplace-post-card";
import type { MarketplacePost } from "@/lib/projects/marketplace-types";

interface MarketplaceGridProps {
  posts: MarketplacePost[];
  onClearFilters?: () => void;
  /** Render a skeleton block (typically while the first request is in flight). */
  isLoading?: boolean;
  /** Render an error block with a retry CTA. */
  error?: Error | null;
  /** Called when the user clicks "Try again" in the error block. */
  onRetry?: () => void;
  className?: string;
}

/**
 * Responsive grid of `MarketplacePostCard`s. Falls back to a friendly empty
 * state when `posts.length === 0`. Pagination is handled by the parent so
 * the grid can stay presentation-only.
 *
 * Loading and error states are intentionally lightweight — the page is
 * already inside a tab that uses `keepPreviousData`, so a true "first
 * paint" only happens once per session; on subsequent filter changes we
 * want the previous content to stay visible.
 */
export function MarketplaceGrid({
  posts,
  onClearFilters,
  isLoading,
  error,
  onRetry,
  className,
}: MarketplaceGridProps) {
  const t = useTranslations("Marketplace.grid.empty");
  const tHeading = useTranslations("Marketplace.grid");
  const tError = useTranslations("Marketplace.grid.error");

  if (isLoading) {
    return <MarketplaceGridSkeleton className={className} />;
  }

  if (error) {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center",
          className,
        )}
      >
        <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            {tError("title")}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {tError("subtitle")}
          </p>
        </div>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-1"
          >
            {tError("retry")}
          </Button>
        ) : null}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 py-16 text-center",
          className,
        )}
      >
        <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <Inbox className="size-5" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{t("title")}</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        {onClearFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="mt-1"
          >
            {t("cta")}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <section
      aria-label={tHeading("heading")}
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5",
        className,
      )}
    >
      {posts.map((post) => (
        <MarketplacePostCard key={post.id} post={post} />
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton — mirrors the post-card footprint so the layout doesn't
// jump when real cards mount.

function MarketplaceGridSkeleton({ className }: { className?: string }) {
  return (
    <section
      aria-busy
      aria-live="polite"
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5",
        className,
      )}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-12 animate-pulse rounded-lg bg-muted/60" />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" aria-hidden />
        <span>Loading…</span>
      </div>
    </div>
  );
}

interface MarketplacePaginationProps {
  pageNumber: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPageChange: (next: number) => void;
  className?: string;
}

export function MarketplacePagination({
  pageNumber,
  totalPages,
  hasPrevious,
  hasNext,
  onPageChange,
  className,
}: MarketplacePaginationProps) {
  const t = useTranslations("Marketplace.pagination");

  // Build the visible page numbers: 1, …, current-1, current, current+1, …, last.
  const visible = React.useMemo<number[]>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const set = new Set<number>([1, totalPages, pageNumber]);
    for (let i = pageNumber - 1; i <= pageNumber + 1; i += 1) {
      if (i > 1 && i < totalPages) set.add(i);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [pageNumber, totalPages]);

  return (
    <nav
      aria-label={t("label")}
      className={cn(
        "flex flex-col items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3 sm:flex-row",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        {t("page", { page: pageNumber, total: totalPages })}
      </p>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!hasPrevious}
          className="gap-1 px-2"
        >
          <ChevronLeft className="size-3" aria-hidden />
          <ChevronLeft className="-ml-3 size-3" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(pageNumber - 1)}
          disabled={!hasPrevious}
          className="gap-1"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          {t("previous")}
        </Button>

        {visible.map((page, index) => {
          const prev = visible[index - 1];
          const gap = prev !== undefined && page - prev > 1;
          return (
            <React.Fragment key={page}>
              {gap ? (
                <span
                  aria-hidden
                  className="px-1 text-xs text-muted-foreground/60"
                >
                  …
                </span>
              ) : null}
              <Button
                type="button"
                variant={page === pageNumber ? "default" : "ghost"}
                size="sm"
                onClick={() => onPageChange(page)}
                aria-current={page === pageNumber ? "page" : undefined}
                className="size-8 p-0 text-xs"
              >
                {page}
              </Button>
            </React.Fragment>
          );
        })}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(pageNumber + 1)}
          disabled={!hasNext}
          className="gap-1"
        >
          {t("next")}
          <ChevronRight className="size-3.5" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNext}
          className="gap-1 px-2"
        >
          <ChevronRight className="size-3" aria-hidden />
          <ChevronRight className="-ml-3 size-3" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}