"use client";

import { useTranslations } from "next-intl";
import {
  Camera,
  Construction,
  TriangleAlert,
  TrendingUp,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { ConstructionLogStats } from "@/lib/contractor/construction-log-data";

interface ConstructionLogStatsProps {
  stats: ConstructionLogStats;
}

/**
 * Four KPI tiles pinned at the top of the construction log page. Mirrors
 * the contractor-overview stats strip but is scoped to the project log
 * (current progress, days active, photos uploaded, blocker days).
 */
export function ConstructionLogStatsCards({ stats }: ConstructionLogStatsProps) {
  const t = useTranslations("ConstructionLog.stats");

  return (
    <Card
      size="sm"
      aria-labelledby="construction-log-stats-title"
      className="border-border/60"
    >
      <CardHeader>
        <CardTitle id="construction-log-stats-title" className="text-base">
          {t("title")}
        </CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile
          icon={<TrendingUp className="size-4" aria-hidden />}
          accent="text-primary"
          value={`${stats.currentProgress}%`}
          label={t("currentProgress.label")}
          hint={t("currentProgress.hint")}
        />
        <Tile
          icon={<Construction className="size-4" aria-hidden />}
          accent="text-sky-500"
          value={String(stats.daysActive)}
          label={t("daysActive.label")}
          hint={t("daysActive.hint")}
        />
        <Tile
          icon={<Camera className="size-4" aria-hidden />}
          accent="text-emerald-500"
          value={String(stats.totalPhotos)}
          label={t("totalPhotos.label")}
          hint={t("totalPhotos.hint")}
        />
        <Tile
          icon={<TriangleAlert className="size-4" aria-hidden />}
          accent="text-amber-500"
          value={String(stats.blockerDays)}
          label={t("blockerDays.label")}
          hint={t("blockerDays.hint")}
        />
      </CardContent>
    </Card>
  );
}

function Tile({
  icon,
  accent,
  value,
  label,
  hint,
}: {
  icon: React.ReactNode;
  accent: string;
  value: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border/40 bg-muted/30 px-2.5 py-2">
      <div className={`mt-0.5 ${accent}`}>{icon}</div>
      <div className="flex flex-1 flex-col">
        <span className="text-lg font-semibold leading-tight text-foreground tabular-nums">
          {value}
        </span>
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
    </div>
  );
}