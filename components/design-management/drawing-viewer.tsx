"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Crop,
  Download,
  ExternalLink,
  ImageOff,
  Maximize2,
  PencilRuler,
  Printer,
  Share2,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { OwnerAvatar } from "@/components/data-table";
import { projectActionToast } from "@/components/project-overview/project-action-toast";
import { cn } from "@/lib/utils";

import type {
  DesignDrawing,
  DesignVersion,
} from "@/lib/projects/design-version-types";

interface DrawingViewerProps {
  drawing: DesignDrawing | null;
  drawings: DesignDrawing[];
  version: DesignVersion;
  onSelect: (drawing: DesignDrawing) => void;
}

/**
 * Center column of the detail page. Renders:
 * - breadcrumb (current file)
 * - top-right actions (fullscreen / crop / share / print / download)
 * - large preview area (aspect-video)
 * - meta footer (scale / sheet / updated-by)
 * - prev / next pagination
 *
 * Version history sits in the right column — not here — because the
 * history belongs with cross-version context (owner, status…), not
 * with the active drawing.
 */
export function DrawingViewer({
  drawing,
  drawings,
  version,
  onSelect,
}: DrawingViewerProps) {
  const t = useTranslations("DesignManagement");
  const format = useFormatter();
  const [imgError, setImgError] = React.useState(false);

  // Reset broken-image state whenever the active drawing changes,
  // otherwise opening a broken drawing would stick on the placeholder
  // for the next one too.
  React.useEffect(() => {
    setImgError(false);
  }, [drawing?.id]);

  const currentIndex = drawing
    ? drawings.findIndex((d) => d.id === drawing.id)
    : -1;
  const prevDrawing = currentIndex > 0 ? drawings[currentIndex - 1] : null;
  const nextDrawing =
    currentIndex >= 0 && currentIndex < drawings.length - 1
      ? drawings[currentIndex + 1]
      : null;

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  const handleShare = async () => {
    if (typeof window === "undefined" || !drawing) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      projectActionToast(t("viewer.shareCopied"));
    } catch {
      projectActionToast(t("viewer.shareCopied"));
    }
  };

  if (!drawing) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        {t("viewer.empty")}
      </div>
    );
  }

  return (
    <article className="flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-border/60 bg-card">
      {/* Breadcrumb row */}
      <header className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2.5 text-[11px] text-muted-foreground">
        <span className="font-mono font-semibold text-foreground">
          {drawing.code}
        </span>
        <span aria-hidden>/</span>
        <span className="truncate font-medium text-foreground/80">
          {drawing.name}
        </span>
        <span aria-hidden>/</span>
        <span className="truncate">{version.name}</span>
      </header>

      {/* Main preview area with overlay actions at the top right */}
      <div className="relative flex-1 bg-stone-50 px-4 py-4 dark:bg-stone-950/40">
        <div className="absolute top-6 right-6 z-10 flex items-center gap-1.5">
          <Button
            size="icon-sm"
            variant="secondary"
            aria-label={t("viewer.actions.fullscreen")}
          >
            <Maximize2 aria-hidden />
          </Button>
          <Button
            size="icon-sm"
            variant="secondary"
            aria-label={t("viewer.actions.crop")}
          >
            <Crop aria-hidden />
          </Button>
          <Button
            size="icon-sm"
            variant="secondary"
            onClick={handleShare}
            aria-label={t("viewer.actions.share")}
          >
            <Share2 aria-hidden />
          </Button>
          <Button
            size="icon-sm"
            variant="secondary"
            onClick={handlePrint}
            aria-label={t("viewer.actions.print")}
          >
            <Printer aria-hidden />
          </Button>
          <Button
            size="icon-sm"
            variant="secondary"
            onClick={() =>
              projectActionToast(t("viewer.downloadComingSoon"))
            }
            aria-label={t("viewer.actions.download")}
          >
            <Download aria-hidden />
          </Button>
        </div>

        <div className="mx-auto flex h-full max-w-5xl items-center justify-center">
          {drawing.thumbnailUrl && !imgError ? (
            <img
              src={drawing.thumbnailUrl}
              alt={drawing.name}
              onError={() => setImgError(true)}
              className="max-h-full max-w-full rounded-md border border-border/40 bg-white object-contain shadow-sm dark:bg-stone-100"
            />
          ) : (
            <div
              role="img"
              aria-label={drawing.name}
              className="flex aspect-video w-full max-w-5xl items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-muted text-xs text-muted-foreground"
            >
              <ImageOff aria-hidden className="size-4" />
              {t("viewer.unavailable")}
            </div>
          )}
        </div>
      </div>

      {/* Meta + pagination footer */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {drawing.scale ? (
            <span className="inline-flex items-center gap-1.5">
              <PencilRuler
                aria-hidden
                className="size-3 text-muted-foreground"
              />
              <dt className="text-muted-foreground">{t("viewer.scale")}</dt>
              <dd className="font-medium text-foreground">{drawing.scale}</dd>
            </span>
          ) : null}
          {drawing.sheet ? (
            <span className="inline-flex items-center gap-1.5">
              <PencilRuler
                aria-hidden
                className="size-3 text-muted-foreground"
              />
              <dt className="text-muted-foreground">{t("viewer.sheet")}</dt>
              <dd className="font-medium text-foreground">{drawing.sheet}</dd>
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <User aria-hidden className="size-3 text-muted-foreground" />
            <dt className="text-muted-foreground">{t("viewer.updatedBy")}</dt>
            <dd className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <OwnerAvatar
                name={drawing.updatedBy}
                color={null}
                size="xs"
              />
              <span>{drawing.updatedBy}</span>
              <span className="text-muted-foreground">·</span>
              <CalendarClock
                aria-hidden
                className="size-3 text-muted-foreground"
              />
              <span className="text-muted-foreground">
                {format.dateTime(drawing.updatedAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </dd>
          </span>
        </dl>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={!prevDrawing}
            onClick={() => prevDrawing && onSelect(prevDrawing)}
          >
            <ChevronLeft aria-hidden />
            {t("viewer.prev")}
          </Button>
          <span className="rounded border border-border/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            {currentIndex + 1} / {drawings.length}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={!nextDrawing}
            onClick={() => nextDrawing && onSelect(nextDrawing)}
          >
            {t("viewer.next")}
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </footer>
    </article>
  );
}