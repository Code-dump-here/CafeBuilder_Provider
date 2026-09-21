"use client";

import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

interface IssueEmptyStateProps {
  hasFilter: boolean;
  onReport: () => void;
  onClearFilter?: () => void;
}

/**
 * Empty state for the issues list. Distinguishes "no issues yet"
 * (action: report the first one) from "no issues match filter"
 * (action: clear filter).
 */
export function IssueEmptyState({
  hasFilter,
  onReport,
  onClearFilter,
}: IssueEmptyStateProps) {
  const t = useTranslations("MilestoneManagement.issue");

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/40 px-6 py-12 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        <TriangleAlert aria-hidden className="size-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">
          {hasFilter ? t("emptyFiltered") : t("empty")}
        </p>
        <p className="text-xs text-muted-foreground">
          {hasFilter ? t("emptyFilteredHint") : t("emptyHint")}
        </p>
      </div>
      {hasFilter && onClearFilter ? (
        <Button type="button" variant="outline" size="sm" onClick={onClearFilter}>
          {t("clearFilter")}
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={onReport}>
          {t("addCta")}
        </Button>
      )}
    </div>
  );
}
