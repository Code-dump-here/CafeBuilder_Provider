"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface IssueToolbarProps {
  projectId: string;
  totalCount: number;
  openCount: number;
  resolvedCount: number;
  onReport: () => void;
}

/**
 * Sticky toolbar at the top of the issues page. Mirrors the
 * `MilestoneManagementToolbar` so the two pages feel like one
 * management surface: title, subtitle, summary pills, back link,
 * and the primary report CTA.
 */
export function IssueToolbar({
  projectId,
  totalCount,
  openCount,
  resolvedCount,
  onReport,
}: IssueToolbarProps) {
  const t = useTranslations("MilestoneManagement.issue.toolbar");

  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
        </div>
        <p className="max-w-prose text-xs text-muted-foreground">
          {t("subtitle")}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <Pill>{t("total", { count: totalCount })}</Pill>
          <Pill highlight={openCount > 0}>{t("open", { count: openCount })}</Pill>
          <Pill>{t("resolved", { count: resolvedCount })}</Pill>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          asChild
          type="button"
          size="sm"
          variant="ghost"
        >
          <Link href={`/projects/${projectId}/milestones`}>
            <ArrowLeft aria-hidden />
            {t("backToMilestones")}
          </Link>
        </Button>
        <Button type="button" size="sm" onClick={onReport}>
          <Plus aria-hidden />
          {t("reportCta")}
        </Button>
      </div>
    </header>
  );
}

function Pill({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <span
      className={
        highlight
          ? "rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-foreground"
          : "rounded-full border border-border/60 bg-card px-2 py-0.5 text-foreground"
      }
    >
      {children}
    </span>
  );
}