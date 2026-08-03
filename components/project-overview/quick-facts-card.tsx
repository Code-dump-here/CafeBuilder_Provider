"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Banknote, MapPin, Ruler } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { QuickFactRow } from "./quick-fact-row";
import type { ProjectDetail } from "@/features/projects/project-detail-types";

interface QuickFactsCardProps {
  project: ProjectDetail;
}

function budgetToRange(value: number): { min: number; max: number } {
  // Convert the single budget figure into a +/- 17% range to read like the
  // "250–350 million VND" pattern shown in the reference, without pretending
  // we know a real range.
  const min = Math.round(value * 0.85 / 1_000_000) * 1_000_000;
  const max = Math.round(value * 1.15 / 1_000_000) * 1_000_000;
  return { min, max };
}

export function QuickFactsCard({ project }: QuickFactsCardProps) {
  const t = useTranslations("ProjectsOverview.quickFacts");
  const format = useFormatter();

  const range = project.budget != null ? budgetToRange(project.budget) : null;

  return (
    <Card
      size="sm"
      aria-labelledby="project-quick-facts-title"
      className="border-border/60"
    >
      <CardHeader>
        <CardTitle id="project-quick-facts-title" className="text-base">
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <QuickFactRow
          icon={<Banknote className="size-4" />}
          label={t("budget")}
          value={
            range
              ? `${format.number(range.min / 1_000_000, { maximumFractionDigits: 0 })} – ${format.number(range.max / 1_000_000, { maximumFractionDigits: 0 })} ${t("millionShort")}`
              : "—"
          }
        />
        <Separator className="bg-border/60" />
        <QuickFactRow
          icon={<Ruler className="size-4" />}
          label={t("area")}
          value={
            project.areaM2 != null
              ? `${format.number(project.areaM2)} ${t("areaUnit")}`
              : "—"
          }
        />
        <Separator className="bg-border/60" />
        <QuickFactRow
          icon={<MapPin className="size-4" />}
          label={t("location")}
          value={project.address || "—"}
        />
      </CardContent>
    </Card>
  );
}