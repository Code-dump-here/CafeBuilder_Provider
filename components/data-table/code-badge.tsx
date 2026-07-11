"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CodeBadgeProps {
  code: string;
  variant?: "default" | "muted" | "outline";
  className?: string;
}

/**
 * Mono-spaced badge used to display version codes ("V3.0"), sheet codes
 * ("A-101"), or other short technical IDs.
 */
export function CodeBadge({
  code,
  variant = "muted",
  className,
}: CodeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide",
        variant === "default" &&
          "bg-primary/15 text-primary",
        variant === "muted" &&
          "bg-muted text-muted-foreground",
        variant === "outline" &&
          "border border-border/60 text-foreground",
        className,
      )}
    >
      {code}
    </span>
  );
}