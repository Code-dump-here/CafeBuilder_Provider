"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SHEET } from "@/components/drawing-set/sheet-title";
import { TitleBlock, TitleCell } from "@/components/drawing-set/title-block";

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
 * management surface: title, subtitle, title block, back link,
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
        <h1 className="sheet-title text-3xl text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-prose text-xs text-muted-foreground">
          {t("subtitle")}
        </p>
        {/* Same title block as milestones, so the two management sheets read
            as one set. The counts were three rounded pills. */}
        <TitleBlock className="mt-3">
          <TitleCell label={t("sheet")} emphasis>{SHEET.issues}</TitleCell>
          <TitleCell label={t("sheetTotal")}>{totalCount}</TitleCell>
          <TitleCell label={t("sheetOpen")}>
            <span className={openCount > 0 ? "font-semibold text-primary" : undefined}>
              {openCount}
            </span>
          </TitleCell>
          <TitleCell label={t("sheetResolved")}>{resolvedCount}</TitleCell>
        </TitleBlock>
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
