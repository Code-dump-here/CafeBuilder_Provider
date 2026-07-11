"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatusDotProps {
  status: "DRAFT" | "WORKING" | "PUBLISHED";
  className?: string;
}

const TONE: Record<StatusDotProps["status"], { dot: string; text: string; label: string }> = {
  DRAFT: {
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    label: "Draft",
  },
  WORKING: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    label: "Working",
  },
  PUBLISHED: {
    dot: "bg-primary",
    text: "text-primary",
    label: "Published",
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
          status === "WORKING" && "animate-pulse",
        )}
      />
      <span>{tone.label}</span>
    </span>
  );
}