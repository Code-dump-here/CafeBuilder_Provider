"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Bookmark, Download, Mail, Printer, Share2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { projectActionToast } from "./project-action-toast";
import type { ProjectSummary } from "@/lib/projects/use-projects-overview";

interface ProjectHeroBarProps {
  project: ProjectSummary;
}

export function ProjectHeroBar({ project }: ProjectHeroBarProps) {
  const t = useTranslations("ProjectsOverview");
  const tActions = useTranslations("ProjectsOverview.actions");
  const format = useFormatter();

  const formatDate = (value: Date) =>
    format.dateTime(value, { dateStyle: "medium" });

  const projectCode = `SCB-2024-${String(project.id).padStart(3, "0")}`;

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };
  const handleShare = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(window.location.href);
        projectActionToast(tActions("shareCopied"));
      } catch {
        projectActionToast(tActions("shareCopied"));
      }
    }
  };

  return (
    <header className="flex flex-col gap-3 border-b border-border/60 pb-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {project.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5 text-xs font-semibold">
              <span
                className="size-1.5 rounded-full bg-primary-foreground"
                aria-hidden
              />
              {project.briefStatus}
            </Badge>
            {project.priority === "urgent" ? (
              <Badge
                variant="destructive"
                className="text-xs font-semibold"
                aria-label={t("priority.urgentAria")}
              >
                {t("priority.urgent")}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs font-semibold">
                {t("priority.standard")}
              </Badge>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>
              <span className="text-muted-foreground/80">
                {t("createdBy")}{" "}
              </span>
              <span className="text-foreground">
                {project.owner?.fullName ?? "—"}
              </span>
              <span className="text-muted-foreground/80">
                {" "}
                · {formatDate(project.createdAt)}
              </span>
            </span>
            <span>
              <span className="text-muted-foreground/80">{t("updated")}: </span>
              <span className="text-foreground">
                {formatDate(project.updatedAt)}
              </span>
            </span>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={tActions("label")}
        >
          <Button
            variant="outline"
            size="lg"
            onClick={() => projectActionToast(tActions("saveComingSoon"))}
            aria-label={tActions("save")}
          >
            <Bookmark aria-hidden />
            {tActions("save")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handlePrint}
            aria-label={tActions("print")}
          >
            <Printer aria-hidden />
            {tActions("print")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleShare}
            aria-label={tActions("share")}
          >
            <Share2 aria-hidden />
            {tActions("share")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => projectActionToast(tActions("downloadPdf"))}
            aria-label={tActions("downloadPdf")}
          >
            <Download aria-hidden />
            {tActions("downloadPdf")}
          </Button>
          <Separator
            orientation="vertical"
            className="mx-1 hidden h-6 sm:block"
          />
          <Button
            size="lg"
            onClick={() => projectActionToast(tActions("contactOwner"))}
            aria-label={tActions("contactOwner")}
            className="font-semibold"
          >
            <Mail aria-hidden />
            {tActions("contactOwner")}
          </Button>
        </div>
      </div>
    </header>
  );
}
