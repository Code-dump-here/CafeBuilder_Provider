import * as React from "react";

import { cn } from "@/lib/utils";

export type StampTone = "success" | "warning" | "danger" | "info" | "neutral";

/**
 * An ink stamp — the drawing-set replacement for a status pill.
 *
 * Designers and contractors already read status this way: APPROVED, FOR
 * CONSTRUCTION, REVISE AND RESUBMIT arrive as rubber stamps on a sheet. A pill
 * says "UI component"; a stamp says "someone signed this off".
 *
 * How it is built, and why:
 * - Text is the solid status token (`text-success` and friends), which clears
 *   AA on the page and card grounds (4.71–5.50:1). There is no fill behind it,
 *   so nothing lowers that ratio.
 * - Double rule: a 2px border plus a 1px outline pulled inside it with a
 *   negative offset. The gap between them is transparent, so the paper grid
 *   still shows through, as ink would let it.
 * - Rotation comes from a hash of `seed`, between -6° and +3°, never 0. A board
 *   of stamps each tilted the same reads as copy-paste; tilted differently it
 *   reads as hand-stamped. Deterministic, so server and client agree.
 * - Ink texture only at md and lg. At 12px the speckle starts eating strokes.
 * - `mix-blend-multiply` on light paper and `screen` on dark, so overlapping
 *   grid lines sit *under* the ink instead of on top of it.
 * - `animate` lands it with a small overshoot; reduced motion shows it still.
 */
export function Stamp({
  tone = "neutral",
  size = "md",
  seed,
  animate = false,
  delayMs = 0,
  className,
  children,
  ...rest
}: Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> & {
  tone?: StampTone;
  size?: "sm" | "md" | "lg";
  /** Drives the tilt. Defaults to the label, so equal labels tilt equally. */
  seed?: string;
  animate?: boolean;
  delayMs?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const label = typeof children === "string" ? children : "";
  // The same angle swings a long label much further out of level at its ends:
  // at -3° "AWAITING CONFIRMATION" drifted ~10px, crowding the line under it,
  // while "PAID" barely moves. Scale the tilt down past ~9 characters, keeping
  // at least a degree so it still reads as stamped.
  const base = tiltFor(seed ?? (label || "stamp"));
  const scaled = base * Math.min(1, 9 / Math.max(label.length, 1));
  const rotate = Math.sign(base) * Math.max(1, Math.round(Math.abs(scaled) * 2) / 2);

  return (
    <span
      {...rest}
      data-slot="stamp"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono leading-none font-semibold uppercase",
        "border-2 border-current outline outline-1 outline-current",
        "mix-blend-multiply dark:mix-blend-screen",
        TONE[tone],
        SIZE[size],
        size !== "sm" && "[mask-image:var(--stamp-ink)] [mask-size:140px_140px]",
        animate && "stamp-in",
        className,
      )}
      style={
        {
          "--stamp-rotate": `${rotate}deg`,
          "--stamp-ink": INK_MASK,
          transform: `rotate(${rotate}deg)`,
          ...(animate
            ? { animation: `stamp-in 460ms cubic-bezier(0.2, 0.9, 0.3, 1.25) ${delayMs}ms both` }
            : null),
        } as React.CSSProperties
      }
    >
      {children}
    </span>
  );
}

const TONE: Record<StampTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-muted-foreground",
};

// outline-offset is negative, pulling the second rule inside the border.
const SIZE = {
  sm: "px-2 py-1 text-2xs tracking-[0.12em] -outline-offset-[5px]",
  md: "px-3 py-1.5 text-xs tracking-[0.16em] -outline-offset-[6px]",
  lg: "px-4 py-2.5 text-sm tracking-[0.2em] -outline-offset-[7px] border-[3px]",
} as const;

function tiltFor(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // -6 … +3 in half-degree steps, skipping anything that would look straight.
  const steps = [-6, -5.5, -5, -4.5, -4, -3.5, -3, -2.5, -2, 2, 2.5, 3];
  return steps[Math.abs(h) % steps.length];
}

/*
 * Speckle mask: turbulence noise mapped so ~90% of the area stays fully opaque
 * and the rest thins out, like ink that didn't quite take. Alpha is
 * 3.4 - 3·noise, clamped — opaque until the noise passes 0.8.
 */
const INK_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -3 3.4'/></filter><rect width='140' height='140' filter='url(#n)'/></svg>`,
)}")`;
