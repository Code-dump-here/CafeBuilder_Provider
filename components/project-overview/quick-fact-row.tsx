"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface QuickFactRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  /** Optional secondary line under value (price range, owner name, …). */
  hint?: React.ReactNode;
  className?: string;
}

/**
 * Row used in the right-hand Quick Facts panel — icon chip + label/value column.
 * Stays readable even when value is multi-line and supports long translations.
 */
export function QuickFactRow({
  icon,
  label,
  value,
  hint,
  className,
}: QuickFactRowProps) {
  return (
    <div
      className={cn("flex items-start gap-3", className)}
    >
      <span
        aria-hidden
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-foreground break-words">
          {value}
        </p>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}