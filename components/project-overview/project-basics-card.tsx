"use client";

import * as React from "react";
import {
  Baby,
  Camera,
  Coffee,
  Heart,
  Leaf,
  Sparkles,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { DefinitionRow } from "./definition-row";
import type {
  CafeTypeItem,
  ProjectSummary,
} from "@/lib/projects/use-projects-overview";
import { useTranslations } from "next-intl";

interface ProjectBasicsCardProps {
  project: ProjectSummary;
}

const ICONS: Record<CafeTypeItem["iconKey"], React.ComponentType<{ className?: string }>> = {
  coffee: Coffee,
  leaf: Leaf,
  baby: Baby,
  sparkles: Sparkles,
  heart: Heart,
  camera: Camera,
};

const fallbackByTitle: Record<string, CafeTypeItem["iconKey"]> = {
  "Specialty Coffee": "coffee",
  Minimalist: "leaf",
  "Family Friendly": "baby",
};

export function ProjectBasicsCard({ project }: ProjectBasicsCardProps) {
  const t = useTranslations("ProjectsOverview.basics");
  return (
    <Card
      size="sm"
      aria-labelledby="project-basics-title"
      className="border-border/60"
    >
      <CardHeader>
        <CardTitle id="project-basics-title" className="text-base">
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DefinitionRow label={t("projectName")} value={project.name} />
          <DefinitionRow
            label={t("projectType")}
            value={project.businessType}
            bordered={false}
          />
          <DefinitionRow
            label={t("location")}
            value={project.address}
            bordered
          />
        </dl>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("cafeTypes")}
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {project.cafeTypeItems.map((item) => {
              const iconKey =
                item.iconKey ?? fallbackByTitle[item.title] ?? "coffee";
              const Icon = ICONS[iconKey] ?? Coffee;
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-md border border-border/60 bg-background/40 p-3"
                >
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.subtitle}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}