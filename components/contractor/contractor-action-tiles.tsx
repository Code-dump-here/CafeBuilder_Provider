"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  AlertTriangle,
  ClipboardCheck,
  Construction,
  CreditCard,
  FileCheck,
  Package,
  TriangleAlert,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ContractorActionTilesProps {
  projectId: string;
}

interface ActionSpec {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  titleKey:
    | "constructionLog"
    | "dailyReports"
    | "issuesAndRFI"
    | "materialsTracking"
    | "payments";
  descKey:
    | "constructionLogDesc"
    | "dailyReportsDesc"
    | "issuesAndRFIDesc"
    | "materialsTrackingDesc"
    | "paymentsDesc";
  /** Optional badge counter for the issues tile. */
  badgeCount?: number;
}

const ACTIONS: ReadonlyArray<ActionSpec> = [
  {
    href: "/construction-log",
    icon: Construction,
    titleKey: "constructionLog",
    descKey: "constructionLogDesc",
  },
  {
    href: "/daily-reports",
    icon: FileCheck,
    titleKey: "dailyReports",
    descKey: "dailyReportsDesc",
  },
  {
    href: "/issues",
    icon: AlertTriangle,
    titleKey: "issuesAndRFI",
    descKey: "issuesAndRFIDesc",
    badgeCount: 3,
  },
  {
    href: "/materials",
    icon: Package,
    titleKey: "materialsTracking",
    descKey: "materialsTrackingDesc",
  },
  {
    href: "/payments",
    icon: CreditCard,
    titleKey: "payments",
    descKey: "paymentsDesc",
  },
];

/**
 * The shortcut tile grid for the contractor — five entries that map 1:1
 * to the items currently parked in the contractor sidebar. Each tile is
 * a `<Link>` to the matching project sub-page (today they're placeholder
 * routes that may 404 — the tile itself is what we're shipping).
 */
export function ContractorActionTiles({ projectId }: ContractorActionTilesProps) {
  const t = useTranslations("ConstructionOverview.actions");

  return (
    <Card size="sm" className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {ACTIONS.map(({ href, icon: Icon, titleKey, descKey, badgeCount }) => (
          <Link
            key={href}
            href={`/projects/${projectId}${href}`}
            className="group relative flex flex-col gap-1.5 rounded-md border border-border/40 bg-card/40 px-3 py-2.5 transition-colors hover:border-border hover:bg-card"
          >
            {badgeCount ? (
              <span className="absolute right-2 top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500/90 px-1 text-[10px] font-medium text-white">
                {badgeCount}
              </span>
            ) : null}
            <Icon
              className="size-4 text-primary group-hover:text-primary/80"
              aria-hidden
            />
            <span className="text-sm font-medium text-foreground">{t(titleKey)}</span>
            <span className="text-[11px] leading-snug text-muted-foreground">
              {t(descKey)}
            </span>
          </Link>
        ))}
      </CardContent>
      {/* Inline triangle alert — decorative; actual issues UI lives behind /issues */}
      <span className="sr-only">
        <TriangleAlert aria-hidden />
        <ClipboardCheck aria-hidden />
      </span>
    </Card>
  );
}