"use client";

import { useTranslations } from "next-intl";
import { Camera, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { interactiveRow } from "@/lib/interactive";
import { cn } from "@/lib/utils";

import { IssueStatusPill } from "./issue-status-pill";
import type { Issue } from "@/features/projects/issue-types";

interface IssueCardProps {
  issue: Issue;
  /** Phase/milestone label to show as context. May be undefined if the issue is project-wide. */
  phaseLabel?: string;
  /** Whether this card corresponds to the currently selected issue in the master-detail layout. */
  active?: boolean;
  onOpen?: (issue: Issue) => void;
  onEdit?: (issue: Issue) => void;
  onDelete?: (issue: Issue) => void;
}

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
};

/**
 * Single-row card for an issue. Layout:
 *   [left: type + status + cause]    [right: date · milestone · actions]
 *
 * Whole card is clickable to open the detail drawer. Inline
 * edit / delete buttons stop propagation so the row's primary
 * affordance stays "open".
 */
export function IssueCard({
  issue,
  phaseLabel,
  active = false,
  onOpen,
  onEdit,
  onDelete,
}: IssueCardProps) {
  const t = useTranslations("MilestoneManagement.issue");
  const tEdit = useTranslations("MilestoneManagement.issue.edit");

  const handleCardClick = () => onOpen?.(issue);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen?.(issue);
    }
  };

  const photoCount = [issue.issueImage, issue.confirmImage].filter(Boolean).length;
  const interactive = Boolean(onOpen);

  return (
    <article
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? handleCardClick : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      className={cn(
        "group relative grid w-full grid-cols-[1fr_auto] gap-3 rounded-lg border bg-card px-3.5 py-3 text-sm shadow-xs",
        active
          ? "border-ring/60 bg-ring/5 ring-1 ring-ring/30"
          : "border-border/60",
        // Row tier, not card tier: these stack at `gap-1.5`, so a lift on
        // hover would have the card bumping into its neighbour.
        interactive && interactiveRow,
        interactive && !active && "hover:border-foreground/20 hover:shadow-sm",
      )}
    >
      {/* LEFT — primary info */}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {issue.issueTypeName}
          </span>
          <IssueStatusPill status={issue.status} />
        </div>
        {issue.cause ? (
          <p className="line-clamp-2 text-pretty text-xs text-foreground/80">
            {issue.cause}
          </p>
        ) : (
          <p className="text-xs italic text-muted-foreground">{t("noCause")}</p>
        )}
      </div>

      {/* RIGHT — meta + actions */}
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {onEdit ? (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={tEdit("title")}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(issue);
              }}
            >
              <Pencil aria-hidden />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={t("delete")}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(issue);
              }}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 aria-hidden />
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-1 text-[11px] text-muted-foreground">
          {issue.estimateAt ? (
            <time dateTime={issue.estimateAt} className="font-medium text-foreground/70">
              {formatDate(issue.estimateAt)}
            </time>
          ) : null}
          <div className="flex items-center gap-1.5">
            {phaseLabel ? <span>{phaseLabel}</span> : null}
            {photoCount > 0 ? (
              <span className="inline-flex items-center gap-0.5">
                <Camera aria-hidden className="size-3" />
                {photoCount}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
