"use client";

import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IssueStatusPill } from "./issue-status-pill";
import { ISSUE_STATUSES, type IssueStatus } from "@/lib/projects/issue-types";

interface IssueStatusControlProps {
  status: IssueStatus;
  onChange: (next: IssueStatus) => void;
  disabled?: boolean;
}

const DOT_STYLES: Record<IssueStatus, string> = {
  open: "bg-red-500 ring-red-200 dark:ring-red-900/60",
  in_progress: "bg-amber-500 ring-amber-200 dark:ring-amber-900/60",
  resolved: "bg-sky-500 ring-sky-200 dark:ring-sky-900/60",
  closed: "bg-emerald-500 ring-emerald-200 dark:ring-emerald-900/60",
};

/**
 * Status changer for an issue.
 *
 * Renders the current status pill as a dropdown trigger. Clicking opens a
 * radio menu listing all four lifecycle states with a colored dot, label,
 * and short description, so the user can jump directly to any state
 * (including backwards — e.g. reopen a `resolved` issue) instead of
 * having to click through them one at a time.
 *
 * When `disabled` is true the trigger collapses to a plain read-only pill.
 */
export function IssueStatusControl({
  status,
  onChange,
  disabled,
}: IssueStatusControlProps) {
  const tMenu = useTranslations("MilestoneManagement.issue.statusMenu");
  const tCommon = useTranslations("MilestoneManagement.issue");

  if (disabled) {
    return <IssueStatusPill status={status} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={tCommon("changeStatus")}
        className={cn(
          "group inline-flex items-center gap-1 rounded-full",
          "ring-1 ring-inset ring-border/60 bg-background/40",
          "transition-colors hover:bg-accent/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "data-[state=open]:bg-accent/40 data-[state=open]:ring-foreground/20",
        )}
      >
        <IssueStatusPill status={status} />
        <span
          aria-hidden
          className="pr-2 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
        >
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="size-3" />
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-64 p-1.5">
        <DropdownMenuLabel className="flex items-center gap-2 px-1.5 pb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full ring-2",
              DOT_STYLES[status],
            )}
            aria-hidden
          />
          {tCommon("changeStatus")}
        </DropdownMenuLabel>

        <DropdownMenuRadioGroup
          value={status}
          onValueChange={(value) => {
            if (value !== status) onChange(value as IssueStatus);
          }}
        >
          {ISSUE_STATUSES.map((value) => {
            const isCurrent = value === status;
            return (
              <DropdownMenuRadioItem
                key={value}
                value={value}
                disabled={isCurrent}
                className={cn(
                  "items-start gap-2.5 py-2 pr-2",
                  isCurrent && "bg-accent/40",
                )}
              >
                <span
                  className={cn(
                    "mt-1 size-2 shrink-0 rounded-full ring-2",
                    DOT_STYLES[value],
                  )}
                  aria-hidden
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground">
                      {tMenu(`${value}.label`)}
                    </span>
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.5} className="size-2.5" />
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[11px] leading-tight text-muted-foreground">
                    {tMenu(`${value}.description`)}
                  </span>
                </div>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
