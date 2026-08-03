"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Eye } from "lucide-react";

import { CodeBadge, OwnerAvatar } from "@/components/data-table";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import type {
  TechnicalDrawing,
  TechnicalDrawingKind,
} from "@/features/projects/technical-drawing-types";

interface DrawingsTableProps {
  drawings: TechnicalDrawing[];
  selectedId: number | null;
  /**
   * Called when the user clicks a row or the eye icon. The page decides
   * whether to update local state (index page) or navigate (detail
   * navigation, e.g. from a listing into the detail route).
   */
  onSelect: (drawing: TechnicalDrawing) => void;
  /**
   * Active tab (`3D` | `2D` | `CONTRACT`). Tabs are state-only and
   * filter the table — they don't navigate so a designer can flip back
   * and forth without losing their place in the viewer.
   */
  activeTab: TechnicalDrawingKind;
  onTabChange: (tab: TechnicalDrawingKind) => void;
  /** Project id used to build per-row links. */
  projectId: string;
}

const TAB_VALUES: TechnicalDrawingKind[] = ["3D", "2D", "CONTRACT"];

const KIND_TONE: Record<TechnicalDrawingKind, string> = {
  "3D": "bg-primary/15 text-primary",
  "2D": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CONTRACT: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

/**
 * Tabbed table of drawings within the active set. Selecting a row drives
 * the `onSelect` callback (which the page uses to swap the viewer +
 * comments). Rows aren't full-row clickable here because they're the
 * secondary navigation surface — the drawing tree on the left is the
 * primary one.
 */
export function DrawingsTable({
  drawings,
  selectedId,
  onSelect,
  activeTab,
  onTabChange,
  projectId,
}: DrawingsTableProps) {
  const t = useTranslations("TechnicalDrawings");

  return (
    <section className="flex flex-col gap-3">
      <Tabs
        value={activeTab}
        onValueChange={(v) => onTabChange(v as TechnicalDrawingKind)}
        aria-label={t("tabs.label")}
      >
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          {TAB_VALUES.map((value) => (
            <TabsTrigger key={value} value={value}>
              {t(`tabs.${value === "3D" ? "3d" : value.toLowerCase()}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
        <DataTable<TechnicalDrawing>
          rows={drawings}
          ariaLabel={t("pageTitle")}
          emptyState={t("table.empty")}
          rowKey={(row) => row.id}
          rowHref={(row) => `/projects/${projectId}/technical-drawings/${row.id}`}
          defaultSort={{ id: "code", dir: "asc" }}
          columns={[
            {
              id: "code",
              header: t("table.code"),
              accessor: "code",
              widthClass: "w-[12%]",
              primary: true,
              cell: (row) => (
                <CodeBadge
                  code={row.code}
                  variant={selectedId === row.id ? "default" : "muted"}
                />
              ),
            },
            {
              id: "name",
              header: t("table.name"),
              accessor: "name",
              widthClass: "w-[36%]",
              cell: (row) => (
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {row.name}
                  </span>
                  {row.note ? (
                    <span className="line-clamp-1 text-[11px] text-muted-foreground">
                      {row.note}
                    </span>
                  ) : null}
                </span>
              ),
            },
            {
              id: "kind",
              header: t("table.kind"),
              accessor: "kind",
              widthClass: "w-[10%]",
              sortable: true,
              cell: (row) => (
                <span
                  className={cn(
                    "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    KIND_TONE[row.kind],
                  )}
                >
                  {row.kind}
                </span>
              ),
            },
            {
              id: "scale",
              header: t("table.scale"),
              accessor: "scale",
              widthClass: "w-[8%]",
              cell: (row) => (
                <span className="font-mono text-xs text-foreground/90">
                  {row.scale ?? "—"}
                </span>
              ),
            },
            {
              id: "author",
              header: t("table.author"),
              accessor: (row) => row.author.fullName,
              widthClass: "w-[18%]",
              cell: (row) => (
                <span className="flex items-center gap-2">
                  <OwnerAvatar
                    name={row.author.fullName}
                    color={row.author.avatarColor}
                  />
                  <span className="truncate text-xs text-foreground/90">
                    {row.author.fullName}
                  </span>
                </span>
              ),
            },
            {
              id: "updatedAt",
              header: t("table.updatedAt"),
              accessor: "updatedAt",
              widthClass: "w-[12%]",
              sortable: true,
              cell: (row) => <UpdatedCell value={row.updatedAt} />,
            },
            {
              id: "actions",
              header: "",
              accessor: (row) => row.id,
              align: "right",
              widthClass: "w-[4%]",
              cell: (row) => (
                <Button
                  size="icon-xs"
                  variant={selectedId === row.id ? "secondary" : "ghost"}
                  onClick={() => onSelect(row)}
                  aria-label={`${t("table.open")} ${row.code}`}
                >
                  <Eye aria-hidden />
                </Button>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}

function UpdatedCell({ value }: { value: Date }) {
  const format = useFormatter();
  return (
    <span className="text-xs text-muted-foreground">
      {format.dateTime(value, {
        dateStyle: "medium",
        timeStyle: "short",
      })}
    </span>
  );
}