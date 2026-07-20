import * as React from "react";
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  delta: number;
  /** When true, a negative delta is "good" (e.g. drop in suspensions). */
  inverse?: boolean;
  icon: LucideIcon;
  className?: string;
}

/**
 * Single KPI tile. Tone flips on the inverse flag — used for things
 * like "active builds" where a small drop is actually desirable.
 */
export function MetricCard({ label, value, delta, inverse, icon: Icon, className }: MetricCardProps) {
  const positive = inverse ? delta < 0 : delta > 0;
  const neutral = delta === 0;

  const tone = neutral
    ? "border-border/60 bg-card/60 text-muted-foreground"
    : positive
      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
      : "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300";

  const Arrow = inverse ? (delta < 0 ? ArrowUp : ArrowDown) : delta < 0 ? ArrowDown : ArrowUp;

  return (
    <div className={cn("rounded-lg border bg-card/60 p-4 shadow-sm", tone, className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="flex size-7 items-center justify-center rounded-md bg-foreground/5 text-foreground/70">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
      <div
        className={cn(
          "mt-1 flex items-center gap-1 text-[11px] font-medium",
          neutral
            ? "text-muted-foreground"
            : positive
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-rose-700 dark:text-rose-300"
        )}
        title="vs previous period"
      >
        <Arrow className="size-3" aria-hidden />
        <span>
          {delta > 0 ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
        <span className="text-muted-foreground">vs prev period</span>
      </div>
    </div>
  );
}