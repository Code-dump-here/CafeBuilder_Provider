"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { MapPin } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  ServiceProviderProfileSummary,
} from "@/features/service-provider-profiles/api";
import { Stamp } from "@/components/drawing-set/stamp";
import { TitleBlock, TitleCell } from "@/components/drawing-set/title-block";

import { RatingStars } from "./capability-badge";

// ─── Card ─────────────────────────────────────────────────────────────────────

interface ProviderCardProps {
  provider: ServiceProviderProfileSummary;
  className?: string;
}

/**
 * Single provider entry in the directory, set as the cover sheet of a
 * drawing set rather than a social profile card.
 *
 * The previous card was an orange gradient banner with a round initials avatar
 * hanging off its edge — the pattern every generated directory uses, and one
 * that said nothing about the firm. A cover sheet states who the firm is and
 * its particulars in a ruled title block, which is what a provider scanning
 * the directory actually compares. A real cover photo still shows when the
 * firm uploaded one; without one there is no fake banner.
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

  const trade = [
    t(`capability.${provider.capability}`),
    provider.providerType === "company" ? t("card.company") : t("card.individual"),
  ].join(" · ");

  return (
    <Link
      href={`/providers/${provider.id}`}
      className={cn(
        "group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
        className,
      )}
      aria-label={provider.displayName}
    >
      <Card className="flex h-full flex-col gap-0 overflow-hidden py-0 transition-shadow duration-200 group-hover:ring-foreground/30">
        {provider.coverImageViewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={provider.coverImageViewUrl}
            alt=""
            className="h-28 w-full border-b border-border object-cover"
          />
        ) : null}

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            {/* A monogram in a ruled box, the way a firm's mark sits in a
                title block — not a gradient disc. */}
            <span
              aria-hidden
              className="grid size-11 shrink-0 place-items-center border border-foreground/25 bg-foreground/5 font-mono text-sm font-semibold text-foreground"
            >
              {initials}
            </span>
            {provider.isVerified ? (
              <Stamp size="sm" tone="success" seed={provider.id}>
                {t("card.verified")}
              </Stamp>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <p className="font-mono text-2xs uppercase tracking-[0.14em] text-muted-foreground">
              {trade}
            </p>
            <p className="sheet-title text-xl text-foreground group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
              {provider.displayName}
            </p>
          </div>

          {provider.portfolioHeadline ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {provider.portfolioHeadline}
            </p>
          ) : null}

          <RatingStars
            value={provider.reviewCount > 0 ? provider.avgRating : null}
            count={provider.reviewCount > 0 ? provider.reviewCount : undefined}
          />

          {provider.serviceAreas.length > 0 ? (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin aria-hidden className="mt-0.5 size-3 shrink-0" />
              <span>
                {provider.serviceAreas
                  .slice(0, 2)
                  .map((area) =>
                    area.district
                      ? `${area.district}, ${area.province}`
                      : area.province,
                  )
                  .join(" · ")}
              </span>
            </p>
          ) : null}
        </div>

        <TitleBlock className="mt-auto w-full border-x-0 border-b-0">
          <TitleCell label={t("card.cell.experience")} grow>
            {t("card.cell.years", { count: provider.yearsExperience ?? 0 })}
          </TitleCell>
          <TitleCell label={t("card.cell.joined")} grow>
            {joinedYear}
          </TitleCell>
        </TitleBlock>
      </Card>
    </Link>
  );
}
