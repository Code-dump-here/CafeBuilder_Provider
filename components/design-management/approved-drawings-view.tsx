"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, Loader2, Ruler } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { EngagementDesignSummary } from "@/lib/projects/engagement-types";

/**
 * Read-only approved-drawings view.
 *
 * Renders `EngagementDesignSummary[]` returned by
 * `GET /api/project-workings/{id}/overview`. The summary ships only
 * `{ id, title, version }` per design, so we render a minimal card list
 * rather than the full `VersionListTable` (which needs the rich
 * `DesignVersion` shape — see the comment on `EngagementDesignSummary`).
 *
 * Used by:
 *   - `/projects/[id]/technical-drawings` — primary home for the
 *     read-only viewer list (constructor / owner / admin /
 *     designer-not-in-work).
 *   - `/projects/[id]/design-management` — fallback when a non-designer
 *     lands on the legacy designer route.
 *
 * i18n strings are injected via the `labels` prop so each page can
 * pass its own namespace (no `useTranslations` coupling here — the
 * component stays a leaf and renders the same in any page context).
 *
 * Forward-compatibility: when the backend enriches
 * `EngagementDesignSummary` (owner / drawingCount / publishedAt / …)
 * the card row can be extended without a hook bump.
 */
export interface ApprovedDrawingsViewLabels {
  empty: string;
  open: string;
  versionPrefix: string;
  loading: string;
  errorTitle: string;
  errorSubtitle: string;
  retry: string;
  footer: string;
}

export interface ApprovedDrawingsViewProps {
  approvedDesigns: EngagementDesignSummary[];
  projectId: string;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  onRefetch: () => void;
  title: string;
  subtitle: string;
  labels: ApprovedDrawingsViewLabels;
}

export function ApprovedDrawingsView({
  approvedDesigns,
  projectId,
  isLoading,
  isFetching,
  isError,
  onRefetch,
  title,
  subtitle,
  labels,
}: ApprovedDrawingsViewProps) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </header>

      {isError ? (
        <ApprovedDrawingsErrorBanner
          labels={labels}
          onRetry={onRefetch}
        />
      ) : isLoading ? (
        <ApprovedDrawingsSkeleton />
      ) : approvedDesigns.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {labels.empty}
        </p>
      ) : (
        <ul
          aria-label={title}
          className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-card"
        >
          {approvedDesigns.map((design) => {
            const versionLabel = `${labels.versionPrefix} ${design.version}`;
            const openLabel = `${labels.open} ${design.title}`;
            return (
              <li
                key={design.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
                  <Ruler aria-hidden className="size-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {design.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {versionLabel}
                  </span>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  aria-label={openLabel}
                >
                  <Link href={`/projects/${projectId}/design-management/${design.id}`}>
                    {labels.open}
                    <ChevronRight aria-hidden className="size-3.5" />
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {isFetching && !isLoading && !isError ? (
        <p
          aria-live="polite"
          className="flex items-center justify-center gap-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          <Loader2 className="size-3 animate-spin" aria-hidden />
          {labels.loading}
        </p>
      ) : null}

      {!isLoading && approvedDesigns.length > 0 && !isError ? (
        <p className="text-center text-[11px] text-muted-foreground">
          {labels.footer}
        </p>
      ) : null}
    </section>
  );
}

function ApprovedDrawingsSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md border border-border/40 bg-muted/20 px-3 py-3"
        >
          <div className="size-9 animate-pulse rounded-md bg-muted" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-2 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ApprovedDrawingsErrorBanner({
  labels,
  onRetry,
}: {
  labels: ApprovedDrawingsViewLabels;
  onRetry: () => void;
}) {
  // Local translator fallback for callers that didn't pass labels —
  // shouldn't happen in production, but keeps the component safe to
  // render standalone during tests.
  const t = useTranslations("DesignManagement");
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border/60 bg-card p-8 text-center"
    >
      <p className="text-sm font-medium text-foreground">
        {labels.errorTitle}
      </p>
      <p className="max-w-md text-xs text-muted-foreground">
        {labels.errorSubtitle}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {labels.retry ?? t("errorBanner.retry")}
      </Button>
    </div>
  );
}