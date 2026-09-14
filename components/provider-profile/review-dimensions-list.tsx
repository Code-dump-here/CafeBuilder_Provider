"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { ProviderRatingDimensions } from "@/features/service-provider-profiles/rating-summary";
import { isReviewDimension } from "@/features/projects/review-dimensions";

interface ReviewDimensionsProps {
  dimensions: ProviderRatingDimensions;
  /** Compact = single line per dimension; full = labelled row with a bar. */
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Render a per-dimension average rating, sorted by canonical order.
 * Backend may send fewer keys than the canonical set; unknown keys
 * are dropped at the API boundary so this list stays predictable.
 */
export function ReviewDimensionsList({
  dimensions,
  variant = "full",
  className,
}: ReviewDimensionsProps) {
  const t = useTranslations("ProviderDirectory");

  // Canonical spec order (§4.5). Anything else is dropped at the API
  // boundary, so this list stays stable even if the backend response
  // shape shifts.
  const order = [
    "progress",
    "quality",
    "communication",
    "cost",
    "professionalism",
  ] as const;

  const entries = Object.entries(dimensions)
    .filter(([key]) => isReviewDimension(key))
    .sort(([a], [b]) =>
      order.indexOf(a as (typeof order)[number]) -
      order.indexOf(b as (typeof order)[number]),
    );

  if (entries.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        {t("dimensions.empty")}
      </p>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex items-center justify-between text-xs"
          >
            <span className="text-muted-foreground">
              {t(`dimensions.${key}`)}
            </span>
            <span className="font-medium tabular-nums">
              {value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {entries.map(([key, value]) => {
        const pct = Math.max(0, Math.min(100, (value / 5) * 100));
        return (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {t(`dimensions.${key}`)}
              </span>
              <span className="font-semibold tabular-nums">
                {value.toFixed(1)} / 5
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                aria-hidden
                className="h-full rounded-full bg-rating transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
