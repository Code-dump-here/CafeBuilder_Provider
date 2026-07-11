"use client";

import * as React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  MarketplaceFilters,
  ServiceKind,
  SortOption,
  PostStatus,
} from "@/lib/projects/marketplace-types";

interface MarketplaceFilterBarProps {
  filters: MarketplaceFilters;
  onChange: (next: MarketplaceFilters) => void;
  /** Total items AFTER filtering (rendered as "X posts" in the heading). */
  totalCount: number;
}

const SERVICE_VALUES: Array<MarketplaceFilters["serviceKind"]> = [
  "all",
  "design",
  "construction",
  "both",
];

const STATUS_VALUES: Array<MarketplaceFilters["status"]> = [
  "all",
  "open",
  "closed",
  "draft",
];

const SORT_VALUES: Array<MarketplaceFilters["sort"]> = [
  "newest",
  "deadline",
  "budget_desc",
  "budget_asc",
];

/**
 * Sticky-ish filter bar for the marketplace.
 *
 * Layout: heading on the first row, then search + 3 selects (service /
 * status / sort). Designed to wrap on small viewports — the search grows,
 * the selects sit on a second row on phones.
 *
 * Reads the same `Marketplace.filters.*` translation block the rest of
 * the marketplace uses so copy stays in one place. Reset lives outside
 * the bar (rendered by the parent near the grid) so the action sits next
 * to the data it resets — keeping the bar compact.
 */
export function MarketplaceFilterBar({
  filters,
  onChange,
  totalCount,
}: MarketplaceFilterBarProps) {
  const t = useTranslations("Marketplace.filters");
  const tService = useTranslations("Marketplace.filters.serviceKind");
  const tStatus = useTranslations("Marketplace.filters.status");
  const tSort = useTranslations("Marketplace.filters.sort");
  const tGrid = useTranslations("Marketplace.grid");

  const update = React.useCallback(
    (patch: Partial<MarketplaceFilters>) => {
      // Any change resets the page so the user lands on page 1 of the new
      // result set rather than a stale page index.
      onChange({ ...filters, ...patch, pageNumber: 1 });
    },
    [filters, onChange],
  );

  return (
    <section
      aria-label={t("label")}
      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-3 sm:p-4"
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <SlidersHorizontal className="size-3.5" aria-hidden />
        {t("label")}
        <span className="ml-auto font-normal normal-case text-muted-foreground/80">
          {tGrid("count", { count: totalCount })}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-64">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            aria-label={t("searchPlaceholder")}
            placeholder={t("searchPlaceholder")}
            value={filters.query}
            onChange={(event) => update({ query: event.target.value })}
            className="pl-7"
          />
        </div>

        <Select
          value={filters.serviceKind}
          onValueChange={(value) =>
            update({ serviceKind: value as ServiceKind | "all" })
          }
        >
          <SelectTrigger aria-label={tService("label")} size="default">
            <SelectValue placeholder={tService("label")} />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {tService(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value) =>
            update({ status: value as PostStatus | "all" })
          }
        >
          <SelectTrigger aria-label={tStatus("label")} size="default">
            <SelectValue placeholder={tStatus("label")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {tStatus(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sort}
          onValueChange={(value) => update({ sort: value as SortOption })}
        >
          <SelectTrigger aria-label={tSort("label")} size="default">
            <SelectValue placeholder={tSort("label")} />
          </SelectTrigger>
          <SelectContent>
            {SORT_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {tSort(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}