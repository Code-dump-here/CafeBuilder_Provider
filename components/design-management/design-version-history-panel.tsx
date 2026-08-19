"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  History,
  Loader2,
  RotateCcw,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type {
  DesignVersionSnapshot,
  DesignVersionSnapshotKind,
} from "@/features/projects/design-version-types";

interface DesignVersionHistoryPanelProps {
  snapshots: DesignVersionSnapshot[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageNumber: number;
  totalItems: number;
  pageSize: number;
  onRetry: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  /**
   * Fires when the user picks a snapshot in the timeline. The parent
   * can use this to swap the main viewer into "historical view" mode,
   * showing the images captured at the moment of the snapshot.
   */
  onSelectSnapshot?: (snapshot: DesignVersionSnapshot) => void;
  /**
   * Optional id of the snapshot currently shown by the viewer — lets
   * the rail highlight the matching row.
   */
  selectedSnapshotId?: string | null;
}

// ─── Snapshot-kind visuals ──────────────────────────────────────────────────
//
// We keep the styling inline (rather than via `StatusDot`) because
// `submitted` and `approved` aren't design *statuses* — they're the
// events that produced the snapshot. Showing them with their own icon
// makes the timeline read as "what happened" instead of "what state".

const SNAPSHOT_TONE: Record<
  DesignVersionSnapshotKind,
  {
    icon: React.ComponentType<{ className?: string }>;
    dotClass: string;
    labelKey: "snapshotSubmitted" | "snapshotApproved" | "snapshotRevision";
  }
> = {
  submitted: {
    icon: Send,
    dotClass: "text-amber-500",
    labelKey: "snapshotSubmitted",
  },
  approved: {
    icon: CheckCircle2,
    dotClass: "text-emerald-500",
    labelKey: "snapshotApproved",
  },
  revision: {
    icon: RotateCcw,
    dotClass: "text-rose-500",
    labelKey: "snapshotRevision",
  },
};

// ─── Main panel ─────────────────────────────────────────────────────────────

export function DesignVersionHistoryPanel({
  snapshots,
  isLoading,
  isFetching,
  isError,
  hasNextPage,
  hasPreviousPage,
  pageNumber,
  totalItems,
  pageSize,
  onRetry,
  onNextPage,
  onPreviousPage,
  onSelectSnapshot,
  selectedSnapshotId,
}: DesignVersionHistoryPanelProps) {
  const t = useTranslations("DesignManagement.history");

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <aside
      aria-label={t("label")}
      className="flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-border/60 bg-card"
    >
      <header className="flex flex-col gap-1 border-b border-border/60 bg-muted/40 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("snapshotHeading")}
        </p>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <History aria-hidden className="size-3.5 text-muted-foreground" />
          {t("snapshotTitle")}
        </h3>
        <p className="text-[11px] text-muted-foreground">
          {t("snapshotSubtitle", {
            count: totalItems,
          })}
        </p>
      </header>

      {isError ? (
        <HistoryErrorState onRetry={onRetry} />
      ) : isLoading ? (
        <HistoryLoadingState />
      ) : snapshots.length === 0 ? (
        <HistoryEmptyState />
      ) : (
        <ol
          className="relative flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
          aria-label={t("snapshotTitle")}
        >
          {snapshots.map((snapshot, index) => (
            <SnapshotRow
              key={snapshot.id}
              snapshot={snapshot}
              index={index}
              isSelected={selectedSnapshotId === snapshot.id}
              onSelect={onSelectSnapshot}
            />
          ))}
        </ol>
      )}

      <footer className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2 text-[10px] text-muted-foreground">
        <span>
          {isFetching && !isLoading ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-2.5 animate-spin" aria-hidden />
              {t("refreshing")}
            </span>
          ) : (
            t("pageLabel", { current: pageNumber, total: totalPages })
          )}
        </span>
        <span className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={!hasPreviousPage || isFetching}
            onClick={onPreviousPage}
            aria-label={t("previousPage")}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={!hasNextPage || isFetching}
            onClick={onNextPage}
            aria-label={t("nextPage")}
          >
            <ChevronRight aria-hidden />
          </Button>
        </span>
      </footer>
    </aside>
  );
}

// ─── One snapshot row ───────────────────────────────────────────────────────

interface SnapshotRowProps {
  snapshot: DesignVersionSnapshot;
  index: number;
  isSelected: boolean;
  onSelect?: (snapshot: DesignVersionSnapshot) => void;
}

function SnapshotRow({
  snapshot,
  index,
  isSelected,
  onSelect,
}: SnapshotRowProps) {
  const t = useTranslations("DesignManagement.history");
  const format = useFormatter();
  const tone = SNAPSHOT_TONE[snapshot.snapshotKind];
  const Icon = tone.icon;
  const versionLabel = `V${snapshot.version}`;
  const handleClick = React.useCallback(() => {
    onSelect?.(snapshot);
  }, [onSelect, snapshot]);

  return (
    <li className="relative">
      {/* Connector line — links this row to the next one along the
          left rail. Last row gets the line clipped so it doesn't
          poke out past the last dot. */}
      {index > 0 ? (
        <span
          aria-hidden
          className="absolute left-[7px] top-[-0.75rem] h-[0.75rem] w-px bg-border"
        />
      ) : null}

      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isSelected}
        className={cn(
          "flex w-full flex-col gap-1 rounded-md border border-transparent px-2 py-1.5 text-left text-xs transition-colors hover:border-border/60 hover:bg-muted/40",
          isSelected && "border-primary/30 bg-primary/5",
        )}
      >
        <span className="flex items-start gap-2">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-card",
              tone.dotClass,
            )}
          >
            <Icon className="size-3" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {versionLabel}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t(tone.labelKey)}
              </span>
            </span>
            <span className="line-clamp-1 text-xs font-medium text-foreground">
              {snapshot.title ?? t("unnamedVersion")}
            </span>
            {/* The revision reason frozen into this snapshot. Only rendered on
                `revision` rows: `submitted` / `approved` snapshots copy whatever
                reason happened to be on the design at the time, which belongs to
                the PREVIOUS round and reads as if it applied to this one. */}
            {snapshot.snapshotKind === "revision" && snapshot.reason ? (
              <span className="mt-0.5 rounded-sm border-l-2 border-rose-400/60 bg-rose-50/60 py-0.5 pl-1.5 text-[10px] leading-relaxed text-foreground/80 dark:bg-rose-950/20">
                {snapshot.reason}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock aria-hidden className="size-2.5" />
              {format.dateTime(snapshot.snapshottedAt, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            {snapshot.images.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <FileText aria-hidden className="size-2.5" />
                {t("imageCount", { count: snapshot.images.length })}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}

// ─── Sub-states ─────────────────────────────────────────────────────────────

function HistoryLoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 flex-col gap-3 px-4 py-3"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-md border border-transparent px-2 py-1.5"
        >
          <div className="mt-0.5 size-4 animate-pulse rounded-full bg-muted" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-2 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryEmptyState() {
  const t = useTranslations("DesignManagement.history");
  return (
    <p className="flex flex-1 items-center justify-center px-4 py-6 text-center text-xs text-muted-foreground">
      {t("snapshotEmpty")}
    </p>
  );
}

function HistoryErrorState({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("DesignManagement.history");
  return (
    <div
      role="alert"
      className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-6 text-center text-xs text-muted-foreground"
    >
      <p className="font-medium text-foreground">{t("snapshotErrorTitle")}</p>
      <p className="max-w-xs">{t("snapshotErrorSubtitle")}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {t("snapshotErrorRetry")}
      </Button>
    </div>
  );
}
