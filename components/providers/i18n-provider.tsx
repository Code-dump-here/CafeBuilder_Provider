"use client";

import { NextIntlClientProvider } from "next-intl";

interface I18nProviderProps {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, unknown>;
}

/**
 * Resolve a timezone for client-side formatters based on the active locale.
 * `next-intl`'s `useFormatter()` reads the global default; when none is set
 * (e.g. on the client), `format.dateTime()` throws `ENVIRONMENT_FALLBACK`.
 *
 * Mapping by locale keeps behaviour predictable until we wire per-user prefs.
 */
function resolveTimeZone(locale: string): string {
  switch (locale) {
    case "vi":
      return "Asia/Ho_Chi_Minh";
    default:
      return "Asia/Ho_Chi_Minh";
  }
}

export function I18nProvider({ children, locale, messages }: I18nProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={resolveTimeZone(locale)}
    >
      {children}
    </NextIntlClientProvider>
  );
}