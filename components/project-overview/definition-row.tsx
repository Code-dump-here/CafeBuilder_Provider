"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface DefinitionRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  /** Whether the label/value pair sits inside a bordered row pair. */
  bordered?: boolean;
}

/**
 * Inline definition pair used in 2-column definition grids (Project Basics,
 * Executive Summary). Vertically aligned label/value with a small gap so both
 * columns match each other regardless of value height.
 */
export function DefinitionRow({
  label,
  value,
  className,
  bordered = true,
}: DefinitionRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        bordered && "border-b border-border/60 pb-3 last:border-b-0",
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground break-words">
        {value ?? "—"}
      </p>
    </div>
  );
}