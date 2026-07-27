import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/homepage/homepage-reveal";

/**
 * Final CTA — full-bleed dark band that anchors the bottom of the
 * landing page.
 *
 * Layout family: full-width inverted band (only place on the page
 * where the foreground/background pair flips — gives the eye a
 * single clear "stop and act" moment).
 *
 * Theme: uses `bg-foreground text-background` so it inherits the
 * theme tokens — works in both light and dark modes without bespoke
 * color rules.
 */
export function HomepageFinalCta() {
  const t = useTranslations("HomePage.finalCta");
  const footerT = useTranslations("HomePage.footer");

  return (
    <section className="bg-foreground py-20 text-background md:py-28">
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal as="h2" className="font-heading text-3xl leading-[1.1] tracking-tight md:text-5xl">
          {t("title")}
        </Reveal>
        <Reveal
          delay={80}
          as="p"
          className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-background/75 md:text-base"
        >
          {t("body")}
        </Reveal>
        <Reveal
          delay={160}
          as="div"
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Button
            asChild
            size="2xl"
            className="h-11 rounded-full bg-background px-6 text-sm font-semibold text-foreground hover:bg-background/90"
          >
            <Link href="/register">
              {t("primaryCta")}
              <ArrowRight aria-hidden className="ms-2 size-4 rtl:rotate-180" />
            </Link>
          </Button>
          <Button
            asChild
            size="2xl"
            variant="outline"
            className="h-11 rounded-full border-background/30 bg-transparent px-5 text-sm font-medium text-background hover:bg-background/10"
          >
            <Link href="/marketplace">{t("secondaryCta")}</Link>
          </Button>
        </Reveal>
      </div>

      <div className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="border-t border-background/15 pt-6 text-center text-xs text-background/60">
          {footerT("line")}
        </p>
      </div>
    </section>
  );
}