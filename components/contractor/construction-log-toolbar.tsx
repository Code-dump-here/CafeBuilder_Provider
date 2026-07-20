"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { projectActionToast } from "@/components/project-overview/project-action-toast";

import type { ConstructionLogStatus } from "@/lib/contractor/construction-log-data";

export type StatusFilterValue = "all" | ConstructionLogStatus;

interface ConstructionLogToolbarProps {
  statusFilter: StatusFilterValue;
  onStatusFilterChange: (next: StatusFilterValue) => void;
  /** Range inputs are visual only — `onFilter` is wired to a placeholder. */
  fromDate: string;
  toDate: string;
  onFromDateChange: (next: string) => void;
  onToDateChange: (next: string) => void;
  onClear: () => void;
}

/**
 * Top-of-timeline filter row. Keeps the page interactive even though
 * filtering happens entirely client-side for now — wiring up to real
 * query params is a drop-in replacement.
 */
export function ConstructionLogToolbar({
  statusFilter,
  onStatusFilterChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onClear,
}: ConstructionLogToolbarProps) {
  const t = useTranslations("ConstructionLog.toolbar");
  const tStatus = useTranslations("ConstructionLog.status");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Filter className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="text-xs font-medium text-foreground">{t("label")}</span>
      </div>

      <Field
        label={t("from")}
        control={
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
            className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      />
      <Field
        label={t("to")}
        control={
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
            className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      />

      <div className="flex flex-col gap-1">
        <label
          htmlFor="construction-log-status"
          className="text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          {t("status")}
        </label>
        <select
          id="construction-log-status"
          value={statusFilter}
          onChange={(e) =>
            onStatusFilterChange(e.target.value as StatusFilterValue)
          }
          className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">{tStatus("all")}</option>
          <option value="onTrack">{tStatus("onTrack")}</option>
          <option value="minorDelay">{tStatus("minorDelay")}</option>
          <option value="blocked">{tStatus("blocked")}</option>
          <option value="completed">{tStatus("completed")}</option>
        </select>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="ml-auto"
      >
        <X aria-hidden />
        {t("clear")}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => projectActionToast(t("advancedComingSoon"))}
      >
        {t("advanced")}
      </Button>
    </div>
  );
}

function Field({
  label,
  control,
}: {
  label: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {control}
    </div>
  );
}