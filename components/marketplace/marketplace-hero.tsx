"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { SHEET, SheetTitle } from "@/components/drawing-set/sheet-title";

interface MarketplaceHeroProps {
  /**
   * Total open briefs across the whole catalogue (not the current page).
   * Surfaced as the headline stat next to the title so the hero feels
   * "live".
   */
  openCount: number;
}

/**
 * Hero strip at the top of the marketplace page. Sells the page at a
 * glance: eyebrow tag + headline + one-line value prop + an open-brief
 * stat. Pure presentational — scrolling / CTAs are the page's job.
 *
 * Reads the shared `Marketplace.hero.*` translation block so the copy
 * stays consistent with the rest of the marketplace surfaces.
 */
export function MarketplaceHero({ openCount }: MarketplaceHeroProps) {
  const t = useTranslations("Marketplace.hero");
  const tStats = useTranslations("Marketplace.hero.stats");

  return (
    <section className="relative border-b border-border/60 pb-6">
      <div className="flex flex-col gap-3">
        <SheetTitle
          sheet={SHEET.marketplace}
          label={t("eyebrow")}
          className="text-balance"
        >
          {t("title")}
        </SheetTitle>

        <p className="max-w-2xl text-sm/relaxed text-muted-foreground">
          {t("subtitle")}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {openCount} {tStats("open")}
          </span>
          <span aria-hidden className="text-muted-foreground/40">·</span>
          <span>{tStats("designers")}</span>
          <span aria-hidden className="text-muted-foreground/40">·</span>
          <span>{tStats("contractors")}</span>
        </div>
      </div>
    </section>
  );
}