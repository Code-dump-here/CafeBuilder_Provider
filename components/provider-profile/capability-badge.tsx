"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Briefcase,
  Hammer,
  Pencil,
  ShieldCheck,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Capability } from "@/features/service-provider-profiles/api";

// ─── Capability pill ──────────────────────────────────────────────────────────

const CAPABILITY_ICON: Record<Capability, React.ComponentType<{ className?: string }>> = {
  designer: Pencil,
  constructor: Hammer,
  both: Briefcase,
};

/**
 * A single capability chip. Renders the matching icon + label, and
 * shows the `both` value as a neutral composite so it reads clearly
 * next to single-capability providers.
 */
export function CapabilityBadge({
  capability,
  className,
}: {
  capability: Capability;
  className?: string;
}) {
  const t = useTranslations("ProviderDirectory");
  const Icon = CAPABILITY_ICON[capability];
  const label = t(`capability.${capability}`);

  return (
    <Badge variant="secondary" className={cn("gap-1.5", className)}>
      <Icon aria-hidden className="size-3" />
      {label}
    </Badge>
  );
}

// ─── Verified pill ────────────────────────────────────────────────────────────

/**
 * The admin-set "verified" indicator. Hidden entirely when the
 * provider isn't verified, so it never renders as a confusing "No"
 * badge.
 */
export function VerifiedPill({
  isVerified,
  label,
  className,
}: {
  isVerified: boolean;
  label?: string;
  className?: string;
}) {
  if (!isVerified) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-muted px-2 py-0.5 text-2xs font-medium text-success-muted-foreground",
        className,
      )}
    >
      <ShieldCheck aria-hidden className="size-3" />
      {label}
    </span>
  );
}

// ─── Rating stars ─────────────────────────────────────────────────────────────

/**
 * Read-only rating rendering. Shows the value to one decimal and a
 * count of reviews beside the stars when provided.
 *
 * Pass `value={null}` to render an empty state ("No ratings yet")
 * instead of a row of hollow stars.
 */
export function RatingStars({
  value,
  count,
  className,
  size = "sm",
}: {
  value: number | null;
  count?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const t = useTranslations("ProviderDirectory");
  const sizeClass =
    size === "lg" ? "size-5" : size === "md" ? "size-4" : "size-3.5";

  if (value === null || value === undefined) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {t("noRatings")}
      </span>
    );
  }

  const rounded = Math.round(value * 2) / 2;
  const full = Math.floor(rounded);
  const hasHalf = rounded - full >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="inline-flex items-center gap-0.5"
        aria-label={t("ratingValue", { rating: value })}
      >
        {Array.from({ length: full }).map((_, idx) => (
          <Star
            key={`f-${idx}`}
            aria-hidden
            className={cn(sizeClass, "fill-rating text-rating")}
          />
        ))}
        {hasHalf ? (
          // Sized in both directions: with only a width, the box was zero
          // tall, so its absolutely placed stars hung below the row and the
          // half star sat visibly lower than the whole ones.
          <span aria-hidden className={cn("relative inline-block", sizeClass)}>
            <Star
              className={cn(
                sizeClass,
                "absolute inset-0 text-muted-foreground/30",
              )}
            />
            <span className="absolute inset-0 w-1/2 overflow-hidden">
              <Star
                className={cn(
                  sizeClass,
                  "fill-rating text-rating",
                )}
              />
            </span>
          </span>
        ) : null}
        {Array.from({ length: empty }).map((_, idx) => (
          <Star
            key={`e-${idx}`}
            aria-hidden
            className={cn(sizeClass, "text-muted-foreground/30")}
          />
        ))}
      </span>
      <span className="text-xs font-semibold tabular-nums">
        {value.toFixed(1)}
      </span>
      {typeof count === "number" ? (
        <span className="text-xs text-muted-foreground">
          ({t("reviewCount", { count })})
        </span>
      ) : null}
    </span>
  );
}
