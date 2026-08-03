"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { VersionStatus } from "@/features/projects/design-version-types";

export interface StatusDotProps {
  status: VersionStatus;
  className?: string;
}

/**
 * Tone map for the 4 wire lifecycle states. Kept here (not in i18n)
 * because these are operational indicators, not user-facing copy —
 * the table doesn't render a translated label.
 *
 *   in_progress  → neutral grey  (drafting)
 *   submitted    → amber pulse   (waiting for owner review)
 *   revision     → red           (owner asked for changes)
 *   approved     → green         (locked / done)
 */
const TONE: Record<
  VersionStatus,
  { dot: string; text: string; label: string; animate: boolean }
> = {
  in_progress: {
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    label: "In progress",
    animate: false,
  },
  submitted: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    label: "Submitted",
    animate: true,
  },
  revision: {
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-300",
    label: "Revision",
    animate: false,
  },
  approved: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    label: "Approved",
    animate: false,
  },
};

/**
 * Tiny status indicator: coloured dot + label. Used inline next to a
 * version name. No border, no background — keeps the row airy.
 */
export function StatusDot({ status, className }: StatusDotProps) {
  const tone = TONE[status];
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        tone.text,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          tone.dot,
          tone.animate && "animate-pulse",
        )}
      />
      <span>{tone.label}</span>
    </span>
  );
}