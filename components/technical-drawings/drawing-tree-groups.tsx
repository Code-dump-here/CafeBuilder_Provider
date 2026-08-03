"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
} from "lucide-react";

import { CodeBadge } from "@/components/data-table";
import { cn } from "@/lib/utils";

import type {
  DrawingGroup,
  TechnicalDrawing,
} from "@/features/projects/technical-drawing-types";

interface DrawingTreeGroupsProps {
  groups: DrawingGroup[];
  drawingsById: Map<number, TechnicalDrawing>;
  /** Currently selected drawing id, if any. */
  selectedId: number | null;
  /** Project id, used to build per-row links. */
  projectId: string;
  /**
   * Set of group ids that should be open by default. Subsequent toggles
   * use local state.
   */
  defaultOpenGroupIds?: number[];
}

const ICON: Record<NonNullable<DrawingGroup["icon"]>, React.ComponentType<{ className?: string }>> = {
  plans: Layers,
  elevations: Layers,
  sections: Layers,
  renders: Layers,
  contract: FileText,
};

/**
 * Grouped left-tree navigator for the drawing-detail page.
 *
 * Each group is collapsible; clicking a drawing navigates to its detail
 * route via `next/link` (so it's deep-linkable and survives a refresh).
 * The selected row gets the same accent treatment as the lighter tree
 * on the index page.
 */
export function DrawingTreeGroups({
  groups,
  drawingsById,
  selectedId,
  projectId,
  defaultOpenGroupIds,
}: DrawingTreeGroupsProps) {
  const t = useTranslations("TechnicalDrawings");

  const [openIds, setOpenIds] = React.useState<Set<number>>(() => {
    return new Set(defaultOpenGroupIds ?? groups.map((g) => g.id));
  });

  const toggle = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <nav
      aria-label={t("tree.title")}
      className="flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <h3 className="text-xs font-semibold text-foreground">
          {t("tree.title")}
        </h3>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {groups.reduce((acc, g) => acc + g.drawingIds.length, 0)}
        </span>
      </header>

      <ul role="list" className="flex flex-col overflow-y-auto max-h-112">
        {groups.map((group) => {
          const isOpen = openIds.has(group.id);
          const Icon = ICON[group.icon ?? "plans"];
          return (
            <li key={group.id} className="border-b border-border/40 last:border-b-0">
              <button
                type="button"
                onClick={() => toggle(group.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-foreground/90 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset"
              >
                {isOpen ? (
                  <ChevronDown className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex-1 truncate">{group.label}</span>
                <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                  {group.drawingIds.length}
                </span>
              </button>

              {isOpen ? (
                <ul role="list" className="flex flex-col bg-muted/10 pb-1">
                  {group.drawingIds.map((drawingId) => {
                    const drawing = drawingsById.get(drawingId);
                    if (!drawing) return null;
                    const selected = selectedId === drawing.id;
                    return (
                      <li key={drawing.id}>
                        <Link
                          href={`/projects/${projectId}/technical-drawings/${drawing.id}`}
                          aria-current={selected ? "page" : undefined}
                          className={cn(
                            "group/row flex items-center gap-2 py-1.5 pl-7 pr-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset",
                            selected
                              ? "bg-primary/5 text-foreground"
                              : "text-foreground/90 hover:bg-muted/40",
                          )}
                        >
                          <ChevronRight
                            aria-hidden
                            className={cn(
                              "size-3 shrink-0 text-muted-foreground/40 transition-transform",
                              selected && "translate-x-0.5 text-primary",
                            )}
                          />
                          <CodeBadge
                            code={drawing.code}
                            variant={selected ? "default" : "muted"}
                          />
                          <span className="min-w-0 flex-1 truncate text-xs">
                            {drawing.name}
                          </span>
                        </Link>
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