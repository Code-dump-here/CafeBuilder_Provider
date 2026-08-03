"use client";

import * as React from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowLeft, Box, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CodeBadge, OwnerAvatar } from "@/components/data-table";
import { cn } from "@/lib/utils";

import type {
  TechnicalDrawing,
  TechnicalDrawingKind,
} from "@/features/projects/technical-drawing-types";

interface DrawingDetailHeaderProps {
  drawing: TechnicalDrawing;
  projectId: string;
}

const KIND_TONE: Record<TechnicalDrawingKind, string> = {
  "3D": "bg-primary/15 text-primary",
  "2D": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CONTRACT: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

/**
 * Header strip above the canvas: back-link to the listing, the drawing
 * name + code + kind, author + last-updated, and an "open file" CTA
 * (placeholder).
 */
export function DrawingDetailHeader({
  drawing,
  projectId,
}: DrawingDetailHeaderProps) {
  const t = useTranslations("TechnicalDrawings");
  const format = useFormatter();

  return (
    <header className="flex flex-col gap-3">
      <nav aria-label="Breadcrumb">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link href={`/projects/${projectId}/technical-drawings`}>
            <ArrowLeft aria-hidden />
            {t("pageTitle")}
          </Link>
        </Button>
      </nav>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Box
            aria-hidden
            className="mt-1 size-5 shrink-0 text-muted-foreground"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <CodeBadge code={drawing.code} variant="default" />
              <span
                className={cn(
                  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  KIND_TONE[drawing.kind],
                )}
              >
                {drawing.kind}
              </span>
            </div>
            <h1 className="truncate text-base font-semibold text-foreground">
              {drawing.name}
            </h1>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {drawing.note ?? "\u00A0"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <OwnerAvatar
              name={drawing.author.fullName}
              color={drawing.author.avatarColor}
            />
            <span className="flex flex-col leading-tight">
              <span className="text-foreground/90">{drawing.author.fullName}</span>
              <span className="text-[10px]">
                {t("viewer.updatedLabel")}{" "}
                {format.dateTime(drawing.updatedAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </span>
          </span>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              window.open(drawing.fileName, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLink aria-hidden />
            {t("actions.openInNewTab")}
          </Button>
        </div>
      </div>
    </header>
  );
}