"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

import type { IssueStatus } from "@/features/projects/issue-types";

interface IssueStatusPillProps {
  status: IssueStatus;
  className?: string;
}

const STYLES: Record<IssueStatus, string> = {
  open:
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 ring-red-200/70 dark:ring-red-800/60",
  in_progress:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 ring-amber-200/70 dark:ring-amber-800/60",
  resolved:
    "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 ring-sky-200/70 dark:ring-sky-800/60",
  closed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 ring-emerald-200/70 dark:ring-emerald-800/60",
};

/**
 * Compact colored pill for an issue status. Pill colors map to the
 * lifecycle — open (red, needs attention) → in_progress (amber)
 * → resolved (sky, awaiting sign-off) → closed (emerald, done).
 */
export function IssueStatusPill({ status, className }: IssueStatusPillProps) {
  const t = useTranslations("MilestoneManagement.issue.status");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
        STYLES[status],
        className,
      )}
    >
      {t(status)}
    </span>
  );
}
