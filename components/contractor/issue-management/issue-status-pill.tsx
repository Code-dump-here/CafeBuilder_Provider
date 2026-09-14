"use client";

import { useTranslations } from "next-intl";

import type { IssueStatus } from "@/features/projects/issue-types";
import { Stamp } from "@/components/drawing-set/stamp";

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


export function IssueStatusPill({ status, className }: IssueStatusPillProps) {
  const t = useTranslations("MilestoneManagement.issue.status");
  // `data-tone` so the pill's meaning is visible in the DOM and in tests,
  // not only encoded in a class string.
  const tone = TONE[status];
  return (
    <Stamp size="sm" tone={tone} seed={status} className={className} data-tone={tone}>
      {t(status)}
    </Stamp>
  );
}
