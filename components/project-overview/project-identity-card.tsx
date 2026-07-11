"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Baby,
  Camera,
  Coffee,
  Heart,
  Leaf,
  MapPin,
  Quote,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { DefinitionRow } from "./definition-row";
import type {
  CafeTypeItem,
  ProjectSummary,
} from "@/lib/projects/use-projects-overview";

interface ProjectIdentityCardProps {
  project: ProjectSummary;
}

const ICONS: Record<
  CafeTypeItem["iconKey"],
  React.ComponentType<{ className?: string }>
> = {
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

/**
 * Combined identity card that replaces the old `ProjectSnapshotCard`,
 * `ExecutiveSummaryCard`, and `ProjectBasicsCard` trio. The three previously
 * duplicated sections (name + address + cafe types + description +
 * businessType) now live in a single card with three sub-sections so each
 * fact appears exactly once on the overview page.
 */
export function ProjectIdentityCard({ project }: ProjectIdentityCardProps) {
  const tIdentity = useTranslations("ProjectsOverview.identity");
  const tExec = useTranslations("ProjectsOverview.executiveSummary");
  const tBasics = useTranslations("ProjectsOverview.basics");

  return (
    <Card
      size="sm"
      aria-labelledby="project-identity-title"
      className="border-border/60"
    >
      <CardHeader>
        <CardTitle id="project-identity-title" className="text-base">
          {project.name}
        </CardTitle>
        <CardDescription>{tIdentity("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <section aria-label={tBasics("title")} className="flex flex-col gap-3">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="wrap-break-word">{project.address}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {project.cafeTypes.map((type) => (
              <Badge
                key={type}
                variant="secondary"
                className="text-[11px] font-medium"
              >
                {type}
              </Badge>
            ))}
          </div>
        </section>

        <section
          aria-label={tExec("title")}
          className="flex flex-col gap-4 border-t border-border/60 pt-4"
        >
          <blockquote className="flex gap-2 rounded-md border-l-2 border-primary bg-primary/5 p-3 text-sm italic text-foreground/90">
            <Quote
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <p className="wrap-break-word">{project.description}</p>
          </blockquote>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DefinitionRow
              label={tBasics("projectType")}
              value={project.businessType}
            />
            <DefinitionRow
              label={tExec("primaryGoal")}
              value={project.primaryGoal}
            />
            <DefinitionRow
              label={tExec("targetAudience")}
              value={project.targetAudience}
            />
            <DefinitionRow
              label={tExec("targetOpening")}
              value={project.targetOpening}
              bordered={false}
            />
          </dl>
        </section>

        <section
          aria-label={tBasics("cafeTypes")}
          className="flex flex-col gap-2 border-t border-border/60 pt-4"
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {tBasics("cafeTypes")}
          </p>
          <ul className="flex flex-col gap-2">
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
        </section>
      </CardContent>
    </Card>
  );
}