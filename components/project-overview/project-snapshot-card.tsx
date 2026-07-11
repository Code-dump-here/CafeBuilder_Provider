"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { ProjectSummary } from "@/lib/projects/use-projects-overview";

interface ProjectSnapshotCardProps {
  project: ProjectSummary;
}

export function ProjectSnapshotCard({ project }: ProjectSnapshotCardProps) {
  const t = useTranslations("ProjectsOverview");

  return (
    <Card
      size="sm"
      aria-labelledby="project-snapshot-title"
      className="border-border/60"
    >
      <CardHeader>
        <CardTitle id="project-snapshot-title" className="text-base">
          {project.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="break-words">{project.address}</span>
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
        <p className="text-sm text-foreground/90 break-words">
          {project.description}
        </p>
      </CardContent>
    </Card>
  );
}