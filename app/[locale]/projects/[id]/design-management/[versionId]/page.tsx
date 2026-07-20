"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DrawingTree } from "@/components/design-management/drawing-tree";
import { DrawingViewer } from "@/components/design-management/drawing-viewer";
import { VersionHistory } from "@/components/design-management/version-history";
import {
  useDesignVersion,
  useDesignVersions,
} from "@/lib/projects/use-design-versions";

import type { DesignDrawing } from "@/lib/projects/design-version-types";

/**
 * Three-column detail page that mirrors the mockup:
 *   ┌──────────┬────────────────────────┬───────────┐
 *   │  Tree    │       Viewer           │  History  │
 *   │  (left)  │       (center)         │  (right)  │
 *   └──────────┴────────────────────────┴───────────┘
 *
 * State model:
 *   `selectedDrawing` — what the viewer shows. Owned by the page so
 *   both the tree's row highlight and the viewer's prev/next pagination
 *   stay in sync.
 *
 * When navigating between versions we *don't* clear state: the user
 * may want to keep the same sheet selected. The history rail is the
 * primary version switcher.
 */
export default function DesignVersionDetailPage() {
  const params = useParams<{ id: string; versionId: string }>();
  const projectIdParam = params?.id ?? "";
  const versionIdRaw = params?.versionId ?? "";
  const versionId = Number.parseInt(versionIdRaw, 10);

  const t = useTranslations("DesignManagement");
  const format = useFormatter();

  const version = useDesignVersion(projectIdParam, versionId);
  // Full list — we need it for the version-history rail on the
  // right. Today the mock loader returns the same data either way;
  // in the real backend this becomes a second endpoint.
  const allVersions = useDesignVersions(projectIdParam);

  // Pick a sensible default the first time the page renders: the
  // last-updated drawing in the active version. Memoised so we
  // don't reflip the selection on every render of unrelated state.
  const defaultDrawing = React.useMemo<DesignDrawing | null>(() => {
    if (!version || version.drawings.length === 0) return null;
    const sorted = [...version.drawings].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
    return sorted[0];
  }, [version]);

  const [selectedDrawing, setSelectedDrawing] =
    React.useState<DesignDrawing | null>(null);

  // Seed the selection once data is available. We only do this when
  // `selectedDrawing` is null AND the version has drawings — never
  // overwrite an explicit user pick on subsequent renders.
  const effectiveDrawing = selectedDrawing ?? defaultDrawing ?? null;

  if (!versionId || Number.isNaN(versionId) || !version) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertTriangle
          aria-hidden
          className="size-8 text-muted-foreground/50"
        />
        <p className="text-sm text-muted-foreground">{t("version.notFound")}</p>
        <Button asChild size="sm" variant="outline">
          <Link href={`/projects/${projectIdParam}/design-management`}>
            <ArrowLeft aria-hidden />
            {t("version.backToList")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Compact breadcrumb bar — leaves the chrome of the
          page (sidebar title, URL) as the primary navigation;
          this row only shows the path through content. */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground"
      >
        <Link
          href={`/projects/${projectIdParam}/design-management`}
          className="hover:text-foreground"
        >
          {t("crumbs.versions")}
        </Link>
        <ChevronRight aria-hidden className="size-3" />
        <Link
          href={`/projects/${projectIdParam}/design-management`}
          className="hover:text-foreground"
        >
          {version.code}
        </Link>
        <ChevronRight aria-hidden className="size-3" />
        <span className="font-semibold text-foreground">{version.name}</span>
        {effectiveDrawing ? (
          <>
            <ChevronRight aria-hidden className="size-3" />
            <span className="font-mono text-foreground/80">
              {effectiveDrawing.code} — {effectiveDrawing.name}
            </span>
          </>
        ) : null}
      </nav>

      {/* Main three-column layout. Min-heights below keep the
          viewer from collapsing when the preview image is short. */}
      <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <DrawingTree
            drawings={version.drawings}
            selectedId={effectiveDrawing?.id ?? null}
            onSelect={setSelectedDrawing}
            onPreview={() => {
              /* The page owns the preview state, so the tree
                  doesn't open a modal — clicking a row already
                  updates the viewer via `onSelect`. */
            }}
          />
        </div>

        <DrawingViewer
          drawing={effectiveDrawing}
          drawings={version.drawings}
          version={version}
          onSelect={setSelectedDrawing}
        />

        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <VersionHistory
            versions={allVersions}
            currentVersionId={versionId}
            projectId={projectIdParam}
          />
        </div>
      </div>

      {/* Footer line: last-updated note for context. Hidden on the
          earliest screen sizes — it duplicates info shown above. */}
      {version.latestNote ? (
        <p className="hidden rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground lg:block">
          <span className="font-semibold text-foreground/80">
            {t("version.latestNoteLabel")}:
          </span>{" "}
          {version.latestNote} ·{" "}
          {format.dateTime(version.updatedAt, {
            dateStyle: "medium",
          })}
        </p>
      ) : null}
    </div>
  );
}
