"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

import { CodeBadge } from "@/components/data-table";
import { cn } from "@/lib/utils";

import type { TechnicalDrawing } from "@/lib/projects/technical-drawing-types";

interface DrawingTreeProps {
  drawings: TechnicalDrawing[];
  selectedId: number | null;
  onSelect: (drawing: TechnicalDrawing) => void;
}

/**
 * Vertical list of drawings within the currently active tab. Click an
 * item to (a) select it in state, (b) drive the PdfViewer, (c) scope the
 * comments thread. The selected row gets a left accent + tinted
 * background — keyboard navigation is delegated to the native `<button>`
 * so screen readers get standard semantics for free.
 */
export function DrawingTree({ drawings, selectedId, onSelect }: DrawingTreeProps) {
  const t = useTranslations("TechnicalDrawings");

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
          {drawings.length}
        </span>
      </header>

      {drawings.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-muted-foreground">
          {t("tree.empty")}
        </p>
      ) : (
        <ul role="list" className="flex max-h-96 flex-col overflow-y-auto">
          {drawings.map((drawing) => {
            const selected = selectedId === drawing.id;
            return (
              <li key={drawing.id} className="border-b border-border/40 last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelect(drawing)}
                  aria-current={selected ? "true" : undefined}
                  aria-label={t("tree.selectAria", { code: drawing.code })}
                  className={cn(
                    "group/tree flex w-full items-center gap-2 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset",
                    selected
                      ? "bg-primary/5 text-foreground"
                      : "hover:bg-muted/40",
                  )}
                >
                  <ChevronRight
                    aria-hidden
                    className={cn(
                      "size-3 shrink-0 text-muted-foreground/50 transition-transform",
                      selected && "translate-x-0.5 text-primary",
                    )}
                  />
                  <CodeBadge code={drawing.code} variant={selected ? "default" : "muted"} />
                  <span
                    className={cn(
                      "flex min-w-0 flex-1 flex-col",
                    )}
                  >
                    <span
                      className={cn(
                        "truncate text-xs font-medium",
                        selected ? "text-foreground" : "text-foreground/90",
                      )}
                    >
                      {drawing.name}
                    </span>
                    {drawing.note ? (
                      <span className="line-clamp-1 text-[10px] text-muted-foreground">
                        {drawing.note}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}