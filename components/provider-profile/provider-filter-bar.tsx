"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  ServiceProviderProfileFilters,
} from "@/features/service-provider-profiles/api";

interface ProviderFilterBarProps {
  filters: ServiceProviderProfileFilters;
  onChange: (next: ServiceProviderProfileFilters) => void;
  totalCount: number;
  /**
   * Increment whenever the parent wants the local search input to
   * reset to match the new `filters.search`. Used by the
   * "Clear filters" button on the page, which can't directly
   * touch the input state.
   */
  resetKey?: number;
  className?: string;
}

/**
 * The owner-facing filter strip above the provider grid.
 *
 * Three knobs:
 * - free-text search (over display name)
 * - capability filter (designer / constructor / all — `both` is
 *   rolled up under each individual capability server-side, so we
 *   don't expose it as a chip)
 * - "verified only" toggle
 *
 * Filter changes reset `pageNumber` to 1; pagination is owned by the
 * page, not by this bar.
 */
export function ProviderFilterBar({
  filters,
  onChange,
  totalCount,
  resetKey,
  className,
}: ProviderFilterBarProps) {
  const t = useTranslations("ProviderDirectory");

  // Local search input — debounced on commit so the request URL doesn't
  // change on every keystroke. The parent passes `searchResetKey` so
  // we can remount the input (with a fresh initial value) whenever
  // the parent resets the search from outside (e.g. via the
  // "Clear filters" button).
  const [searchInput, setSearchInput] = React.useState(filters.search ?? "");

  const commitSearch = React.useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed === (filters.search ?? "")) return;
      onChange({ ...filters, search: trimmed, pageNumber: 1 });
    },
    [filters, onChange],
  );

  const setCapability = (next: string) => {
    // The SelectItem keys are exactly "all" | "designer" | "constructor".
    // `Capability` is wider (it includes "both") so we narrow on the
    // way down.
    const value = (next === "all" || next === "designer" || next === "constructor")
      ? next
      : "all";
    onChange({ ...filters, capability: value, pageNumber: 1 });
  };

  const toggleVerifiedOnly = () => {
    const nextIsVerified: boolean | null =
      filters.isVerified === true ? null : true;
    onChange({ ...filters, isVerified: nextIsVerified, pageNumber: 1 });
  };

  const handleReset = () => {
    onChange({
      ...filters,
      search: "",
      capability: "all",
      isVerified: null,
      pageNumber: 1,
    });
  };

  const hasActiveFilters =
    (filters.search && filters.search.length > 0) ||
    (filters.capability && filters.capability !== "all") ||
    filters.isVerified === true;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <form
        key={resetKey ?? "search"}
        className="relative flex w-full max-w-sm items-center"
        onSubmit={(e) => {
          e.preventDefault();
          commitSearch(searchInput);
        }}
      >
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
        />
        <Input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onBlur={() => commitSearch(searchInput)}
          placeholder={t("filter.searchPlaceholder")}
          className="pl-9 pr-9"
          aria-label={t("filter.searchLabel")}
        />
        {searchInput.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              commitSearch("");
            }}
            className="absolute right-2 grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("filter.clearSearch")}
          >
            <X aria-hidden className="size-3.5" />
          </button>
        ) : null}
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.capability ?? "all"}
          onValueChange={setCapability}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("capability.all")}</SelectItem>
            <SelectItem value="designer">{t("capability.designer")}</SelectItem>
            <SelectItem value="constructor">
              {t("capability.constructor")}
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant={filters.isVerified === true ? "default" : "outline"}
          size="sm"
          onClick={toggleVerifiedOnly}
          aria-pressed={filters.isVerified === true}
        >
          {t("filter.verifiedOnly")}
        </Button>

        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            <X aria-hidden className="size-3.5" />
            {t("filter.reset")}
          </Button>
        ) : null}

        <span className="ml-1 text-xs text-muted-foreground">
          {t("filter.totalCount", { count: totalCount })}
        </span>
      </div>
    </div>
  );
}
