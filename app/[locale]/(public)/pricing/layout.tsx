import * as React from "react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";

interface PricingLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}

/**
 * Server-side title/description for `/pricing`.
 *
 * `generateMetadata` can't live in a `"use client"` file, so we host it
 * here in a thin Server Component wrapper. The page itself remains
 * client-side because the grid depends on React Query.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const { locale: requested = "en" } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : "en";
  const t = await getTranslations({ locale, namespace: "Payments.meta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function PricingLayout({
  children,
  params,
}: PricingLayoutProps) {
  const { locale: requested = "en" } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : "en";
  setRequestLocale(locale);
  return <>{children}</>;
}