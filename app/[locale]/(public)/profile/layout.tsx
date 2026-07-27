import * as React from "react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";

interface ProfileLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}

/**
 * Server-side title/description for `/profile`.
 *
 * Putting `generateMetadata` next to the client page would be a server
 * boundary inside a `"use client"` file, which Next.js doesn't allow.
 * The layout is a natural Server Component home for it; the page
 * itself stays client because the form below depends on React Query.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const { locale: requested = "en" } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : "en";
  const t = await getTranslations({ locale, namespace: "Profile.meta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

/**
 * Thin locale-providing wrapper. The `(public)` layout above already
 * establishes the `NextIntlClientProvider`, so we only need to call
 * `setRequestLocale` for this subtree to keep static rendering working.
 */
export default async function ProfileLayout({
  children,
  params,
}: ProfileLayoutProps) {
  const { locale: requested = "en" } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : "en";
  setRequestLocale(locale);
  return <>{children}</>;
}
