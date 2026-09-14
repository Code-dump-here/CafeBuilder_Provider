import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A drawing title block: the ruled strip of labelled cells along the edge of
 * every sheet — sheet number, title, scale, revision.
 *
 * Used where the app previously showed a row of count pills. Pills float as
 * separate tokens; a title block states several facts about one thing in a
 * fixed frame, which is what those counts actually are.
 */
export function TitleBlock({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <dl
      className={cn(
        "flex w-fit max-w-full flex-wrap border border-foreground/20 font-mono text-2xs uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function TitleCell({
  label,
  children,
  emphasis,
  grow,
  className,
}: {
  label: string;
  children: React.ReactNode;
  /** The cell that identifies the sheet reads in full foreground. */
  emphasis?: boolean;
  /** Takes the remaining width, for a title. */
  grow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 border-foreground/20 px-3 py-2 [&:not(:last-child)]:border-r",
        grow && "flex-1",
        className,
      )}
    >
      <dt className="leading-none opacity-70">{label}</dt>
      <dd className={cn("text-xs leading-none", emphasis ? "font-semibold text-foreground" : "text-foreground/85")}>
        {children}
      </dd>
    </div>
  );
}
