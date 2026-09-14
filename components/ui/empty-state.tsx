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
  /**
   * Omit both to render the panel without a button — for a viewer who may not
   * create the thing that is missing, an action they cannot complete is worse
   * than none at all.
   */
  actionLabel?: string;
  onAction?: () => void;
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
    // Drawn the way a plan marks an area that isn't built yet: hatched, with
    // a ruled label box on top. The dashed box with an icon in a grey circle
    // was the one element every empty screen shared, and it read as blank.
    <div className="hatch flex items-center justify-center rounded-lg border border-foreground/15 px-6 py-14">
      <div className="flex max-w-md flex-col items-center gap-3 border border-foreground/20 bg-background px-6 py-5 text-center shadow-e1">
        <Icon className="size-5 text-muted-foreground" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="mt-1">
            <Plus aria-hidden />
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
