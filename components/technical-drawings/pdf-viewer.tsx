"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ExternalLink, FileText, Maximize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CodeBadge, OwnerAvatar } from "@/components/data-table";
import { cn } from "@/lib/utils";

import type {
  TechnicalDrawing,
  TechnicalDrawingKind,
} from "@/lib/projects/technical-drawing-types";

interface PdfViewerProps {
  drawing: TechnicalDrawing | null;
}

/**
 * Placeholder PDF preview. Real PDF rendering is out of scope until the
 * document service is wired — today the viewer shows the file metadata
 * (sheet code, scale, author, updated date) inside a dashed-border
 * placeholder so the page composition reads as "PDF here, file info
 * around it".
 */
export function PdfViewer({ drawing }: PdfViewerProps) {
  const t = useTranslations("TechnicalDrawings");
  const format = useFormatter();

  if (!drawing) {
    return (
      <div
        className={cn(
          "flex aspect-16/10 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 text-center",
        )}
      >
        <FileText className="size-8 text-muted-foreground/60" aria-hidden />
        <p className="text-xs text-muted-foreground">
          {t("viewer.placeholder")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "relative flex aspect-16/10 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 text-center",
        )}
      >
        <span className="absolute right-3 top-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground ring-1 ring-border/60 backdrop-blur-sm">
            <FileText className="size-3" aria-hidden />
            {t("viewer.tabBadge", { kind: drawing.kind })}
          </span>
        </span>
        <div className="flex flex-col items-center gap-1.5">
          <FileText className="size-10 text-muted-foreground/50" aria-hidden />
          <p className="text-xs text-muted-foreground">
            {t("viewer.placeholder")}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground/70">
            {drawing.fileName}
          </p>
        </div>
        <Button
          size="xs"
          variant="outline"
          className="pointer-events-auto"
          onClick={() => window.open(drawing.fileName, "_blank", "noopener,noreferrer")}
        >
          <Maximize2 aria-hidden />
          {t("actions.openInNewTab")}
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border/60 bg-card p-3 text-xs sm:grid-cols-3">
        <MetaItem label={t("viewer.codeLabel")} value={<CodeBadge code={drawing.code} variant="muted" />} />
        <MetaItem
          label={t("viewer.scaleLabel")}
          value={drawing.scale ?? "—"}
        />
        <MetaItem
          label={t("viewer.updatedLabel")}
          value={format.dateTime(drawing.updatedAt, { dateStyle: "medium" })}
        />
        <MetaItem
          label={t("viewer.authorLabel")}
          value={
            <span className="inline-flex items-center gap-1.5">
              <OwnerAvatar
                name={drawing.author.fullName}
                color={drawing.author.avatarColor}
                size="xs"
              />
              <span className="truncate">{drawing.author.fullName}</span>
            </span>
          }
        />
        <MetaItem
          label={t("viewer.fileLabel")}
          value={
            <span className="inline-flex items-center gap-1 truncate">
              <FileText className="size-3 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate font-mono text-[11px]">{drawing.fileName}</span>
            </span>
          }
        />
        <MetaItem
          label="Kind"
          value={<KindBadge kind={drawing.kind} />}
        />
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-xs font-medium text-foreground">{value}</dd>
    </div>
  );
}

function KindBadge({ kind }: { kind: TechnicalDrawingKind }) {
  const cls =
    kind === "3D"
      ? "bg-primary/15 text-primary"
      : kind === "2D"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        cls,
      )}
    >
      {kind}
    </span>
  );
}