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

// The backend gives a single `budget` figure. This card used to widen it into
// a ±15% band so it read like the "250–350 million VND" pattern in the design
// reference — but a provider has no way to tell an invented range from one the
// owner actually stated, and may quote against it. Show the real number.

export function QuickFactsCard({ project }: QuickFactsCardProps) {
  const t = useTranslations("ProjectsOverview.quickFacts");
  const format = useFormatter();

  const budgetMillions =
    project.budget != null ? project.budget / 1_000_000 : null;

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
            budgetMillions != null
              ? `${format.number(budgetMillions, { maximumFractionDigits: 0 })} ${t("millionShort")}`
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