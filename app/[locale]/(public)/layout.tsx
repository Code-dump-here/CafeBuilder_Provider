import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { hasLocale } from "next-intl";

import Navbar from "@/components/navbar/navbar";
import { ProfileGuard } from "@/components/auth/profile-guard";
import { routing } from "@/i18n/routing";
import { formats } from "@/i18n/formats";

interface PublicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}

/**
 * Public-facing layout — wraps any page that should use the marketing
 * navbar (rather than the role-based sidebar). Pages inside `(public)`
 * are reachable without authentication, but signed-in users with an
 * unfinished profile are routed into `/onboarding` via `ProfileGuard`
 * so they can't accidentally land on a marketing page mid-flow.
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
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="Asia/Ho_Chi_Minh"
      formats={formats}
    >
      <ProfileGuard>
        <div className="flex min-h-screen flex-col bg-background">
          <Navbar />
          <main className="flex-1">{children}</main>
        </div>
      </ProfileGuard>
    </NextIntlClientProvider>
  );
}