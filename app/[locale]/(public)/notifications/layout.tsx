import * as React from "react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";

interface NotificationsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const { locale: requested = "en" } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : "en";
  const t = await getTranslations({ locale, namespace: "Notifications.meta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function NotificationsLayout({
  children,
  params,
}: NotificationsLayoutProps) {
  const { locale: requested = "en" } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : "en";
  setRequestLocale(locale);
  return <>{children}</>;
}