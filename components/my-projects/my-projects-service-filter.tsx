"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Hammer, type LucideIcon, Layers, PencilRuler, Rows3 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MyProjectContractType } from "@/features/projects/my-projects-types";

export type MyProjectsServiceValue = "all" | MyProjectContractType;

interface MyProjectsServiceFilterProps {
  className?: string;
}

interface ServiceTabDescriptor {
  value: MyProjectsServiceValue;
  i18nKey: string;
  icon: LucideIcon;
}

/**
 * All three kinds are listed separately, including `both`, because the
 * backend matches `contractType` exactly (`e.ContractType == kind`). A
 * design-and-build engagement answers only to `both` — folding it under
 * "Design" would need a second request, and each option here lines up with
 * the badge already printed on the card.
 */
const SERVICE_TABS: ServiceTabDescriptor[] = [
  { value: "all", i18nKey: "service.all", icon: Rows3 },
  { value: "design", i18nKey: "service.design", icon: PencilRuler },
  { value: "construction", i18nKey: "service.construction", icon: Hammer },
  { value: "both", i18nKey: "service.both", icon: Layers },
];

/**
 * Kind-of-work filter for the "My Projects" page.
 *
 * Only worth rendering for a provider whose capability is `both` — someone
 * who only designs sees nothing but design engagements anyway, so the page
 * mounts this conditionally. Selection is mirrored into `?service=` so the
 * view is bookmarkable, matching how the status tabs use `?status=`.
 */
export function MyProjectsServiceFilter({
  className,
}: MyProjectsServiceFilterProps) {
  const t = useTranslations("MyProjects.filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = parseServiceParam(searchParams.get("service"));

  const navigateToTab = React.useCallback(
    (value: MyProjectsServiceValue) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete("service");
      } else {
        params.set("service", value);
      }
      params.delete("pageNumber");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <nav
      aria-label={t("service.label")}
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-xl border border-border/60 bg-card/50 p-1",
        className,
      )}
    >
      {SERVICE_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = current === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => navigateToTab(tab.value)}
            aria-pressed={isActive}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            <span>{t(tab.i18nKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Reads `?service=`. Anything unrecognised falls back to `all` rather than
 * reaching the API, which answers an unknown `contractType` with a 400.
 */
export function parseServiceParam(raw: string | null): MyProjectsServiceValue {
  if (raw === "design" || raw === "construction" || raw === "both") {
    return raw;
  }
  return "all";
}
