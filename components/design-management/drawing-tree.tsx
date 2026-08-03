"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  Hash,
  Layers,
  Search,
  StickyNote,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type {
  DesignDrawing,
  DrawingCategory,
} from "@/features/projects/design-version-types";

interface DrawingTreeProps {
  drawings: DesignDrawing[];
  selectedId: number | null;
  onSelect: (drawing: DesignDrawing) => void;
  onPreview: (drawing: DesignDrawing | null) => void;
}

interface TreeGroup {
  category: DrawingCategory;
  labelKey: "revision" | "floorPlan" | "threeD" | "elevation" | "section";
  drawings: DesignDrawing[];
}

/**
 * Left-rail drawing tree. Groups drawings by category, with
 * collapsible sub-trees, an inline search filter, and an active-row
 * highlight that mirrors the viewer's selection.
 *
 * The first folder (FLOOR_PLAN) opens by default — that's the
 * most-clicked category in the design-management list, so users
 * land inside the working area on first paint.
 */
export function DrawingTree({
  drawings,
  selectedId,
  onSelect,
  onPreview,
}: DrawingTreeProps) {
  const t = useTranslations("DesignManagement");

  const groups = React.useMemo<TreeGroup[]>(() => {
    const order: TreeGroup["category"][] = [
      "FLOOR_PLAN",
      "ELEVATION",
      "SECTION",
      "3D",
      "REVISION",
    ];
    return order
      .map((category) => ({
        category,
        labelKey:
          category === "FLOOR_PLAN"
            ? "floorPlan"
            : category === "3D"
              ? "threeD"
              : (category.toLowerCase() as TreeGroup["labelKey"]),
        drawings: drawings.filter((d) => d.category === category),
      }))
      .filter((g) => g.drawings.length > 0);
  }, [drawings]);

  const [search, setSearch] = React.useState("");
  // Default open state: first two folders open so the user sees
  // content immediately. Others collapse.
  const [openGroups, setOpenGroups] = React.useState<Set<DrawingCategory>>(
    () =>
      new Set(
        groups.slice(0, 2).map((g) => g.category),
      ),
  );

  const toggleGroup = React.useCallback((category: DrawingCategory) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const filteredGroups = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        drawings: g.drawings.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.code.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.drawings.length > 0);
  }, [groups, search]);

  if (drawings.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
        {t("version.noDrawings")}
      </div>
    );
  }

  return (
    <nav
      aria-label={t("tree.label")}
      className="flex h-full flex-col gap-3 overflow-y-auto p-4"
    >
      <header className="flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("tree.heading")}
        </p>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("tree.searchPlaceholder")}
            aria-label={t("tree.searchPlaceholder")}
            className="h-8 pl-7 text-xs"
          />
        </div>
      </header>

      <ul className="flex flex-col gap-1 text-xs">
        {filteredGroups.map((group) => {
          const isOpen = openGroups.has(group.category) || search.length > 0;
          return (
            <li key={group.category} className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.category)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-foreground/80 hover:bg-muted/60"
              >
                {isOpen ? (
                  <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight aria-hidden className="size-3.5 text-muted-foreground" />
                )}
                <Layers
                  aria-hidden
                  className="size-3.5 text-muted-foreground"
                />
                <span className="flex-1 truncate font-semibold uppercase tracking-wider">
                  {t(`tabs.${group.labelKey}`)}
                </span>
                <span className="rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                  {group.drawings.length}
                </span>
              </button>

              {isOpen ? (
                <ul className="ml-3 flex flex-col gap-0.5 border-l border-border/60 pl-2">
                  {group.drawings.map((drawing) => {
                    const isSelected = drawing.id === selectedId;
                    return (
                      <li key={drawing.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(drawing);
                            onPreview(drawing);
                          }}
                          aria-current={isSelected ? "page" : undefined}
                          className={cn(
                            "flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left",
                            isSelected
                              ? "bg-primary/10 text-primary"
                              : "text-foreground/80 hover:bg-muted/60",
                          )}
                        >
                          <StickyNote
                            aria-hidden
                            className={cn(
                              "size-3 shrink-0",
                              isSelected ? "text-primary" : "text-muted-foreground",
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {drawing.name}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                            <Hash
                              aria-hidden
                              className="size-2.5"
                            />
                            {drawing.code}
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
      </ul>
    </nav>
  );
}