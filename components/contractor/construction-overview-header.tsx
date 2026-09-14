"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ClipboardList, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { projectActionToast } from "@/components/project-overview/project-action-toast";

import type { ConstructionOverviewData } from "@/lib/contractor/construction-overview-data";
import { SHEET } from "@/components/drawing-set/sheet-title";
import { TitleBlock, TitleCell } from "@/components/drawing-set/title-block";

interface ConstructionOverviewHeaderProps {
  data: ConstructionOverviewData;
  /** Phase currently expanded in the track / detail card below. */
  currentPhaseLabel: string;
}

/**
 * Hero strip for the construction overview page. Pulls together the
 * three facts a contractor cares about — current phase, overall
 * progress, last-update — and provides the two primary CTAs (jump into
 * today's log, open the task list).
 */
export function ConstructionOverviewHeader({
  data,
  currentPhaseLabel,
}: ConstructionOverviewHeaderProps) {
  const t = useTranslations("ConstructionOverview");
  const format = useFormatter();

  return (
    <header className="border-b border-border/60 pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="sheet-title text-3xl text-foreground sm:text-4xl">
              {t("title")}
            </h1>
            <span className="text-sm text-muted-foreground">
              · {data.projectName}
            </span>
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">
            {t("subtitle")}
          </p>

          {/* The three facts a contractor checks first, as the sheet's title
              block rather than three rounded pills. */}
          <TitleBlock>
            <TitleCell label={t("header.sheet")} emphasis>
              {SHEET.constructionOverview}
            </TitleCell>
            <TitleCell label={t("header.currentPhaseLabel")}>
              {currentPhaseLabel}
            </TitleCell>
            <TitleCell label={t("header.progressLabel")}>
              {data.overallProgress}%
            </TitleCell>
            <TitleCell label={t("header.sheetUpdated")}>
              {format.dateTime(new Date(data.lastUpdated), {
                hour: "numeric",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              })}
            </TitleCell>
          </TitleBlock>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
          <Button
            type="button"
            size="sm"
            onClick={() => projectActionToast(t("header.openLogComingSoon"))}
          >
            <PenLine aria-hidden />
            {t("header.openLog")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled
            aria-disabled="true"
            title={t("header.viewTasks")}
          >
            <ClipboardList aria-hidden />
            {t("header.viewTasks")}
          </Button>
        </div>
      </div>
    </header>
  );
}
