"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Public API
//
// <DataTable> is a generic, column-driven table primitive used across the
// app. It's intentionally *not* a "data grid" — no virtualization, no
// inline editing, no row reordering. Just the boring stuff done well:
//   - typed column config (`accessorKey` is inferred from T)
//   - sort by column with a clickable header + visual indicator
//   - compact density (smaller cells, no row hover by default)
//   - optional `rowHref` → entire row becomes a client-side Link
//   - `emptyState` rendered when rows.length === 0
//
// Keep this dumb: filtering, pagination, and column visibility are
// handled outside the component (by the page or hook). Anything smarter
// belongs in a feature-specific wrapper.

export interface DataTableColumn<T> {
  /** Stable key — used for sort + React key. Must be unique per row. */
  id: string;
  /** Header label. Pass a string or a render function for custom markup. */
  header: React.ReactNode | ((ctx: DataTableHeaderContext<T>) => React.ReactNode);
  /**
   * Key into the row object OR a function returning a sortable scalar.
   * When `sortable` is true the returned value is compared with `<` / `>`.
   */
  accessor: keyof T | ((row: T) => string | number | Date | null | undefined);
  /** Cell renderer. Defaults to the accessor value. */
  cell?: (row: T) => React.ReactNode;
  /** Tailwind width class, e.g. "w-[20%]". */
  widthClass?: string;
  /** Header alignment; cascades to body cells. */
  align?: "left" | "right" | "center";
  /** Whether this column can be sorted. */
  sortable?: boolean;
  /** Whether the cell should be rendered as primary text (slightly bigger). */
  primary?: boolean;
}

export interface DataTableHeaderContext<T> {
  sortDir: SortDirection | null;
  toggleSort: () => void;
  column: DataTableColumn<T>;
}

export type SortDirection = "asc" | "desc";

export interface DataTableProps<T> {
  rows: T[];
  columns: Array<DataTableColumn<T>>;
  /** Default sort column id + direction. */
  defaultSort?: { id: string; dir: SortDirection };
  /** Stable React key for each row. Falls back to row index. */
  rowKey?: (row: T) => string | number;
  /**
   * If provided AND no `onRowClick` is set, every row becomes a
   * `next/link` Link to this href (the row renders with `role="link"`
   * + a router push for keyboard support).
   *
   * Prefer using `onRowClick` for in-page state changes (e.g. selecting
   * a version in a comments panel) and reserve `rowHref` for true
   * cross-page navigation.
   */
  rowHref?: (row: T) => string | null;
  /** Click handler — fires alongside any `rowHref` navigation. */
  onRowClick?: (row: T) => void;
  /** Rendered when `rows.length === 0`. */
  emptyState?: React.ReactNode;
  /** Add classes to the wrapping `<Table>` (e.g. custom widths). */
  className?: string;
  /** ARIA label for the table element. */
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// Sort helpers

function readValue<T>(
  row: T,
  accessor: DataTableColumn<T>["accessor"],
): string | number | Date | null | undefined {
  if (typeof accessor === "function") return accessor(row);
  return row[accessor] as string | number | Date | null | undefined;
}

function renderValue(
  value: string | number | Date | null | undefined,
): React.ReactNode {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return value as React.ReactNode;
}

function compareValues(
  a: string | number | Date | null | undefined,
  b: string | number | Date | null | undefined,
): number {
  // Nullish sorts to the end regardless of direction — keeps "drafts"
  // rows below real values without special-casing in the page.
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

// ---------------------------------------------------------------------------
// Component

export function DataTable<T>({
  rows,
  columns,
  defaultSort,
  rowKey,
  rowHref,
  onRowClick,
  emptyState,
  className,
  ariaLabel,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<{ id: string; dir: SortDirection } | null>(
    defaultSort ?? null,
  );

  const sortedRows = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.id);
    if (!col || !col.sortable) return rows;
    const copy = rows.slice();
    copy.sort((a, b) => {
      const cmp = compareValues(readValue(a, col.accessor), readValue(b, col.accessor));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, columns]);

  const toggleSort = React.useCallback(
    (columnId: string) => {
      setSort((current) => {
        if (!current || current.id !== columnId) {
          return { id: columnId, dir: "asc" };
        }
        if (current.dir === "asc") return { id: columnId, dir: "desc" };
        return null; // third click clears sort
      });
    },
    [],
  );

  const colCount = columns.length;
  const keyFn = rowKey ?? ((_row: T, i: number) => i);

  return (
    <Table className={cn("text-xs", className)} aria-label={ariaLabel}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => (
            <DataTableHeaderCell
              key={col.id}
              column={col}
              sortDir={sort?.id === col.id ? sort.dir : null}
              toggleSort={() => toggleSort(col.id)}
            />
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRows.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={colCount}
              className="h-20 text-center text-xs text-muted-foreground"
            >
              {emptyState ?? null}
            </TableCell>
          </TableRow>
        ) : (
          sortedRows.map((row, i) => {
            const key = keyFn(row, i);
            const href = rowHref?.(row) ?? null;
            return (
              <DataTableRow
                key={key}
                columns={columns}
                row={row}
                href={href}
                onClick={onRowClick}
              />
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Header cell

interface DataTableHeaderCellProps<T> {
  column: DataTableColumn<T>;
  sortDir: SortDirection | null;
  toggleSort: () => void;
}

function DataTableHeaderCell<T>({
  column,
  sortDir,
  toggleSort,
}: DataTableHeaderCellProps<T>) {
  const align = column.align ?? "left";
  const ctx: DataTableHeaderContext<T> = { sortDir, toggleSort, column };
  const content =
    typeof column.header === "function" ? column.header(ctx) : column.header;

  if (!column.sortable) {
    return (
      <TableHead
        className={cn(
          "h-8 bg-muted/40 text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
          align === "right" && "text-right",
          align === "center" && "text-center",
          column.widthClass,
        )}
      >
        {content}
      </TableHead>
    );
  }

  return (
    <TableHead
      className={cn(
        "h-8 bg-muted/40 text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
        align === "right" && "text-right",
        align === "center" && "text-center",
        column.widthClass,
      )}
    >
      <button
        type="button"
        onClick={toggleSort}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm -mx-1 px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          sortDir && "text-foreground",
        )}
        aria-label={`Sort by ${typeof content === "string" ? content : column.id}`}
      >
        {content}
        <SortIndicator dir={sortDir} />
      </button>
    </TableHead>
  );
}

function SortIndicator({ dir }: { dir: SortDirection | null }) {
  if (!dir) {
    return (
      <span
        aria-hidden
        className="inline-flex flex-col leading-none text-muted-foreground/40"
      >
        <span className="text-[6px]">▲</span>
        <span className="-mt-0.5 text-[6px]">▼</span>
      </span>
    );
  }
  return (
    <span aria-hidden className="leading-none text-foreground">
      {dir === "asc" ? "▲" : "▼"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Body row

interface DataTableRowProps<T> {
  columns: Array<DataTableColumn<T>>;
  row: T;
  href: string | null;
  onClick?: (row: T) => void;
}

function DataTableRow<T>({
  columns,
  row,
  href,
  onClick,
}: DataTableRowProps<T>) {
  const labelValue = readValue(
    row,
    columns[0]?.accessor ?? ("id" as keyof T),
  );
  const label =
    typeof labelValue === "string" || typeof labelValue === "number"
      ? String(labelValue)
      : undefined;

  // Static row — no click handler, no navigation.
  if (!href && !onClick) {
    return (
      <TableRow className="group/row transition-colors hover:bg-muted/40">
        {columns.map((col) => (
          <TableCell
            key={col.id}
            className={cellClass(col)}
          >
            {col.cell?.(row) ?? renderValue(readValue(row, col.accessor))}
          </TableCell>
        ))}
      </TableRow>
    );
  }

  // Interactive row (with or without navigation). The `<tr>` gets
  // `role="button"` + `tabIndex=0` + click/Enter handler. When `href`
  // is set we use `role="link"` instead and trigger a router push.
  return (
    <ClickableRow
      href={href}
      label={label}
      onClick={onClick ? () => onClick(row) : undefined}
    >
      {columns.map((col) => (
        <TableCell key={col.id} className={cellClass(col)}>
          {col.cell?.(row) ?? renderValue(readValue(row, col.accessor))}
        </TableCell>
      ))}
    </ClickableRow>
  );
}

function cellClass(
  col: { align?: "left" | "right" | "center"; primary?: boolean },
) {
  return cn(
    "h-10 px-3 align-middle",
    col.align === "right" && "text-right",
    col.align === "center" && "text-center",
    col.primary
      ? "text-sm font-medium text-foreground"
      : "text-xs text-foreground/80",
  );
}

// ---------------------------------------------------------------------------
// ClickableRow
//
// A `<tr>` that behaves like a button (or a link when `href` is set).
// Uses the App Router's `useRouter` to navigate on click / Enter.
// Inline event handlers keep the row semantic ("row that opens X")
// without rendering an overlay that would swallow cell-level events.

function ClickableRow({
  href,
  label,
  onClick,
  children,
}: {
  href: string | null;
  label: string | undefined;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isLink = href !== null;

  const go = React.useCallback(() => {
    if (onClick) onClick();
    if (href) router.push(href);
  }, [router, href, onClick]);

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        go();
      }
    },
    [go],
  );

  return (
    <TableRow
      role={isLink ? "link" : "button"}
      tabIndex={0}
      aria-label={
        label
          ? isLink
            ? `Open ${label}`
            : `Select ${label}`
          : isLink
            ? "Open"
            : "Select"
      }
      onClick={go}
      onKeyDown={onKeyDown}
      className="group/row cursor-pointer transition-colors hover:bg-muted/40 focus:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset"
    >
      {children}
    </TableRow>
  );
}