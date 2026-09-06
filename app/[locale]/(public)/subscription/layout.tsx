import * as React from "react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";

interface SubscriptionLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}

/**
 * Server-side metadata for the three payOS steps, mirroring the pricing
 * layout: `generateMetadata` cannot live in a `"use client"` file, and all
 * three pages are client components because they depend on React Query and
 * the query string.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const { locale: requested = "en" } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : "en";
  const t = await getTranslations({ locale, namespace: "Payments.checkout" });
  return { title: t("title") };
}

export default async function SubscriptionLayout({
  children,
  params,
}: SubscriptionLayoutProps) {
  const { locale: requested = "en" } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : "en";
  setRequestLocale(locale);
  return <>{children}</>;
}
