"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  ChevronDown,
  ChevronRight,
  Eye,
  FileStack,
  Search,
} from "lucide-react";

import { PageHead } from "@/components/admin/page-head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OwnerAvatar } from "@/components/data-table";
import {
  useDesignCategoryVersions,
  resolveCategorySlug,
} from "@/lib/projects/use-design-versions";
import { DrawingViewer } from "@/components/design-management/drawing-viewer";
import type {
  DesignDrawing,
  DesignVersion,
} from "@/lib/projects/design-version-types";

/**
 * Draft detail page.
 *
 * Shown when the user clicks the "Draft" entry on the per-category
 * draft list. Renders EVERY drawing across EVERY version of the
 * active category, grouped by version. The right-rail tree is
 * replaced with a version-grouped list — each group expandable to
 * show the drawings it contains.
 *
 * Selecting a drawing swaps the centre viewer to that drawing. The
 * viewer keeps prev/next navigation within the active version (so
 * "next" doesn't jump across versions), which keeps the mental
 * model consistent with the per-version page.
 */
export default function DesignDraftDetailPage() {
  const params = useParams<{ id: string; categoryId: string }>();
  const projectId = params?.id ?? "";
  const slug = params?.categoryId ?? "";
  const t = useTranslations("DesignManagement");
  const format = useFormatter();

  const category = resolveCategorySlug(slug);
  const versions = useDesignCategoryVersions(projectId, category ?? "");

  const [search, setSearch] = React.useState("");
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  // Track which version-groups are open. Default: first one open.
  const [openVersionIds, setOpenVersionIds] = React.useState<Set<number>>(
    () => new Set(versions[0] ? [versions[0].id] : []),
  );

  if (!category) {
    return <UnknownCategory projectId={projectId} slug={slug} />;
  }

  // Build the flat lookup table once. Each entry = one drawing in
  // its parent version. The key is `<versionId>:<drawingId>` to keep
  // uniqueness even when drawing ids recycle between versions.
  const allEntries = React.useMemo(() => {
    const entries: Array<{
      key: string;
      version: DesignVersion;
      drawing: DesignDrawing;
    }> = [];
    for (const v of versions) {
      for (const d of v.drawings) {
        entries.push({ key: `${v.id}:${d.id}`, version: v, drawing: d });
      }
    }
    return entries;
  }, [versions]);

  const filteredEntries = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allEntries;
    return allEntries.filter(
      (e) =>
        e.drawing.name.toLowerCase().includes(q) ||
        e.drawing.code.toLowerCase().includes(q) ||
        e.version.code.toLowerCase().includes(q),
    );
  }, [allEntries, search]);

  // Active drawing — derive from key or fall back to first entry
  const activeEntry = React.useMemo(() => {
    if (selectedKey) {
      const found = allEntries.find((e) => e.key === selectedKey);
      if (found) return found;
    }
    return filteredEntries[0] ?? null;
  }, [allEntries, filteredEntries, selectedKey]);

  const activeVersion = activeEntry?.version ?? versions[0] ?? null;

  const toggleVersion = (id: number) => {
    setOpenVersionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <PageHead
        title={t("draftDetail.title")}
        description={t("draftDetail.subtitle", {
          count: allEntries.length,
          versions: versions.length,
        })}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/projects/${projectId}/design-management/${slug}`}>
              <ArrowLeft aria-hidden />
              {t("draftDetail.backToList")}
            </Link>
          </Button>
        }
      />

      <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left rail: version-grouped drawing tree */}
        <aside className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-2 px-1">
            <Boxes className="size-3.5 text-primary" aria-hidden />
            <span className="text-xs font-semibold">
              {t("draftDetail.treeTitle")}
            </span>
          </div>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("draftDetail.searchPlaceholder")}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <ol className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {versions.map((version) => {
              const isOpen = openVersionIds.has(version.id);
              const matching = filteredEntries.filter(
                (e) => e.version.id === version.id,
              );
              if (matching.length === 0 && search.trim().length > 0) {
                return null;
              }
              return (
                <li key={version.id} className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => toggleVersion(version.id)}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold hover:bg-muted"
                  >
                    <span className="flex items-center gap-1.5">
                      {isOpen ? (
                        <ChevronDown
                          className="size-3 text-muted-foreground"
                          aria-hidden
                        />
                      ) : (
                        <ChevronRight
                          className="size-3 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                      <FileStack
                        className="size-3.5 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="font-mono text-foreground">
                        {version.code}
                      </span>
                      <span className="text-muted-foreground">
                        · {version.name}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {version.drawingCount}
                    </span>
                  </button>
                  {isOpen ? (
                    <ul className="flex flex-col gap-0.5 pl-5">
                      {matching.map((entry) => {
                        const active = entry.key === activeEntry?.key;
                        return (
                          <li key={entry.key}>
                            <button
                              type="button"
                              onClick={() => setSelectedKey(entry.key)}
                              className={
                                "flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1 text-left text-xs hover:border-border/60 hover:bg-muted/40 " +
                                (active
                                  ? "border-primary/40 bg-primary/5 text-primary"
                                  : "text-foreground/90")
                              }
                            >
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="font-mono text-[10px] font-semibold">
                                  {entry.drawing.code}
                                </span>
                                <span className="truncate">
                                  {entry.drawing.name}
                                </span>
                              </span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {format.dateTime(entry.drawing.updatedAt, {
                                  dateStyle: "short",
                                })}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Center: viewer */}
        {activeEntry && activeVersion ? (
          <DrawingViewer
            drawing={activeEntry.drawing}
            drawings={activeEntry.version.drawings}
            version={activeVersion}
            onSelect={(d) => setSelectedKey(`${activeVersion.id}:${d.id}`)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            {t("draftDetail.empty")}
          </div>
        )}
      </div>

      {/* Footer summary */}
      {activeEntry && activeVersion ? (
        <p className="hidden rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground lg:block">
          <span className="font-semibold text-foreground/80">
            {t("draftDetail.viewingFrom")}:
          </span>{" "}
          {activeVersion.code} ({activeVersion.name}) ·{" "}
          <span className="text-foreground/80">{activeEntry.drawing.code}</span>{" "}
          — {activeEntry.drawing.name}
          {" · "}
          <OwnerAvatar
            name={activeEntry.drawing.updatedBy}
            color={null}
            size="xs"
          />
          <span className="ml-1">{activeEntry.drawing.updatedBy}</span>
          <span className="ml-2">
            <Link
              href={
                `/projects/${projectId}/design-management/${slug}/${activeVersion.id}` as never
              }
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <Eye aria-hidden className="size-3" />
              {t("draftDetail.viewAsVersion")}
            </Link>
          </span>
        </p>
      ) : null}
    </>
  );
}

function UnknownCategory({
  projectId,
  slug,
}: {
  projectId: string;
  slug: string;
}) {
  const t = useTranslations("DesignManagement");
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle aria-hidden className="size-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">
        {t("draftList.unknownCategory", { slug })}
      </p>
      <Button asChild size="sm" variant="outline">
        <Link href={`/projects/${projectId}/design-management`}>
          <ArrowLeft aria-hidden />
          {t("categoryLanding.backToCategories")}
        </Link>
      </Button>
    </div>
  );
}
