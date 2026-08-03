"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Inbox, ListChecks, Mail, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MyProjectStatus } from "@/features/projects/my-projects-types";

export type MyProjectsFilterValue = "all" | MyProjectStatus;

interface MyProjectsFilterTabsProps {
  /** Optional counts per tab — shows a small badge if provided. */
  counts?: Partial<Record<MyProjectsFilterValue, number>>;
  /** Render a count badge on each tab. */
  showCounts?: boolean;
  className?: string;
}

interface FilterTabDescriptor {
  value: MyProjectsFilterValue;
  i18nKey: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

const FILTER_TABS: FilterTabDescriptor[] = [
  {
    value: "all",
    i18nKey: "tabs.all",
    icon: Inbox,
  },
  {
    value: "requested",
    i18nKey: "tabs.invitations",
    icon: Mail,
  },
  {
    value: "accepted",
    i18nKey: "tabs.active",
    icon: ListChecks,
  },
  {
    value: "completed",
    i18nKey: "tabs.completed",
    icon: Sparkles,
  },
];

/**
 * Filter tabs for the "My Projects" page.
 *
 * The selected tab is mirrored into the URL via the `?status=` query
 * param so the deep-link is bookmarkable and the tab survives a
 * refresh. The component is purely a navigation surface — the actual
 * data fetch is driven by the parent page reading `status` from the
 * URL and passing it into `useMyProjectWorkings`.
 */
export function MyProjectsFilterTabs({
  counts,
  showCounts = false,
  className,
}: MyProjectsFilterTabsProps) {
  const t = useTranslations("MyProjects.filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = parseStatus(searchParams.get("status"));

  const navigateToTab = React.useCallback(
    (value: MyProjectsFilterValue) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete("status");
      } else {
        params.set("status", value);
      }
      params.delete("pageNumber");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <nav
      aria-label={t("label")}
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-xl border border-border/60 bg-card/50 p-1",
        className,
      )}
    >
      {FILTER_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentStatus === tab.value;
        const count = counts?.[tab.value];
        const showCount = showCounts && typeof count === "number";
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
            {showCount ? (
              <span
                className={cn(
                  "ms-1 rounded-full px-1.5 text-[10px] font-semibold",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

function parseStatus(raw: string | null): MyProjectsFilterValue {
  if (raw === "requested" || raw === "accepted" || raw === "completed") {
    return raw;
  }
  return "all";
}
