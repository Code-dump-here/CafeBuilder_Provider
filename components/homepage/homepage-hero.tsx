import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/homepage/homepage-reveal";
import { FloorPlan } from "@/components/drawing-set/floor-plan";

/**
 * Hero for the marketing landing page — drawing-set direction.
 *
 * The previous hero was a competent version of the standard SaaS hero: a
 * sparkle-icon eyebrow, two blurred colour blobs for "atmosphere", pill
 * buttons, and tilted UI cards over random stock photos. None of it could only
 * belong to a product for building cafés.
 *
 * What replaces it comes from the work itself:
 * - The ground is drafting paper, fading out toward the edges so it reads as a
 *   sheet on a table rather than a pattern tiled across the page.
 * - The eyebrow is a sheet reference. Every set of drawings starts at A-000.
 * - The headline is Archivo at a condensed width — the proportion of lettering
 *   in a drawing title block — and the accent phrase sits on a dimension line,
 *   because the promise is literally about how long something takes.
 * - The visual is a plan that draws itself in and gets stamped APPROVED, which
 *   is the product's whole story in one image.
 * - Square buttons, like everything else in the system. The pills were the
 *   one place the homepage broke from `--radius: 0`.
 */
export function HomepageHero() {
  const t = useTranslations("HomePage.hero");
  const primaryHref = "/register";
  const secondaryHref = "/marketplace";

  const headline = t("headline");
  const accent = t("headlineAccent");
  const at = headline.indexOf(accent);

  return (
    <section className="relative overflow-hidden bg-background pt-14 pb-20 md:pt-20 md:pb-28 lg:pt-24 lg:pb-32">
      <div
        aria-hidden
        className="paper-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_75%_70%_at_60%_45%,black_35%,transparent_80%)]"
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8">
        {/* ── Copy ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-7 lg:col-span-6">
          <Reveal
            as="p"
            className="flex items-center gap-3 font-mono text-2xs uppercase tracking-[0.18em] text-muted-foreground"
          >
            <span className="border border-foreground/40 px-1.5 py-0.5 font-semibold text-foreground">
              A-000
            </span>
            <span aria-hidden className="h-px w-8 bg-foreground/30" />
            {t("eyebrow")}
          </Reveal>

          <Reveal
            as="h1"
            delay={80}
            className="font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.015em] text-foreground [font-stretch:72%] sm:text-6xl lg:text-[5.25rem]"
          >
            {at === -1 ? (
              headline
            ) : (
              <>
                {headline.slice(0, at)}
                <span className="dim-underline">{accent}</span>
                {headline.slice(at + accent.length)}
              </>
            )}
          </Reveal>

          <Reveal
            as="p"
            delay={160}
            className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            {t("sub")}
          </Reveal>

          <Reveal as="div" delay={220} className="flex flex-col gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="2xl" className="h-12 px-6 text-sm font-semibold shadow-e1">
                <Link href={primaryHref}>
                  {t("primaryCta")}
                  <ArrowRight aria-hidden className="ms-2 size-4 rtl:rotate-180" />
                </Link>
              </Button>
              <Button
                asChild
                size="2xl"
                variant="outline"
                className="h-12 border-foreground/30 bg-transparent px-5 text-sm font-medium hover:bg-foreground/5"
              >
                <Link href={secondaryHref}>{t("secondaryCta")}</Link>
              </Button>
            </div>
            <p className="font-mono text-2xs uppercase tracking-[0.12em] text-muted-foreground">
              {t("hint")}
            </p>
          </Reveal>
        </div>

        {/* ── Drawing ──────────────────────────────────────────────────────── */}
        <div className="lg:col-span-6">
          <FloorPlan />
        </div>
      </div>
    </section>
  );
}
