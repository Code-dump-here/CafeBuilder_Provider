import * as React from "react";
import { FileText, Plus, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Dashed-border "nothing here yet" panel with a create action.
 *
 * Extracted from the contracts and survey pages, which held identical markup
 * differing only by i18n namespace. Strings come in as props so each page
 * keeps its own wording.
 *
 * Two other components named `EmptyState` are intentionally left alone:
 * `notifications-page` (filter-dependent, no action) and `plan-grid` (no
 * action at all). Neither shares this shape.
 */
export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  /** Defaults to a document glyph. */
  icon?: LucideIcon;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = FileText,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 py-16 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <Button onClick={onAction} className="mt-2">
        <Plus aria-hidden />
        {actionLabel}
      </Button>
    </div>
  );
}
