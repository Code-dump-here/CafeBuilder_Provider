"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Building2,
  MapPin,
  Star,
  UserCircle2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  ServiceProviderProfileSummary,
} from "@/features/service-provider-profiles/api";

import { CapabilityBadge, RatingStars, VerifiedPill } from "./capability-badge";

// ─── Card ─────────────────────────────────────────────────────────────────────

interface ProviderCardProps {
  provider: ServiceProviderProfileSummary;
  className?: string;
}

/**
 * Single provider entry in the directory list. The whole card is a
 * link to the public detail page; hover lifts the border so it reads
 * as clickable. Owners come here to scan many providers quickly, so
 * the card is intentionally compact — bio, location and a snippet of
 * the headline sit in one fold.
 */
export function ProviderCard({ provider, className }: ProviderCardProps) {
  const t = useTranslations("ProviderDirectory");
  const locale = useLocale();

  const initials = provider.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const joinedYear = new Date(provider.createdAt).toLocaleDateString(
    locale === "vi" ? "vi-VN" : "en-US",
    { year: "numeric" },
  );

  return (
    <Link
      href={`/providers/${provider.id}`}
      className={cn(
        "group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 rounded-2xl",
        className,
      )}
      aria-label={provider.displayName}
    >
      <Card className="h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md">
        {/* Cover hero */}
        <div className="relative h-28 w-full bg-linear-to-br from-amber-600 via-amber-500 to-orange-500">
          {provider.coverImageViewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={provider.coverImageViewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, white 0%, transparent 40%), radial-gradient(circle at 80% 80%, white 0%, transparent 40%)",
              }}
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />

          {/* Avatar */}
          <div className="absolute -bottom-8 left-4">
            <div className="grid size-16 place-items-center rounded-full border-4 border-background bg-linear-to-br from-amber-500 to-orange-600 text-base font-bold text-white shadow-md">
              {initials}
            </div>
          </div>

          {/* Verified badge */}
          {provider.isVerified ? (
            <div className="absolute right-3 top-3">
              <VerifiedPill
                isVerified
                label={t("card.verified")}
              />
            </div>
          ) : null}
        </div>

        <CardContent className="flex flex-col gap-3 px-4 pb-4 pt-10">
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-1.5 text-base font-semibold leading-tight">
              {provider.displayName}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <CapabilityBadge capability={provider.capability} />
              {provider.providerType === "company" ? (
                <Badge variant="outline" className="gap-1">
                  <Building2 aria-hidden className="size-3" />
                  {t("card.company")}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <UserCircle2 aria-hidden className="size-3" />
                  {t("card.individual")}
                </Badge>
              )}
            </div>
          </div>

          {provider.portfolioHeadline ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {provider.portfolioHeadline}
            </p>
          ) : null}

          <RatingStars
            value={provider.avgRating}
            count={provider.reviewCount}
          />

          {provider.serviceAreas.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin aria-hidden className="size-3" />
              {provider.serviceAreas
                .slice(0, 2)
                .map((area) =>
                  area.district
                    ? `${area.district}, ${area.province}`
                    : area.province,
                )
                .join(" · ")}
            </div>
          ) : null}

          <div className="mt-auto flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star aria-hidden className="size-3" />
              {t("card.yearsExperience", {
                count: provider.yearsExperience ?? 0,
              })}
            </span>
            <span>{t("card.joined", { year: joinedYear })}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
