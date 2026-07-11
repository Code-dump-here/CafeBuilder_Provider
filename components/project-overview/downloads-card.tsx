"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Download, FolderDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { projectActionToast } from "./project-action-toast";
import type { ProjectSummary } from "@/lib/projects/use-projects-overview";

interface DownloadsCardProps {
  project: ProjectSummary;
}

export function DownloadsCard({ project }: DownloadsCardProps) {
  const t = useTranslations("ProjectsOverview.downloads");

  if (project.attachments.length === 0) {
    return null;
  }

  return (
    <Card
      size="sm"
      aria-labelledby="project-downloads-title"
      className="border-border/60"
    >
      <CardHeader>
        <CardTitle id="project-downloads-title" className="text-base">
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {project.attachments.map((att) => {
          const isPrimary = att.id === "a2";
          const Icon = isPrimary ? FolderDown : Download;
          const labelKey = isPrimary ? "allAttachments" : "downloadPdf";
          return (
            <Button
              key={att.id}
              variant="outline"
              size="lg"
              className="w-full justify-between"
              onClick={() => projectActionToast(t("comingSoon"))}
              aria-label={t(labelKey, { title: att.title })}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="size-4" aria-hidden />
                <span className="truncate">{att.title}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {(att.sizeKb / 1024).toFixed(1)} MB
              </span>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}