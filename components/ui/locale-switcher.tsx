"use client";

import * as React from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALES = [
  { code: "en" as const, label: "EN" },
  { code: "vi" as const, label: "VI" },
];

export function LocaleSwitcher() {
  const t = useTranslations("Navbar.locale");
  const router = useRouter();
  const pathname = usePathname();
  const [currentLocale, setCurrentLocale] = React.useState<string>("en");

  const label = LOCALES.find((l) => l.code === currentLocale)?.label ?? "EN";

  function handleLocaleChange(locale: "en" | "vi") {
    setCurrentLocale(locale);
    router.replace(pathname, { locale });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t("label")}>
          <span className="text-[11px] font-semibold uppercase leading-none">
            {label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleLocaleChange(l.code)}
            className="flex cursor-pointer items-center justify-between gap-6"
          >
            <span>{t(l.code)}</span>
            <span className="ml-4 text-xs font-semibold uppercase text-muted-foreground">
              {l.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
