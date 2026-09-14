import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Sheet numbers for the app's pages, in one place so no two screens claim the
 * same one. Grouped the way a drawing set is: a letter per discipline, a
 * hundred per sheet.
 *
 * - G — general: the project itself
 * - C — commercial: quotes, contracts, money
 * - M — site management: the build as it happens
 * - A — architectural: the design and its drawings
 * - D — marketplace, outside any one project
 */
export const SHEET = {
  myProjects: "G-000",
  projectOverview: "G-100",
  siteProfile: "G-200",
  survey: "G-300",
  quotations: "C-100",
  contracts: "C-200",
  changeOrders: "C-300",
  payments: "C-400",
  constructionOverview: "M-000",
  milestones: "M-100",
  dailyLogs: "M-200",
  issues: "M-300",
  designs: "A-100",
  technicalDrawings: "A-200",
  marketplace: "D-200",
} as const;

/** Sheet for each project sub-route, keyed by its first path segment. */
export const PROJECT_SEGMENT_SHEET: Record<string, string> = {
  "": SHEET.projectOverview,
  "/site-profile": SHEET.siteProfile,
  "/survey": SHEET.survey,
  "/quotations": SHEET.quotations,
  "/contracts": SHEET.contracts,
  "/change-orders": SHEET.changeOrders,
  "/payments": SHEET.payments,
  "/construction-overview": SHEET.constructionOverview,
  "/milestones": SHEET.milestones,
  "/daily-logs": SHEET.dailyLogs,
  "/issues": SHEET.issues,
  "/design-management": SHEET.designs,
  "/technical-drawings": SHEET.technicalDrawings,
};

/**
 * A page title set as sheet lettering, with the sheet number above it.
 *
 * `sheet` is optional because some pages already print their number in a
 * title block (milestones) and a second copy would just be noise.
 */
export function SheetTitle({
  sheet,
  label,
  className,
  children,
}: {
  sheet?: string;
  /** Short caption after the sheet number, like the homepage eyebrow. */
  label?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {sheet ? <SheetNumber label={label}>{sheet}</SheetNumber> : null}
      <h1 className={cn("sheet-title text-3xl text-foreground sm:text-4xl", className)}>
        {children}
      </h1>
    </div>
  );
}

/** The boxed sheet reference on its own — `A-000` on the homepage. */
export function SheetNumber({
  label,
  className,
  children,
}: {
  label?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  // The rule runs to the edge of the sheet and ends in a tick, like the
  // border line along the top of a drawing, instead of stopping after 2rem.
  return (
    <p
      className={cn(
        "flex w-full items-center gap-3 font-mono text-2xs uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
    >
      <span className="shrink-0 border border-foreground/40 px-1.5 py-0.5 font-semibold text-foreground">
        {children}
      </span>
      {label ? (
        <>
          <span aria-hidden className="h-px w-8 shrink-0 bg-foreground/30" />
          <span className="shrink-0">{label}</span>
        </>
      ) : null}
      <span aria-hidden className="relative h-px min-w-8 flex-1 bg-foreground/20">
        <span className="absolute -top-1 right-0 h-[9px] w-px bg-foreground/35" />
      </span>
    </p>
  );
}
