"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { GitCompare, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CodeBadge, OwnerAvatar } from "@/components/data-table";
import { cn } from "@/lib/utils";

import type { DrawingVersion } from "@/features/projects/technical-drawing-types";

interface VersionHistoryPanelProps {
  versions: DrawingVersion[];
  /** Currently selected version id (default = newest). */
  selectedVersionId: number | null;
  onSelectVersion: (version: DrawingVersion) => void;
  /** When set, opens the diff placeholder below the timeline. */
  compareVersionId: number | null;
  onToggleCompare: (version: DrawingVersion) => void;
}

/**
 * Right-rail timeline of revisions for the current drawing. Click a
 * version to select it (drives the canvas). Click "Compare" on a second
 * version to open the diff placeholder below the list.
 */
export function VersionHistoryPanel({
  versions,
  selectedVersionId,
  onSelectVersion,
  compareVersionId,
  onToggleCompare,
}: VersionHistoryPanelProps) {
  const t = useTranslations("TechnicalDrawings");
  const format = useFormatter();

  if (versions.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <h3 className="text-xs font-semibold text-foreground">
          {t("versionHistory.title")}
        </h3>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("versionHistory.count", { count: versions.length })}
        </span>
      </header>

      <ol role="list" className="flex flex-col">
        {versions.map((version, idx) => {
          const isSelected = selectedVersionId === version.id;
          const isCompareTarget = compareVersionId === version.id;
          const isLatest = idx === 0;

          return (
            <li
              key={version.id}
              className={cn(
                "border-b border-border/40 last:border-b-0",
                isSelected && "bg-primary/5",
              )}
            >
              <div className="flex items-start gap-2 px-3 py-2.5">
                {/* Timeline rail */}
                <div className="relative flex flex-col items-center pt-1">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      isLatest
                        ? "bg-primary"
                        : isSelected
                          ? "bg-primary/60"
                          : "bg-border",
                    )}
                  />
                  {idx !== versions.length - 1 ? (
                    <span
                      aria-hidden
                      className="mt-1 h-full w-px flex-1 bg-border/60"
                    />
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectVersion(version)}
                    aria-current={isSelected ? "true" : undefined}
                    className={cn(
                      "flex flex-col gap-1 rounded text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset",
                      isSelected ? "" : "hover:bg-muted/40",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <CodeBadge
                        code={version.revision}
                        variant={isLatest ? "default" : "muted"}
                      />
                      <span className="truncate text-xs font-medium text-foreground">
                        {version.fileName}
                      </span>
                      {isLatest ? (
                        <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                          <Star className="size-2.5" aria-hidden />
                          {t("versionHistory.latest")}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      <OwnerAvatar
                        name={version.author.fullName}
                        color={version.author.avatarColor}
                        size="xs"
                      />
                      <span>{version.author.fullName}</span>
                      <span aria-hidden>·</span>
                      <span>
                        {format.dateTime(version.authoredAt, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {version.changeNote ? (
                      <p className="line-clamp-2 text-[11px] text-foreground/80">
                        {version.changeNote}
                      </p>
                    ) : null}
                  </button>

                  {!isLatest ? (
                    <Button
                      size="xs"
                      variant={isCompareTarget ? "secondary" : "ghost"}
                      onClick={() => onToggleCompare(version)}
                      className="self-start"
                    >
                      <GitCompare aria-hidden />
                      {isCompareTarget
                        ? t("versionHistory.clearCompare")
                        : t("versionHistory.compare")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {compareVersionId !== null ? <DiffPlaceholder /> : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Diff placeholder
//
// When the user picks two versions to compare, this renders below the
// timeline. Real diff overlay (e.g. overlay two PNGs at 50% opacity, or
// highlight a "what changed" diff between two PDFs) is out of scope
// until the document service is wired — the placeholder explains that
// and shows the two version ids that are being compared.

function DiffPlaceholder() {
  const t = useTranslations("TechnicalDrawings");

  return (
    <div className="flex flex-col gap-2 border-t border-border/60 bg-muted/30 p-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("diff.title")}
      </h4>
      <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-background p-4">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <GitCompare className="size-6 text-muted-foreground/50" aria-hidden />
          <p className="text-[11px] text-muted-foreground">
            {t("diff.placeholder")}
          </p>
        </div>
      </div>
    </div>
  );
}