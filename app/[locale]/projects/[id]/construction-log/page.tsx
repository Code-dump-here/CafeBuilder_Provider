"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { projectActionToast } from "@/components/project-overview/project-action-toast";

import { ConstructionLogStatsCards } from "@/components/contractor/construction-log-stats";
import {
  ConstructionLogToolbar,
  type StatusFilterValue,
} from "@/components/contractor/construction-log-toolbar";
import { ConstructionLogTimeline } from "@/components/contractor/construction-log-timeline";

import {
  MOCK_CONSTRUCTION_LOG,
  type ConstructionLogEntry,
} from "@/lib/contractor/construction-log-data";

/**
 * `/[locale]/projects/{id}/construction-log` — daily log timeline for
 * the active project.
 *
 * Sections (top to bottom):
 *   1. Header — title + "Log today" CTA (placeholder).
 *   2. Stats card — 4 KPIs.
 *   3. Toolbar — date range + status filter.
 *   4. Timeline — entries grouped by date with photo strip + chips.
 *
 * Filtering happens entirely client-side over `MOCK_CONSTRUCTION_LOG`
 * until the construction-log endpoint ships.
 */
export default function ConstructionLogPage() {
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id ?? "";
  const t = useTranslations("ConstructionLog");

  const data = MOCK_CONSTRUCTION_LOG;

  const [statusFilter, setStatusFilter] =
    React.useState<StatusFilterValue>("all");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");

  const filtered = React.useMemo<ConstructionLogEntry[]>(() => {
    return data.entries.filter((entry) => {
      if (statusFilter !== "all" && entry.status !== statusFilter) return false;
      if (fromDate && entry.date < fromDate) return false;
      if (toDate && entry.date > `${toDate}T23:59:59.999Z`) return false;
      return true;
    });
  }, [data.entries, statusFilter, fromDate, toDate]);

  const clear = () => {
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => projectActionToast(t("addEntry.comingSoon"))}
        >
          <PenLine aria-hidden />
          {t("addEntry.cta")}
        </Button>
      </header>

      <ConstructionLogStatsCards stats={data.stats} />

      <ConstructionLogToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onClear={clear}
      />

      <ConstructionLogTimeline entries={filtered} />
    </div>
  );
}