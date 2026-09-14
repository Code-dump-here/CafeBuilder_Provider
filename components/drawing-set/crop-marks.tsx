import { cn } from "@/lib/utils";

const CORNERS = [
  "left-0 top-0 border-l border-t",
  "right-0 top-0 border-r border-t",
  "bottom-0 left-0 border-b border-l",
  "bottom-0 right-0 border-b border-r",
] as const;

/**
 * The four corner marks that bound a printed sheet. Placed inside a
 * `relative` container; purely decorative, so hidden from assistive tech and
 * never in the way of a click.
 */
export function CropMarks({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-2", className)}>
      {CORNERS.map((corner) => (
        <span key={corner} className={cn("absolute size-3.5 border-foreground/35", corner)} />
      ))}
    </div>
  );
}
