import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { hasLocale } from "next-intl";
import "../globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { DemoModeBanner } from "@/components/providers/demo-mode-banner";
import Providers from "./providers";
import { buildThemeInitScript } from "@/lib/theme-init";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  // Left at the create-next-app defaults until now, so every tab read
  // "Create Next App". No `template` here: the handful of pages that set
  // their own title already carry the product name ("Pricing —
  // SmartCafeBuilder"), and a suffix would brand them twice.
  title: "CafeBuilder",
  description:
    "Plan, design and build out a coffee shop — shop owners, designers and contractors in one workspace.",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}>) {
  const { locale: requested = "en" } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : "en";
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        plusJakartaSans.variable,
        "font-sans",
      )}
    >
      <head>
        {/*
          Applies the persisted theme BEFORE first paint. This has to be
          server-rendered and inline: the script previously lived in a
          `useEffect` inside ThemeProvider, which by definition runs after
          hydration and after the browser has already painted — so every cold
          load and hard navigation flashed a white page at dark-mode users
          before the class landed on <html>.

          `suppressHydrationWarning` on <html> above is what makes this safe:
          the script mutates className/style before React hydrates, and React
          would otherwise report the mismatch it deliberately caused.
        */}
        <script
          dangerouslySetInnerHTML={{ __html: buildThemeInitScript() }}
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <I18nProvider locale={locale} messages={messages}>
              {children}
              <DemoModeBanner />
            </I18nProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
