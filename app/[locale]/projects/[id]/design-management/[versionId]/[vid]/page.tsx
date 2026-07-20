"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DrawingTree } from "@/components/design-management/drawing-tree";
import { DrawingViewer } from "@/components/design-management/drawing-viewer";
import {
  resolveCategorySlug,
  useDesignCategoryVersions,
  useDesignVersion,
} from "@/lib/projects/use-design-versions";
import type { DesignDrawing } from "@/lib/projects/design-version-types";

/**
 * Per-version detail page (specific version only).
 *
 * URL shape: `design-management/[versionId]/v/[id]/`.
 *   - Outer `[versionId]` is interpreted as a category slug ("3d",
 *     "floor-plan", …) — chosen so the inner literal segment `v` can
 *     carry the numeric version id inside `[id]`. The literal `v` is
 *     required because the App Router doesn't allow two dynamic
 *     segments named the same, and the existing drawer's sibling
 *     `draft` page also lives under `[versionId]/`, so a literal
 *     separator (`/v`) lets both branches stay at the same depth.
 *   - Breadcrumb includes the category name (3D, FLOOR_PLAN, ...).
 *   - Right rail "version history" only shows OTHER versions in the
 *     same category — the active project's complete history would be
 *     misleading from inside a single category view.
 *
 * The drawing list/tree + viewer + right rail are otherwise the
 * same as before so the existing components can be reused.
 */
export default function DesignVersionDetailPage() {
  // Two dynamic segments share the name `id` in the route tree
  // (one outer for the project id, one inner for the version id).
  // TypeScript flattens identical keys so we read both off the
  // runtime params shape.
  const params = useParams() as Record<string, string | string[]>;
  // `id` from the catch-all but Next picks the deepest for collision;
  // the project id also exists in the URL. We resolve via pathname
  // for clarity.
  const projectIdParam =
    (Array.isArray(params?.id) ? params.id[0] : params?.id) ?? "";
  const slug =
    (Array.isArray(params?.versionId)
      ? params.versionId[0]
      : params?.versionId) ?? "";
  // The *inner* `[id]` is exposed under `params.id` (deepest wins per
  // Next.js). Pull the actual segment from the pathname instead.
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";
  const segments = pathname.split("/").filter(Boolean);
  const versionIdRaw = segments[segments.length - 1] ?? "";
  const versionId = Number.parseInt(versionIdRaw, 10);

  const t = useTranslations("DesignManagement");
  const format = useFormatter();

  const category = resolveCategorySlug(slug);
  const version = useDesignVersion(projectIdParam, versionId);
  // Per-category version list — feeds the right rail so users can
  // jump between sibling versions without leaving the category scope.
  const categoryVersions = useDesignCategoryVersions(
    projectIdParam,
    category ?? "",
  );

  const defaultDrawing = React.useMemo<DesignDrawing | null>(() => {
    if (!version || version.drawings.length === 0) return null;
    const sorted = [...version.drawings].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
    return sorted[0];
  }, [version]);

  const [selectedDrawing, setSelectedDrawing] =
    React.useState<DesignDrawing | null>(null);

  const effectiveDrawing = selectedDrawing ?? defaultDrawing ?? null;

  if (!category || Number.isNaN(versionId) || !version) {
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
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground"
      >
        <Link
          href={`/projects/${projectIdParam}/design-management`}
          className="hover:text-foreground"
        >
          {t("crumbs.categories")}
        </Link>
        <ChevronRight aria-hidden className="size-3" />
        <Link
          href={`/projects/${projectIdParam}/design-management/${slug}`}
          className="hover:text-foreground"
        >
          {t(`categories.${labelKey(category)}`)}
        </Link>
        <ChevronRight aria-hidden className="size-3" />
        <span className="font-semibold text-foreground">{version.code}</span>
        {effectiveDrawing ? (
          <>
            <ChevronRight aria-hidden className="size-3" />
            <span className="font-mono text-foreground/80">
              {effectiveDrawing.code} — {effectiveDrawing.name}
            </span>
          </>
        ) : null}
      </nav>

      <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <DrawingTree
            drawings={version.drawings}
            selectedId={effectiveDrawing?.id ?? null}
            onSelect={setSelectedDrawing}
            onPreview={() => {}}
          />
        </div>

        <DrawingViewer
          drawing={effectiveDrawing}
          drawings={version.drawings}
          version={version}
          onSelect={setSelectedDrawing}
        />

        {/* Right rail — sibling versions in the same category */}
        <aside className="flex flex-col gap-3 overflow-hidden rounded-xl border border-border/60 bg-card p-4">
          <header className="flex flex-col gap-1 border-b border-border/60 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("history.heading")}
            </p>
            <h3 className="text-sm font-semibold">
              {t("history.versionInCategory")}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {t("history.subtitle", { count: categoryVersions.length })}
            </p>
          </header>
          <ol className="flex flex-col gap-1">
            {categoryVersions.map((v) => {
              const active = v.id === versionId;
              return (
                <li key={v.id}>
                  <Link
                    href={`/projects/${projectIdParam}/design-management/${slug}/v/${v.id}`}
                    aria-current={active ? "page" : undefined}
                    className={
                      "flex flex-col gap-0.5 rounded-md border border-transparent px-2 py-1.5 text-xs hover:border-border/60 hover:bg-muted/40 " +
                      (active
                        ? "border-primary/30 bg-primary/5 text-primary"
                        : "")
                    }
                  >
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wide">
                      {v.code}
                    </span>
                    <span className="truncate text-xs">{v.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format.dateTime(v.updatedAt, { dateStyle: "medium" })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <Link
            href={`/projects/${projectIdParam}/design-management/${slug}/draft`}
            className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            {t("history.viewAllInCategory")}
          </Link>
        </aside>
      </div>

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

function labelKey(
  cat: "REVISION" | "FLOOR_PLAN" | "3D" | "ELEVATION" | "SECTION",
) {
  switch (cat) {
    case "REVISION":
      return "revision";
    case "FLOOR_PLAN":
      return "floorPlan";
    case "3D":
      return "threeD";
    case "ELEVATION":
      return "elevation";
    case "SECTION":
      return "section";
  }
}
