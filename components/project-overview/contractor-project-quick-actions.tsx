"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ClipboardList,
  CreditCard,
  HardHat,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Module #1 of the contractor experience — condensed "construction
 * overview" card rendered inside the project page.
 *
 * Why here instead of a dedicated `/construction` route?
 *   - Contractors only operate inside a project context. There is no
 *     workspace-level landing for them, so the right rail of
 *     `/projects/[id]` is the natural home for at-a-glance build info.
 *   - Keeps the previous "Construction overview" page concept alive in
 *     a compact form (4 KPIs → 4 deep-links into the project sub-routes
 *     added in the sidebar refactor).
 *
 * Each tile links into the matching project-scoped page. Numbers are
 * optional — the server can supply them later and the tiles degrade
 * gracefully to "—" while we wait.
 */
interface ContractorProjectQuickActionsProps {
  projectId: string;
  /** Phase completion as a 0..100 number, or null while loading. */
  progressPercent?: number | null;
  openIssuesCount?: number | null;
  todayTasksCount?: number | null;
  paymentsDueCount?: number | null;
}

export function ContractorProjectQuickActions({
  projectId,
  progressPercent = null,
  openIssuesCount = null,
  todayTasksCount = null,
  paymentsDueCount = null,
}: ContractorProjectQuickActionsProps) {
// Lives under `ProjectsOverview.contractorQuickActions.*` so the card
// stays grouped with the other project-overview strings.
  const t = useTranslations("ProjectsOverview.contractorQuickActions");

  return (
    <Card
      size="sm"
      aria-labelledby="contractor-quick-actions-title"
      className="border-border/60"
    >
      <CardHeader>
        <CardTitle
          id="contractor-quick-actions-title"
          className="flex items-center gap-2 text-base"
        >
          <HardHat className="size-4 text-primary" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        <Tile
          href={`/projects/${projectId}/construction-log`}
          icon={<HardHat className="size-3.5" aria-hidden />}
          label={t("constructionLog")}
          value={
            progressPercent === null ? "—" : t("progressValue", { percent: progressPercent })
          }
        />
        <Tile
          href={`/projects/${projectId}/daily-reports`}
          icon={<ClipboardList className="size-3.5" aria-hidden />}
          label={t("todayTasks")}
          value={todayTasksCount === null ? "—" : String(todayTasksCount)}
        />
        <Tile
          href={`/projects/${projectId}/issues`}
          icon={<AlertTriangle className="size-3.5" aria-hidden />}
          label={t("openIssues")}
          value={openIssuesCount === null ? "—" : String(openIssuesCount)}
        />
        <Tile
          href={`/projects/${projectId}/materials`}
          icon={<CreditCard className="size-3.5" aria-hidden />}
          label={t("payments")}
          value={paymentsDueCount === null ? "—" : String(paymentsDueCount)}
        />
      </CardContent>
    </Card>
  );
}

function Tile({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-0.5 rounded-md border border-border/40 bg-card/40 px-2.5 py-2 transition-colors hover:border-border hover:bg-card"
    >
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground tabular-nums">
        {value}
      </span>
    </Link>
  );
}