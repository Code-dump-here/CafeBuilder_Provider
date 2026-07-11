import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { hasLocale } from "next-intl";

import Navbar from "@/components/navbar/navbar";
import { routing } from "@/i18n/routing";

interface PublicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}

/**
 * Public-facing layout — wraps any page that should use the marketing
 * navbar (rather than the role-based sidebar). Pages inside `(public)`
 * are reachable without authentication.
 */
export default async function PublicLayout({
  children,
  params,
}: PublicLayoutProps) {
  const { locale: requested = "en" } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : "en";
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex-1">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}