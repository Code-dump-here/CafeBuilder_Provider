import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * 404 for anything under the locale segment.
 *
 * There was no `not-found.tsx` at any level, so a mistyped or stale URL fell
 * through to Next's built-in page: unstyled, in English regardless of locale,
 * with no navbar, no theme and no way back other than the browser's back
 * button. Anyone following an old link out of an email landed there.
 *
 * Unlike `error.tsx`, this one IS translated. A 404 is a normal, expected
 * response rather than a broken render — the locale segment matched, the
 * layout mounted, and next-intl is working — so there is no reason to drop to
 * hardcoded English here. `app/not-found.tsx` covers the case where no locale
 * resolved at all and translations genuinely are unavailable.
 */
export default function LocaleNotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <p className="font-mono text-5xl font-semibold text-muted-foreground/50">
        404
      </p>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Button asChild variant="outline" size="lg">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </div>
  );
}
