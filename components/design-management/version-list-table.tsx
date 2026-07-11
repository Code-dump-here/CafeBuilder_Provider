"use client";

import * as React from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import {
  Box,
  ChevronRight,
  ExternalLink,
  Layers,
  MessageSquare,
  PencilRuler,
  Plus,
  Send,
  StickyNote,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CodeBadge,
  OwnerAvatar,
  StatusDot,
} from "@/components/data-table";
import { DataTable } from "@/components/data-table/data-table";
import { cn } from "@/lib/utils";

import { projectActionToast } from "@/components/project-overview/project-action-toast";
import { VersionCommentsPanel } from "@/components/design-management/version-comments-panel";
import { useVersionComments } from "@/lib/projects/use-version-comments";
import {
  NewVersionDialog,
  PublishRevisionDialog,
  AddCategoryDialog,
} from "./dialogs";
import {
  CustomCategoriesProvider,
  useCustomCategories,
  type CustomCategory,
} from "./custom-categories-context";
import type {
  DesignVersion,
  DrawingCategory,
} from "@/lib/projects/design-version-types";

interface VersionListTableProps {
  projectId: string;
  versions: DesignVersion[];
  /** Render the right-hand action buttons (New Version, Publish Revision). */
  showActions?: boolean;
  /**
   * Optional base path for the per-version detail page. If provided,
   * the eye icon on each row links here; row click still drives
   * in-page selection. Defaults to `/projects/{id}/design-management`.
   */
  detailBasePath?: string;
}

// Tab values the table understands. The "ALL" pseudo-category is a
// client-side constant; everything else maps 1:1 to a `DrawingCategory`
// or to a custom category id from `CustomCategoriesProvider`.
type TabValue = "ALL" | DrawingCategory | string;

// Built-in tabs that ship with the page. Hidden tabs (REVISION,
// FLOOR_PLAN, ELEVATION, SECTION) are intentionally omitted from the
// default list — designers reveal them by adding a custom category.
const DEFAULT_TABS: ReadonlyArray<{ value: TabValue; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "ALL", icon: Layers },
  { value: "3D", icon: Box },
];

const TAB_ICON: Record<TabValue, React.ComponentType<{ className?: string }>> = {
  ALL: Layers,
  REVISION: StickyNote,
  FLOOR_PLAN: PencilRuler,
  "3D": Box,
  ELEVATION: PencilRuler,
  SECTION: PencilRuler,
};

/**
 * The version list surface — file-list style.
 *
 *   ┌─ Header (title + actions) ────────────────────────────────────┐
 *   │  Title                                       [+ New Version]   │
 *   │  Subtitle                                    [Publish Revision] │
 *   ├─ Tabs (All / Revision / Floor Plan / 3D / Elevation / Section) ┤
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
  versions,
  showActions = true,
  detailBasePath,
}: VersionListTableProps) {
  return (
    <CustomCategoriesProvider>
      <VersionListTableInner
        projectId={projectId}
        versions={versions}
        showActions={showActions}
        detailBasePath={detailBasePath}
      />
    </CustomCategoriesProvider>
  );
}

function VersionListTableInner({
  projectId,
  versions,
  showActions = true,
  detailBasePath,
}: VersionListTableProps) {
  const t = useTranslations("DesignManagement");
  const format = useFormatter();
  const { custom, add, remove } = useCustomCategories();
  const [activeTab, setActiveTab] = React.useState<TabValue>(DEFAULT_TABS[0].value);
  const [selectedVersionId, setSelectedVersionId] = React.useState<
    number | null
  >(null);

  const basePath =
    detailBasePath ?? `/projects/${projectId}/design-management`;

  // Build the full tab list at render time — built-in (ALL, 3D) plus
  // user-defined customs. Order matters: built-ins first, then customs
  // in the order they were added.
  const tabs = React.useMemo<Array<{ value: TabValue; label: string; icon: React.ComponentType<{ className?: string }>; removable: boolean }>>(
    () => [
      ...DEFAULT_TABS.map((d) => ({
        value: d.value,
        label: t(`tabs.${labelKey(d.value)}`),
        icon: d.icon,
        removable: false,
      })),
      ...custom.map((c: CustomCategory) => ({
        value: c.id,
        label: c.label,
        icon: TAB_ICON[c.id as DrawingCategory] ?? PencilRuler,
        removable: true,
      })),
    ],
    [custom, t],
  );

  const handleRemoveTab = (tabValue: TabValue, label: string) => {
    // Only custom tabs are removable — the callback only ever fires for
    // those, but guard anyway in case the consumer wires it differently.
    const isCustom = custom.some((c) => c.id === tabValue);
    if (!isCustom) return;
    remove(tabValue);
    projectActionToast(t("customCategory.removeConfirm", { label }));
    // If the removed tab was active, fall back to the first default tab.
    if (activeTab === tabValue) {
      setActiveTab(DEFAULT_TABS[0].value);
    }
  };

  // Filter logic:
  //   ALL          → every version
  //   Built-in     → match `version.category`
  //   Custom       → match `version.category` OR any version that has
  //                  been tagged with this custom id. Today we only
  //                  have category-based tagging, so custom tabs show
  //                  versions whose `category` matches the id, or any
  //                  version when the id doesn't collide with a built-in
  //                  (placeholder behaviour — real tagging wires in once
  //                  the backend supports it).
  const filtered = React.useMemo(() => {
    if (activeTab === "ALL") return versions;
    return versions.filter((v) => {
      if (v.category === activeTab) return true;
      const customEntry = custom.find((c) => c.id === activeTab);
      if (!customEntry) return false;
      // Fallback: if the custom label happens to match a built-in
      // category label, surface those versions too.
      return v.category.toLowerCase() === customEntry.id.toLowerCase();
    });
  }, [versions, activeTab, custom]);

  const workingCount = React.useMemo(
    () => versions.filter((v) => v.status === "WORKING").length,
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

  const comments = useVersionComments(selectedVersionId);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">
            {t("pageTitle")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("pageSubtitle")}
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
              onCreated={(code) =>
                projectActionToast(t("dialogs.newVersion.created", { code }))
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
                  disabled={workingCount === 0}
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
          className="flex w-full items-center justify-between gap-2"
        >
          <div className="flex flex-1 items-center overflow-x-auto">
            {tabs.map((tab) => (
              <CustomTabTrigger
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={tab.icon}
                removable={tab.removable}
                onRemove={() => handleRemoveTab(tab.value, tab.label)}
              />
            ))}
          </div>
          <AddCategoryDialog
            onAdd={(label) => {
              const created = add(label);
              return created ? { id: String(created.id), label: created.label } : null;
            }}
            renderTrigger={(open) => (
              <Button
                size="sm"
                variant="ghost"
                onClick={open}
                aria-label={t("customCategory.add")}
                className="size-7 shrink-0 rounded-md p-0"
              >
                <Plus aria-hidden className="size-3.5" />
              </Button>
            )}
          />
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
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
        </div>

        <div className="flex min-h-0 flex-col lg:sticky lg:top-4 lg:self-start">
          <VersionCommentsPanel version={selectedVersion} comments={comments} />
        </div>
      </div>

      {/* Mobile-only comments panel — stacked under the table to avoid
          cramming into the side rail on small viewports. The lg+ view
          already shows the panel in the right rail above. */}
      <div className="lg:hidden">
        <VersionCommentsPanel version={selectedVersion} comments={comments} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Helpers

/**
 * Map a tab value back to the i18n key for built-in categories. Custom
 * categories never reach this branch (their labels come straight from
 * the custom-categories context).
 */
function labelKey(value: TabValue): "all" | "revision" | "floorPlan" | "threeD" | "elevation" | "section" {
  switch (value) {
    case "ALL":
      return "all";
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
    default:
      return "all";
  }
}

// ---------------------------------------------------------------------------
// CustomTabTrigger
//
// Wraps the standard `TabsTrigger` with a context-menu affordance for
// removable custom categories. Right-click anywhere on the tab opens a
// popover anchored to the trigger that confirms removal. Built-in tabs
// skip the menu entirely.

interface CustomTabTriggerProps {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  removable: boolean;
  onRemove: () => void;
}

function CustomTabTrigger({
  value,
  label,
  icon: Icon,
  removable,
  onRemove,
}: CustomTabTriggerProps) {
  const t = useTranslations("DesignManagement");
  const [menu, setMenu] = React.useState<{
    x: number;
    y: number;
  } | null>(null);

  // Close on any outside interaction. Listening on `pointerdown` (not
  // `click`) so the menu closes *before* the next mouseup fires — that
  // way a stray click on the trigger label doesn't get swallowed.
  React.useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const handleContextMenu = (event: React.MouseEvent) => {
    if (!removable) return;
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY });
  };

  const handleRemove = () => {
    onRemove();
    setMenu(null);
  };

  return (
    <>
      <TabsTrigger
        value={value}
        className="gap-1.5"
        onContextMenu={handleContextMenu}
      >
        <Icon className="size-3.5" aria-hidden />
        {label}
      </TabsTrigger>
      {menu ? (
        <div
          role="menu"
          style={{ top: menu.y, left: menu.x }}
          className="fixed z-50 min-w-44 overflow-hidden rounded-md border border-border/60 bg-popover p-1 text-popover-foreground shadow-md"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleRemove}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground/90 hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
          >
            <Trash2 aria-hidden className="size-3.5 text-muted-foreground" />
            <span className="flex flex-col items-start leading-tight">
              <span>{t("customCategory.remove")}</span>
              <span className="text-[10px] text-muted-foreground">
                {t("customCategory.removeConfirm", { label })}
              </span>
            </span>
          </button>
        </div>
      ) : null}
    </>
  );
}