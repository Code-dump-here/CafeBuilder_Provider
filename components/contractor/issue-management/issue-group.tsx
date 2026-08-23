"use client";

import { useTranslations } from "next-intl";

import { IssueCard } from "./issue-card";
import { IssueStatusPill } from "./issue-status-pill";
import { cn } from "@/lib/utils";
import type { Issue, IssueStatus } from "@/features/projects/issue-types";

interface IssueGroupProps {
  status: IssueStatus;
  issues: Issue[];
  /** ID of the currently selected issue (highlighted in the list). */
  activeId?: string | null;
  onOpen: (issue: Issue) => void;
  onEdit?: (issue: Issue) => void;
  onDelete?: (issue: Issue) => void;
}

/**
 * One status-group section. Header = status pill + label + count.
 * Cards stack vertically underneath. The wrapper uses the same
 * border / background / transition tokens as `PhaseRow` so the
 * issues page reads as a sibling surface to the milestones page.
 */
export function IssueGroup({
  status,
  issues,
  activeId,
  onOpen,
  onEdit,
  onDelete,
}: IssueGroupProps) {
  const tStatus = useTranslations("MilestoneManagement.issue.status");
  const t = useTranslations("MilestoneManagement.issue");

  if (issues.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby={`issue-group-${status}`}
      className={cn(
        "flex flex-col gap-2.5 rounded-lg border bg-card/30 p-3 transition-colors",
        "border-border/60",
      )}
    >
      <header className="flex items-center gap-2">
        <IssueStatusPill status={status} className="font-medium" />
        <h3
          id={`issue-group-${status}`}
          className="font-heading text-sm font-semibold text-foreground"
        >
          {tStatus(status)}
        </h3>
        <span className="text-xs text-muted-foreground">
          {t("count", { count: issues.length })}
        </span>
      </header>

      <div className="flex flex-col gap-1.5">
        {issues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            phaseLabel={issue.constructionItemId ? `#${issue.constructionItemId}` : undefined}
            active={activeId === issue.id}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}