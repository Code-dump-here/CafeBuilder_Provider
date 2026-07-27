import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/homepage/homepage-reveal";

/**
 * "How it works" — 3-step horizontal timeline.
 *
 * Layout family: stepped timeline (single horizontal track with
 * numbered nodes). This family appears once on the page; the other
 * sections use a bento grid (why), 3-up role grid (roles), and a
 * full-bleed CTA band (final-cta) — each layout family unique.
 *
 * Anti-pattern checks:
 *   - Not three equal feature cards in a row — the steps share a
 *     horizontal connector line and a single 1-line label that
 *     reinforces sequence.
 *   - No eyebrow above the headline (eyebrow ration: hero counts as
 *     1, page has zero more).
 *   - No "Step 1 / Step 2 / Step 3" labels — we use verb-noun labels
 *     ("Post", "Match", "Build") per the "no generic step labels"
 *     rule.
 */
export function HomepageHowItWorks() {
  const t = useTranslations("HomePage.howItWorks");

  return (
    <section className="bg-muted/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal as="h2" className="max-w-2xl font-heading text-3xl leading-[1.1] tracking-tight text-foreground md:text-4xl">
          {t("title")}
        </Reveal>

        <ol className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {([0, 1, 2] as const).map((index) => {
            // next-intl arrays come back as unknown[] at the type
            // level; cast to the shape we authored in i18n keys.
            const items = t.raw("steps") as Array<{
              label: string;
              title: string;
              body: string;
            }>;
            const step = items[index]!;
            return (
              <Reveal key={step.label} delay={index * 80} as="li" className="group relative flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {step.label}
                  </span>
                  <span aria-hidden className="h-px flex-1 bg-border" />
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="font-heading text-xl text-foreground md:text-2xl">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
                <ArrowUpRight
                  aria-hidden
                  className="mt-1 size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-safe:duration-300"
                />
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}