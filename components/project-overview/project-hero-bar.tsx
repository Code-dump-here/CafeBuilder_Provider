"use client";

import * as React from "react";
import { useFormatter } from "next-intl";
import { Printer, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { projectActionToast } from "./project-action-toast";
import type { ProjectDetail } from "@/lib/projects/project-detail-types";

interface ProjectHeroBarProps {
  project: ProjectDetail;
}

export function ProjectHeroBar({ project }: ProjectHeroBarProps) {
  const format = useFormatter();

  const formatDate = (value: Date) =>
    format.dateTime(value, { dateStyle: "medium" });

  const hasAnyDate =
    project.createdAt.getTime() !== 0 || project.updatedAt.getTime() !== 0;

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };
  const handleShare = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
        // Clipboard write may be denied (permissions / insecure context).
      }
      projectActionToast("Link copied to clipboard.");
    }
  };

  return (
    <header className="flex flex-col gap-3 border-b border-border/60 pb-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {project.name || "Project"}
          </h1>
          {hasAnyDate ? (
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              {project.createdAt.getTime() !== 0 ? (
                <span>
                  <span className="text-muted-foreground/80">Created: </span>
                  <span className="text-foreground">
                    {formatDate(project.createdAt)}
                  </span>
                </span>
              ) : null}
              {project.updatedAt.getTime() !== 0 ? (
                <span>
                  <span className="text-muted-foreground/80">Updated: </span>
                  <span className="text-foreground">
                    {formatDate(project.updatedAt)}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Project actions"
        >
          <Button
            variant="outline"
            size="lg"
            onClick={handlePrint}
            aria-label="Print"
          >
            <Printer aria-hidden />
            Print
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleShare}
            aria-label="Share"
          >
            <Share2 aria-hidden />
            Share
          </Button>
          <Separator
            orientation="vertical"
            className="mx-1 hidden h-6 sm:block"
          />
        </div>
      </div>
    </header>
  );
}