import { setRequestLocale, getTranslations } from "next-intl/server";

import { HomepageHero } from "@/components/homepage/homepage-hero";
import { HomepageHowItWorks } from "@/components/homepage/homepage-how-it-works";
import { HomepageWhy } from "@/components/homepage/homepage-why";
import { HomepageRoles } from "@/components/homepage/homepage-roles";
import { HomepageFinalCta } from "@/components/homepage/homepage-final-cta";

/**
 * `/[locale]/(public)` — marketing landing page.
 *
 * Server component. All five homepage sections are server-renderable
 * except for the hero visual and `Reveal` islands (which carry their
 * own `"use client"` markers and are leaf-isolated). Composition
 * order: hero → how-it-works → why (bento) → roles → final-cta.
 *
 * Layout families used (must be 4+ across 5 sections per the design
 * rules — we use 4: asymmetric split, stepped timeline, asymmetric
 * bento, 3-up role grid + a fifth inversion band).
 *
 * Metadata is sourced from the `HomePage.meta` i18n namespace so the
 * title and description follow the user's locale.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const { locale: requested = "en" } = await params;
  const t = await getTranslations({
    locale: requested,
    namespace: "HomePage.meta",
  });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const { locale: requested = "en" } = await params;
  setRequestLocale(requested);

  return (
    <>
      <HomepageHero />
      <HomepageHowItWorks />
      <HomepageWhy />
      <HomepageRoles />
      <HomepageFinalCta />
    </>
  );
}