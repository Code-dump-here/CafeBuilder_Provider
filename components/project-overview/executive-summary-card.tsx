"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Quote } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { DefinitionRow } from "./definition-row";
import type { ProjectSummary } from "@/lib/projects/use-projects-overview";

interface ExecutiveSummaryCardProps {
  project: ProjectSummary;
}

export function ExecutiveSummaryCard({
  project,
}: ExecutiveSummaryCardProps) {
  const t = useTranslations("ProjectsOverview.executiveSummary");

  return (
    <Card
      size="sm"
      aria-labelledby="project-executive-summary-title"
      className="border-border/60"
    >
      <CardHeader>
        <CardTitle id="project-executive-summary-title" className="text-base">
          {t("title")}
        </CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <blockquote className="flex gap-2 rounded-md border-l-2 border-primary bg-primary/5 p-3 text-sm italic text-foreground/90">
          <Quote className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p className="break-words">{project.description}</p>
        </blockquote>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DefinitionRow label={t("businessType")} value={project.businessType} />
          <DefinitionRow label={t("primaryGoal")} value={project.primaryGoal} />
          <DefinitionRow
            label={t("targetAudience")}
            value={project.targetAudience}
          />
          <DefinitionRow
            label={t("targetOpening")}
            value={project.targetOpening}
            bordered={false}
          />
        </dl>
      </CardContent>
    </Card>
  );
}