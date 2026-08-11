"use client";

import * as React from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import {
  Box,
  ChevronRight,
  ExternalLink,
  Layers,
  Loader2,
  PencilRuler,
  Plus,
  Send,
  StickyNote,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CodeBadge,
  OwnerAvatar,
  StatusDot,
} from "@/components/data-table";
import { DataTable } from "@/components/data-table/data-table";

import { projectActionToast } from "@/components/project-overview/project-action-toast";
import { VersionCommentsPanel } from "@/components/design-management/version-comments-panel";
import {
  useCreateDesignCommentMutation,
  useDesignComments,
} from "@/features/projects/use-design-comments";
import {
  NewVersionDialog,
  PublishRevisionDialog,
} from "./dialogs";
import type { DesignVersion } from "@/features/projects/design-version-types";
import type { DesignType } from "@/features/projects/design-types";
import { mapDesignTypeToCategory } from "@/features/projects/use-designs";

interface VersionListTableProps {
  projectId: string;
  versions: DesignVersion[];
  /** Engagement id forwarded to `NewVersionDialog` for `POST /api/designs`. */
  projectWorkingId: number | null;
  /** Callers account id (creator) — forwarded to `NewVersionDialog`. */
  createdBy: number | null;
  /** Render the right-hand action buttons (New Version, Publish Revision). */
  showActions?: boolean;
  /**
   * i18n key under `DesignManagement.*` for the page header. Pass
   * `"readOnlyTitle"` / `"readOnlySubtitle"` when the page is being
   * rendered for a viewer who can only browse approved designs (e.g.
   * a contractor using the page as their approved-drawings index).
   * Defaults to the designer-facing `"pageTitle"` / `"pageSubtitle"`.
   */
  titleKey?: "pageTitle" | "readOnlyTitle";
  subtitleKey?: "pageSubtitle" | "readOnlySubtitle";
  /**
   * Optional base path for the per-version detail page. If provided,
   * the eye icon on each row links here; row click still drives
   * in-page selection. Defaults to `/projects/{id}/design-management`.
   */
  detailBasePath?: string;
  /** Loading state — table renders a skeleton while engagements / designs
   *  are being fetched. */
  isLoading?: boolean;
  /** Background refetch (e.g. after invalidation). Used to show the
   *  "Refreshing…" pill at the bottom. */
  isFetching?: boolean;
  /** Hard-error state for the list — drives an inline error banner with
   *  a retry button. */
  isError?: boolean;
  /** Optional retry hook for the error banner. */
  onRefetch?: () => void;
}

// Tab values the table understands. The "ALL" pseudo-tab is a
// client-side constant; everything else maps 1:1 to a `DesignType`
// from `api/designs` (concept / layout_2d / render_3d /
// technical_drawing). We expose the API enum directly to the UI —
// no separate "DrawingCategory" indirection — so designers see the
// categories the backend actually stores.
type TabValue = "ALL" | DesignType;

// Built-in tabs that ship with the page. These mirror the C#
// `DesignType` enum (`concept | layout_2d | render_3d | technical_drawing`).
// The "ALL" tab is a client-side pseudo-category that returns every
// version regardless of type.
const DEFAULT_TABS: ReadonlyArray<{
  value: TabValue;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "ALL", icon: Layers },
  { value: "concept", icon: StickyNote },
  { value: "layout_2d", icon: PencilRuler },
  { value: "render_3d", icon: Box },
  { value: "technical_drawing", icon: PencilRuler },
];

/**
 * The version list surface — file-list style.
 *
 *   ┌─ Header (title + actions) ────────────────────────────────────┐
 *   │  Title                                       [+ New Version]   │
 *   │  Subtitle                                    [Publish Revision] │
 *   ├─ Tabs (All / Concept / Layout 2D / Render 3D / Technical) ─────┤
 *   ├───────────────────────────────┬────────────────────────────────┤
 *   │ File-list table               │ Comments (right rail)          │
 *   │  ┌──┐  V3.0  Construction Set │ ⓜ Pham Minh Anh  📌 Pinned     │
 *   │  │HM│  Owner Revisions        │   Looks good…                  │
 *   │  └──┘                         │   ↳ H.M.  Final dim are…       │
 *   └───────────────────────────────┴────────────────────────────────┘
 *
 * Row click selects the version (drives the comments panel). The
 * dedicated "Open" button at the end of each row is the cross-page
 * affordance — it links to the per-version detail route, leaving the
 * listing intact.
 */
export function VersionListTable({
  projectId,
  projectWorkingId,
  createdBy,
  versions,
  showActions = true,
  titleKey = "pageTitle",
  subtitleKey = "pageSubtitle",
  detailBasePath,
  isLoading = false,
  isFetching = false,
  isError = false,
  onRefetch,
}: VersionListTableProps) {
  return (
    <VersionListTableInner
      projectId={projectId}
      projectWorkingId={projectWorkingId}
      createdBy={createdBy}
      versions={versions}
      showActions={showActions}
      titleKey={titleKey}
      subtitleKey={subtitleKey}
      detailBasePath={detailBasePath}
      isLoading={isLoading}
      isFetching={isFetching}
      isError={isError}
      onRefetch={onRefetch}
    />
  );
}

function VersionListTableInner({
  projectId,
  projectWorkingId,
  createdBy,
  versions,
  showActions = true,
  titleKey = "pageTitle",
  subtitleKey = "pageSubtitle",
  detailBasePath,
  isLoading = false,
  isFetching = false,
  isError = false,
  onRefetch,
}: VersionListTableProps) {
  const t = useTranslations("DesignManagement");
  const format = useFormatter();
  const [activeTab, setActiveTab] = React.useState<TabValue>(DEFAULT_TABS[0].value);
  const [selectedVersionId, setSelectedVersionId] = React.useState<
    number | null
  >(null);

  const basePath =
    detailBasePath ?? `/projects/${projectId}/design-management`;

  // Built-in tabs are static — render them directly. Custom categories
  // are gone: the wire `DesignType` enum is the single source of truth
  // and designers scope a design to a category when they create it.
  const tabs = React.useMemo<
    Array<{
      value: TabValue;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
    }>
  >(
    () =>
      DEFAULT_TABS.map((d) => ({
        value: d.value,
        label: t(`tabs.${tabLabelKey(d.value)}`),
        icon: d.icon,
      })),
    [t],
  );

  // Filter logic:
  //   ALL          → every version (any DesignType).
  //   <DesignType> → only versions whose API `type` matches. The data we
  //                 receive from `useDesigns` has already mapped the raw
  //                 type onto the legacy `DrawingCategory` (see
  //                 `mapDesignTypeToCategory`); we mirror that mapping
  //                 here so the two representations stay consistent.
  const filtered = React.useMemo(() => {
    if (activeTab === "ALL") return versions;
    const targetCategory = mapDesignTypeToCategory(activeTab as DesignType);
    return versions.filter((v) => v.category === targetCategory);
  }, [versions, activeTab]);

  // `Publish Revision` applies to drafts that are either still being
  // worked on (`in_progress`) or were sent back by the owner for a
  // revision (`revision`). Designs waiting for owner review (`submitted`)
  // and approved/locked designs (`approved`) are excluded so we don't
  // start a new revision on top of a still-pending review.
  const publishableCount = React.useMemo(
    () =>
      versions.filter(
        (v) => v.status === "in_progress" || v.status === "revision",
      ).length,
    [versions],
  );

  // Reset selection when the active tab changes — otherwise the right
  // rail could end up showing comments for a version that's hidden.
  React.useEffect(() => {
    if (filtered.length === 0) {
      setSelectedVersionId(null);
      return;
    }
    const stillVisible = filtered.some((v) => v.id === selectedVersionId);
    if (!stillVisible) {
      setSelectedVersionId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedVersionId]);

  const selectedVersion: DesignVersion | null = React.useMemo(() => {
    if (selectedVersionId == null) return null;
    return filtered.find((v) => v.id === selectedVersionId) ?? null;
  }, [filtered, selectedVersionId]);

  // A row's id *is* the design id (see use-designs.ts), so it doubles as the
  // comment thread's targetId.
  const { comments } = useDesignComments(selectedVersionId);
  const createComment = useCreateDesignCommentMutation(selectedVersionId);

  const handleAddComment = React.useCallback(
    async (body: string) => {
      if (selectedVersionId == null) return;
      await createComment.mutateAsync(body);
    },
    [createComment, selectedVersionId],
  );

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {t(titleKey)}
            </h2>
            {/* Tiny badge — surfaces the count of `Design` rows so the
                user knows how many version entries they're scanning. */}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("history.totalBadge", { count: versions.length })}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t(subtitleKey)}
          </p>
        </div>
        {showActions ? (
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label={t("actions.newVersion")}
          >
            <NewVersionDialog
              nextCode={`V${(versions.length + 1).toFixed(1)}`}
              projectWorkingId={projectWorkingId}
              createdBy={createdBy}
              onCreated={(design) =>
                projectActionToast(
                  t("dialogs.newVersion.created", {
                    code: `V${design.version}`,
                  }),
                )
              }
              renderTrigger={(open) => (
                <Button
                  size="default"
                  variant="outline"
                  onClick={open}
                  aria-label={t("actions.newVersion")}
                >
                  <Plus aria-hidden />
                  {t("actions.newVersion")}
                </Button>
              )}
            />
            <PublishRevisionDialog
              versions={versions}
              onPublished={(code) =>
                projectActionToast(t("dialogs.publish.published", { code }))
              }
              renderTrigger={(open) => (
                <Button
                  size="default"
                  onClick={open}
                  disabled={publishableCount === 0}
                  aria-label={t("actions.publishRevision")}
                >
                  <Send aria-hidden />
                  {t("actions.publishRevision")}
                </Button>
              )}
            />
          </div>
        ) : null}
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
        aria-label={t("tabs.label")}
      >
        <TabsList
          variant="line"
          className="flex w-full items-center gap-2"
        >
          <div className="flex flex-1 items-center overflow-x-auto">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                <tab.icon className="size-3.5" aria-hidden />
                {tab.label}
              </TabsTrigger>
            ))}
          </div>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
          {isError ? (
            <DesignsErrorBanner onRetry={onRefetch} />
          ) : isLoading ? (
            <DesignsLoadingSkeleton />
          ) : (
            <DataTable<DesignVersion>
              rows={filtered}
              ariaLabel={t("pageTitle")}
              emptyState={t("table.empty")}
              rowKey={(row) => row.id}
              onRowClick={(row) => setSelectedVersionId(row.id)}
              defaultSort={{ id: "updatedAt", dir: "desc" }}
              columns={[
                {
                  id: "code",
                  header: t("table.version"),
                  accessor: "code",
                  widthClass: "w-[36%]",
                  primary: true,
                  cell: (row) => (
                    <span className="flex items-center gap-2.5 min-w-0">
                      <CodeBadge
                        code={row.code}
                        variant={
                          selectedVersionId === row.id ? "default" : "muted"
                        }
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {row.name}
                        </span>
                        {row.latestNote ? (
                          <span className="line-clamp-1 text-[11px] text-muted-foreground">
                            {row.latestNote}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  ),
                },
                {
                  id: "owner",
                  header: t("table.owner"),
                  accessor: (row) => row.owner.fullName,
                  widthClass: "w-[18%]",
                  cell: (row) => (
                    <span className="flex items-center gap-2">
                      <OwnerAvatar
                        name={row.owner.fullName}
                        color={row.owner.avatarColor}
                      />
                      <span className="truncate text-xs text-foreground/90">
                        {row.owner.fullName}
                      </span>
                    </span>
                  ),
                },
                {
                  id: "status",
                  header: t("table.status"),
                  accessor: "status",
                  widthClass: "w-[12%]",
                  sortable: true,
                  cell: (row) => <StatusDot status={row.status} />,
                },
                {
                  id: "drawingCount",
                  header: t("table.drawings"),
                  accessor: "drawingCount",
                  align: "right",
                  widthClass: "w-[10%]",
                  sortable: true,
                  cell: (row) => (
                    <span className="font-mono text-xs tabular-nums text-foreground/90">
                      {t("table.drawingsCount", { count: row.drawingCount })}
                    </span>
                  ),
                },
                {
                  id: "updatedAt",
                  header: t("table.lastUpdated"),
                  accessor: "updatedAt",
                  widthClass: "w-[14%]",
                  sortable: true,
                  cell: (row) => (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ChevronRight
                        className="size-3 text-muted-foreground/50"
                        aria-hidden
                      />
                      {format.dateTime(row.updatedAt, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  ),
                },
                {
                  id: "open",
                  header: "",
                  accessor: (row) => row.id,
                  align: "right",
                  widthClass: "w-[10%]",
                  cell: (row) => (
                    <span
                      onClick={(event) => {
                        // Prevent the row-level click handler from firing
                        // when the user explicitly clicks the open affordance.
                        // The row handler is attached to the <tr>, so stopping
                        // propagation here keeps selection untouched.
                        event.stopPropagation();
                      }}
                    >
                      <Button
                        asChild
                        size="icon-sm"
                        variant={
                          selectedVersionId === row.id ? "secondary" : "ghost"
                        }
                        aria-label={`${t("table.open")} ${row.code}`}
                      >
                        <Link href={`${basePath}/${row.id}`}>
                          <ExternalLink aria-hidden />
                        </Link>
                      </Button>
                    </span>
                  ),
                },
              ]}
            />
          )}
        </div>

        <div className="flex min-h-0 flex-col lg:sticky lg:top-4 lg:self-start">
          <VersionCommentsPanel
            version={selectedVersion}
            comments={comments}
            onAddComment={handleAddComment}
          />
        </div>
      </div>

      {/* Mobile-only comments panel — stacked under the table to avoid
          cramming into the side rail on small viewports. The lg+ view
          already shows the panel in the right rail above. */}
      <div className="lg:hidden">
        <VersionCommentsPanel
            version={selectedVersion}
            comments={comments}
            onAddComment={handleAddComment}
          />
      </div>

      {/* Background-refetch indicator — kept below the table so it doesn't
          shift the layout on every poll. */}
      {isFetching && !isLoading && !isError ? (
        <p
          aria-live="polite"
          className="flex items-center justify-center gap-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          <Loader2 className="size-3 animate-spin" aria-hidden />
          {t("refreshing")}
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Loading + error helpers

function DesignsLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[0, 1, 2, 3].map((i) => (
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

function DesignsErrorBanner({ onRetry }: { onRetry?: () => void }) {
  const t = useTranslations("DesignManagement");
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 p-8 text-center"
    >
      <p className="text-sm font-medium text-foreground">
        {t("errorBanner.title")}
      </p>
      <p className="max-w-md text-xs text-muted-foreground">
        {t("errorBanner.subtitle")}
      </p>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {t("errorBanner.retry")}
        </Button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// i18n key resolver

/**
 * Map a tab value (`ALL` or a `DesignType`) back to the matching
 * i18n key under `DesignManagement.tabs.*`. The keys mirror the
 * enum values exactly so we don't need a translation fallback.
 */
function tabLabelKey(value: TabValue): string {
  if (value === "ALL") return "all";
  switch (value) {
    case "concept":
      return "concept";
    case "layout_2d":
      return "layout2d";
    case "render_3d":
      return "render3d";
    case "technical_drawing":
      return "technicalDrawing";
    default:
      return "all";
  }
}
