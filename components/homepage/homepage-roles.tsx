import * as React from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

import { Reveal } from "@/components/homepage/homepage-reveal";

/**
 * "Roles" — 3-up grid showing one side per role.
 *
 * Layout family: 3-column role grid (different from the bento above
 * and the timeline in "how it works"). Each column gets:
 *   - a small role label (no eyebrow above section headline).
 *   - a 1-sentence blurb.
 *   - 4 bullet capabilities.
 *
 * Anti-pattern checks:
 *   - Not three identical "feature cards" — each column is a role
 *     perspective, not a feature claim.
 *   - No em-dashes.
 *   - No generic step labels.
 */
export function HomepageRoles() {
  const t = useTranslations("HomePage.roles");

  const items = t.raw("items") as Array<{
    role: string;
    blurb: string;
    bullets: string[];
  }>;

  return (
    <section className="bg-muted/30 py-20 md:py-28">
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

        <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {items.map((role, index) => (
            <Reveal
              key={role.role}
              as="li"
              delay={120 + index * 80}
              className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-6 transition-transform motion-safe:hover:-translate-y-0.5 md:p-7"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-heading text-xl text-foreground md:text-2xl">
                  {role.role}
                </h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  0{index + 1}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {role.blurb}
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {role.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <Check
                      aria-hidden
                      className="mt-0.5 size-3.5 shrink-0 text-primary"
                      strokeWidth={2.5}
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}