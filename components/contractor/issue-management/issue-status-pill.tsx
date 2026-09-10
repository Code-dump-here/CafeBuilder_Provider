"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

import type { IssueStatus } from "@/features/projects/issue-types";

interface IssueStatusPillProps {
  status: IssueStatus;
  className?: string;
}

/**
 * Which status family each point in the lifecycle belongs to.
 *
 * The lifecycle reads the same as before — open needs attention, in_progress
 * is waiting, resolved is awaiting sign-off, closed is done — but it is now
 * stated as *meaning* rather than as a hue. The eight hardcoded utilities this
 * replaces were one of 65 files each picking their own red and their own
 * green; naming the meaning is what stops that recurring.
 */
const TONE: Record<IssueStatus, "danger" | "warning" | "info" | "success"> = {
  open: "danger",
  in_progress: "warning",
  resolved: "info",
  closed: "success",
};

const STYLES: Record<IssueStatus, string> = {
  open: "bg-danger-muted text-danger-muted-foreground ring-danger/20",
  in_progress: "bg-warning-muted text-warning-muted-foreground ring-warning/20",
  resolved: "bg-info-muted text-info-muted-foreground ring-info/20",
  closed: "bg-success-muted text-success-muted-foreground ring-success/20",
};
export function IssueStatusPill({ status, className }: IssueStatusPillProps) {
  const t = useTranslations("MilestoneManagement.issue.status");
  // `data-tone` so the pill's meaning is visible in the DOM and in tests,
  // not only encoded in a class string.
  const tone = TONE[status];
  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        STYLES[status],
        className,
      )}
    >
      {t(status)}
    </span>
  );
}
