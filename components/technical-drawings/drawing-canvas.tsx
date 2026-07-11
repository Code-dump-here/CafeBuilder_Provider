"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Download,
  FileText,
  Maximize2,
  Plus,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { projectActionToast } from "@/components/project-overview/project-action-toast";
import { cn } from "@/lib/utils";

import type { TechnicalDrawing } from "@/lib/projects/technical-drawing-types";

interface DrawingCanvasProps {
  drawing: TechnicalDrawing | null;
}

/**
 * Main canvas region. Today this is a placeholder — the real canvas
 * (PDF.js / Three.js / custom SVG overlay) is out of scope until the
 * document service is wired. We render:
 *
 *   - The toolbar (zoom, fullscreen, download, "view drawing type" /
 *     "add drawing type" actions). The two CTAs on the right are wired
 *     to a coming-soon toast.
 *   - A dashed-border placeholder that fills the remaining space and
 *     shows the file metadata, matching the index-page viewer style.
 */
export function DrawingCanvas({ drawing }: DrawingCanvasProps) {
  const t = useTranslations("TechnicalDrawings");

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card px-3 py-2">
        <div className="flex items-center gap-1">
          <ToolbarButton
            icon={ZoomOut}
            label="Zoom out"
            onClick={() => projectActionToast("Zoom controls coming soon.")}
          />
          <ToolbarButton
            icon={ZoomIn}
            label="Zoom in"
            onClick={() => projectActionToast("Zoom controls coming soon.")}
          />
          <span className="mx-2 hidden h-4 w-px bg-border/60 sm:block" aria-hidden />
          <ToolbarButton
            icon={Maximize2}
            label="Fullscreen"
            onClick={() => projectActionToast("Fullscreen coming soon.")}
          />
          <ToolbarButton
            icon={Download}
            label={t("actions.download")}
            onClick={() => projectActionToast("Download will be available soon.")}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => projectActionToast("Drawing type picker coming soon.")}
          >
            {t("canvas.viewDrawingType")}
          </Button>
          <Button
            size="sm"
            onClick={() => projectActionToast("Drawing type picker coming soon.")}
          >
            <Plus aria-hidden />
            {t("canvas.addDrawingType")}
          </Button>
        </div>
      </div>

      {/* Canvas placeholder */}
      <div
        className={cn(
          "relative flex aspect-16/10 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 text-center",
        )}
      >
        {drawing ? (
          <>
            <span className="absolute right-3 top-3">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground ring-1 ring-border/60 backdrop-blur-sm">
                <FileText className="size-3" aria-hidden />
                {drawing.fileName}
              </span>
            </span>
            <div className="flex flex-col items-center gap-1.5">
              <FileText className="size-10 text-muted-foreground/50" aria-hidden />
              <p className="text-xs text-muted-foreground">
                {t("viewer.placeholder")}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground/70">
                {drawing.code}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <FileText className="size-10 text-muted-foreground/50" aria-hidden />
            <p className="text-xs text-muted-foreground">
              {t("viewer.placeholder")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar primitive

interface ToolbarButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}

function ToolbarButton({ icon: Icon, label, onClick }: ToolbarButtonProps) {
  return (
    <Button
      size="icon-xs"
      variant="ghost"
      onClick={onClick}
      aria-label={label}
    >
      <Icon className="size-3.5" aria-hidden />
    </Button>
  );
}