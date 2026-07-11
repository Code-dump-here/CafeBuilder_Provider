"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Circle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  computeBriefCompletion,
  type ProjectSummary,
} from "@/lib/projects/use-projects-overview";

interface ProjectHealthCardProps {
  project: ProjectSummary;
}

export function ProjectHealthCard({ project }: ProjectHealthCardProps) {
  const t = useTranslations("ProjectsOverview.projectHealth");
  const { done, total, percent } = computeBriefCompletion(project);

  return (
    <Card
      size="sm"
      aria-labelledby="project-health-title"
      aria-describedby="project-health-subtitle"
      className="border-border/60"
    >
      <CardHeader>
        <CardTitle id="project-health-title" className="text-base">
          {t("title")}
        </CardTitle>
        <CardDescription id="project-health-subtitle">
          {t("subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {t("briefComplete")}
            </p>
            <p
              className="text-sm font-semibold tabular-nums text-foreground"
              aria-live="polite"
            >
              {t("percent", { percent })}
            </p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("briefCompleteAria", { percent })}
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("checklistCount", { done, total })}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">
            {t("needsCompletion")}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {project.briefChecklist.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                  item.done
                    ? "text-muted-foreground line-through"
                    : "text-foreground",
                )}
              >
                {item.done ? (
                  <Check
                    className="size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                ) : (
                  <Circle
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                )}
                <span className="break-words">{item.label}</span>
              </li>
            ))}
            {project.briefChecklist.length === 0 ? (
              <li className="px-2 text-sm text-muted-foreground">
                {t("noChecklist")}
              </li>
            ) : null}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}