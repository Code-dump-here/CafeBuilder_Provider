import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Reveal } from "@/components/homepage/homepage-reveal";
import { cn } from "@/lib/utils";

type TileTone = "amber" | "ink" | "stone" | "moss";

const TONE_BACKGROUND: Record<TileTone, string> = {
  amber:
    "bg-[oklch(0.95_0.04_75)] dark:bg-[oklch(0.26_0.05_55)] text-foreground",
  ink: "bg-foreground text-background dark:bg-foreground dark:text-background",
  stone:
    "bg-card border border-border/60 text-foreground",
  moss:
    "bg-[oklch(0.94_0.04_155)] dark:bg-[oklch(0.24_0.05_155)] text-foreground",
};

const TONE_FOREGROUND: Record<TileTone, string> = {
  amber: "text-foreground",
  ink: "text-background",
  stone: "text-foreground",
  moss: "text-foreground",
};

/**
 * "Why" — asymmetric bento grid (4 cells, no equal thirds).
 *
 * Layout family: 2 + 1 + 1 asymmetric bento:
 *   ┌───────────────────────┬──────────────┐
 *   │ Tile 1 (amber, image) │ Tile 2 (ink)  │
 *   │                       ├──────────────┤
 *   │                       │ Tile 3       │
 *   ├─────────┬─────────────┴──────────────┤
 *   │ Tile 4  │ Tile 5 (moss, full width)  │
 *   └─────────┴────────────────────────────┘
 *
 * Wait — we have 4 tiles, not 5. Use a tighter 2x2 with offset:
 *   ┌───────────────────────┬──────────────┐
 *   │ Tile 1 (hero, image)  │ Tile 2 (ink) │
 *   ├──────────┬────────────┴──────────────┤
 *   │ Tile 3   │ Tile 4 (moss)            │
 *   └──────────┴──────────────────────────┘
 *
 * Anti-pattern checks:
 *   - Not 3-equal-cards (banned).
 *   - At least 2 of 4 cells have real visual variation (Tile 1 has a
 *     real photo, Tile 2 inverts to dark mode-foreground, Tile 4
 *     uses a brand-tinted background). The fourth stays neutral.
 *   - Bento cell count matches content count exactly (4 tiles → 4
 *     cells, no empty cells).
 *   - No eyebrow above the section headline.
 */
export function HomepageWhy() {
  const t = useTranslations("HomePage.why");

  const items = t.raw("tiles") as Array<{
    title: string;
    body: string;
    tone: TileTone;
  }>;

  return (
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal as="h2" className="max-w-2xl font-heading text-3xl leading-[1.1] tracking-tight text-foreground md:text-4xl">
          {t("title")}
        </Reveal>
        <Reveal
          delay={80}
          as="p"
          className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base"
        >
          {t("subtitle")}
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-12 md:grid-rows-2 md:gap-4">
          {/* Tile 1 — hero tile with photograph. Spans 7/12 cols, 2 rows on md+. */}
          <Reveal
            delay={120}
            className={cn(
              "group relative overflow-hidden rounded-2xl p-6 md:col-span-7 md:row-span-2 md:p-8",
              TONE_BACKGROUND[items[0]!.tone],
            )}
          >
            <div className="relative z-10 flex h-full flex-col justify-between gap-6">
              <div className="flex flex-col gap-2">
                <h3 className={cn("font-heading text-2xl md:text-3xl", TONE_FOREGROUND[items[0]!.tone])}>
                  {items[0]!.title}
                </h3>
                <p
                  className={cn(
                    "max-w-md text-sm leading-relaxed",
                    items[0]!.tone === "ink"
                      ? "text-background/80"
                      : "text-muted-foreground",
                  )}
                >
                  {items[0]!.body}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">
                  Live in platform
                </span>
              </div>
            </div>
            <div className="absolute inset-0 z-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://picsum.photos/seed/cafe-blueprint-sketch/1080/720"
                alt=""
                width={1080}
                height={720}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover opacity-30 mix-blend-multiply transition-transform duration-700 motion-safe:group-hover:scale-[1.03] dark:mix-blend-screen dark:opacity-20"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-background/40 via-transparent to-transparent" />
            </div>
          </Reveal>

          {/* Tile 2 — ink-toned, top-right. Spans 5/12 cols, 1 row. */}
          <Reveal
            delay={180}
            className={cn(
              "relative overflow-hidden rounded-2xl p-6 md:col-span-5 md:row-span-1 md:p-7",
              TONE_BACKGROUND[items[1]!.tone],
            )}
          >
            <h3
              className={cn(
                "font-heading text-xl md:text-2xl",
                TONE_FOREGROUND[items[1]!.tone],
              )}
            >
              {items[1]!.title}
            </h3>
            <p
              className={cn(
                "mt-3 max-w-sm text-sm leading-relaxed",
                items[1]!.tone === "ink"
                  ? "text-background/80"
                  : "text-muted-foreground",
              )}
            >
              {items[1]!.body}
            </p>
          </Reveal>

          {/* Tile 3 — neutral card, bottom-right. Spans 3/12 cols, 1 row. */}
          <Reveal
            delay={240}
            className={cn(
              "relative overflow-hidden rounded-2xl p-6 md:col-span-3 md:row-span-1 md:p-7",
              TONE_BACKGROUND[items[2]!.tone],
            )}
          >
            <h3 className={cn("font-heading text-lg md:text-xl", TONE_FOREGROUND[items[2]!.tone])}>
              {items[2]!.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {items[2]!.body}
            </p>
          </Reveal>

          {/* Tile 4 — moss-tinted with photograph. Spans 2/12 cols, 1 row. */}
          <Reveal
            delay={300}
            className={cn(
              "group relative overflow-hidden rounded-2xl md:col-span-2 md:row-span-1",
              TONE_BACKGROUND[items[3]!.tone],
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://picsum.photos/seed/cafe-construction-progress/600/600"
              alt=""
              width={600}
              height={600}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-multiply transition-transform duration-700 motion-safe:group-hover:scale-[1.04] dark:mix-blend-screen dark:opacity-30"
            />
            <div className="relative z-10 flex h-full flex-col justify-end gap-2 p-5 md:p-6">
              <h3 className={cn("font-heading text-base md:text-lg", TONE_FOREGROUND[items[3]!.tone])}>
                {items[3]!.title}
              </h3>
              <p className="text-[12px] leading-relaxed text-foreground/80">
                {items[3]!.body}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}