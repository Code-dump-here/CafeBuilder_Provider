"use client";

import { useFormatter, useTranslations } from "next-intl";
import { CalendarDays, ClipboardList, PenLine, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { projectActionToast } from "@/components/project-overview/project-action-toast";

import type { ConstructionOverviewData } from "@/lib/contractor/construction-overview-data";

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
    <Card className="border-border/60 bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="font-heading text-xl font-semibold text-foreground">
              {t("title")}
            </h1>
            <span className="text-sm text-muted-foreground">
              · {data.projectName}
            </span>
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">
            {t("subtitle")}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Pill icon={<ClipboardList className="size-3.5" aria-hidden />}>
              {t("header.currentPhaseLabel")}: <strong>{currentPhaseLabel}</strong>
            </Pill>
            <Pill icon={<TrendingUp className="size-3.5" aria-hidden />}>
              {t("header.progressLabel")}:
              <strong className="tabular-nums"> {data.overallProgress}%</strong>
            </Pill>
            <Pill icon={<CalendarDays className="size-3.5" aria-hidden />}>
              {t("header.lastUpdated", {
                time: format.dateTime(new Date(data.lastUpdated), {
                  hour: "numeric",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                }),
              })}
            </Pill>
          </div>
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
    </Card>
  );
}

function Pill({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-foreground">
      <span className="text-muted-foreground">{icon}</span>
      <span>{children}</span>
    </span>
  );
}

// Local Card to avoid extra import in a small file.
function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={className}>{children}</section>;
}