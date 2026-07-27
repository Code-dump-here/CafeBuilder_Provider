import * as React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/homepage/homepage-reveal";
import { HomepageHeroVisual } from "@/components/homepage/homepage-hero-visual";

/**
 * Hero for the marketing landing page.
 *
 * Layout — asymmetric split:
 *   - Left column (text) anchors the headline, sub, and CTA pair.
 *     Aligned to the left rail, not centered — variance > 4 forbids
 *     centered heroes by default.
 *   - Right column (visual) holds a layered "brief card stack" mockup
 *     that hints at the platform surface. It sits offset down/right
 *     on desktop so the headline does not fight with it.
 *
 * Hero stack discipline:
 *   - Eyebrow (1 line, mono-uppercase).
 *   - Headline (max 2 lines on desktop).
 *   - Subtext (max 20 words).
 *   - CTAs (1 primary, 1 secondary).
 *   No trust strip, no scroll cue, no version badge, no "Used by" logo
 *   wall — those belong in their own sections (and we render none
 *   here; the logo wall is omitted entirely because we have no real
 *   customer logos yet).
 *
 * Theme: warm neutral background (theme `--background`), espresso
 * accent (`--primary`). Hero text uses foreground tokens so it
 * inverts cleanly in dark mode without separate CSS.
 */
export function HomepageHero() {
  const t = useTranslations("HomePage.hero");
  const primaryHref = "/register";
  const secondaryHref = "/marketplace";

  return (
    <section className="relative overflow-hidden bg-background pt-14 pb-20 md:pt-20 md:pb-28 lg:pt-24 lg:pb-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
        {/* ── Left: copy column ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          <Reveal as="p" className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <Sparkles aria-hidden className="size-3.5 text-primary" />
            {t("eyebrow")}
          </Reveal>

          <Reveal
            as="h1"
            delay={80}
            className="font-heading text-4xl leading-[1.05] tracking-tight text-foreground md:text-5xl lg:text-6xl"
          >
            {t("headline")}
          </Reveal>

          <Reveal
            as="p"
            delay={160}
            className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            {t("sub")}
          </Reveal>

          <Reveal
            as="div"
            delay={220}
            className="flex flex-wrap items-center gap-3 pt-2"
          >
            <Button
              asChild
              size="2xl"
              className="h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-px"
            >
              <Link href={primaryHref}>
                {t("primaryCta")}
                <ArrowRight aria-hidden className="ms-2 size-4 rtl:rotate-180" />
              </Link>
            </Button>

            <Button
              asChild
              size="2xl"
              variant="outline"
              className="h-11 rounded-full border-border/70 bg-background px-5 text-sm font-medium text-foreground hover:bg-muted/40"
            >
              <Link href={secondaryHref}>{t("secondaryCta")}</Link>
            </Button>

            <span className="ms-1 text-xs text-muted-foreground">
              {t("hint")}
            </span>
          </Reveal>
        </div>

        {/* ── Right: visual column ──────────────────────────────────────── */}
        <div className="relative lg:col-span-5">
          <Reveal delay={120} className="relative">
            <HomepageHeroVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}