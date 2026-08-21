"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarRange, ChevronRight, Wallet } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatVndParts } from "@/lib/format-currency";
import { useEngagementCostSummary } from "@/features/projects/use-cost-summary";
import type { ConstructionCostSummary } from "@/features/projects/cost-summary-types";

interface CostSummaryCardProps {
  projectWorkingId: string | null;
}

/**
 * What the build is costing: planned against actual, labour against materials.
 *
 * Actuals are withheld by the server until every line has a real figure, so
 * this renders "waiting on N lines" rather than a running total. A partial sum
 * labelled "actual cost" would be read as final and be wrong — the whole point
 * of the null is that nobody should quote it in a meeting.
 */
export function CostSummaryCard({ projectWorkingId }: CostSummaryCardProps) {
  const t = useTranslations("CostSummary");
  const locale = useLocale();

  const { summary, isLoading, isError } = useEngagementCostSummary({
    projectWorkingId,
    enabled: Boolean(projectWorkingId),
  });

  const money = (amount: number) => formatVndParts(amount, locale).full;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 p-4 pt-0">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  // A missing roll-up is not worth an error panel next to a working milestone
  // track — the page has plenty else to show.
  if (isError || !summary || summary.rootItemCount === 0) return null;

  const missing =
    summary.missingActualLaborLines + summary.missingActualMaterialLines;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-4 text-primary" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-4 pt-0">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Figure label={t("estimatedTotal")} value={money(summary.totalEstimatedCost)} emphasis />
          <Figure
            label={t("actualTotal")}
            value={
              summary.totalActualCost === null
                ? t("pendingActuals", { count: missing })
                : money(summary.totalActualCost)
            }
            muted={summary.totalActualCost === null}
          />
          <Figure label={t("labour")} value={money(summary.estimatedLaborCost)} />
          <Figure label={t("materials")} value={money(summary.estimatedMaterialCost)} />
        </div>

        {/* Accepted change orders are real money on this engagement that lives
            outside the milestone tree. Leaving them out is what let this card
            and the change-orders page quote different totals for one job. */}
        {summary.acceptedChangeOrderAmount > 0 ||
        summary.pendingChangeOrderAmount > 0 ? (
          <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <Figure
                label={t("acceptedChangeOrders")}
                value={money(summary.acceptedChangeOrderAmount)}
              />
              <Figure
                label={t("pendingChangeOrders")}
                value={money(summary.pendingChangeOrderAmount)}
                muted
              />
              <Figure
                label={t("totalWithChangeOrders")}
                value={money(summary.totalEstimatedCostWithChangeOrders)}
                emphasis
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("changeOrdersHint")}
            </p>
          </div>
        ) : null}

        {summary.variance !== null ? (
          <p
            className={cn(
              "text-sm font-medium",
              summary.variance > 0 ? "text-destructive" : "text-green-600",
            )}
          >
            {summary.variance > 0
              ? t("overBudget", { amount: money(summary.variance) })
              : t("underBudget", { amount: money(Math.abs(summary.variance)) })}
          </p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          {summary.items.map((item) => (
            <CostRow key={item.constructionItemId} item={item} depth={0} money={money} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CostRow({
  item,
  depth,
  money,
}: {
  item: ConstructionCostSummary;
  depth: number;
  money: (amount: number) => string;
}) {
  const t = useTranslations("CostSummary");

  return (
    <>
      <div
        className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2"
        style={{ marginLeft: depth * 16 }}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
            {depth > 0 ? (
              <ChevronRight className="size-3 shrink-0 text-muted-foreground" aria-hidden />
            ) : null}
            {item.name}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{t(`status.${item.status}`)}</Badge>
            {item.plannedDurationDays !== null ? (
              <span className="flex items-center gap-1">
                <CalendarRange className="size-3" aria-hidden />
                {t("plannedDays", { count: item.plannedDurationDays })}
              </span>
            ) : null}
            {item.actualDurationDays !== null ? (
              <span>{t("actualDays", { count: item.actualDurationDays })}</span>
            ) : null}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold">{money(item.totalEstimatedCost)}</p>
          <p className="text-xs text-muted-foreground">
            {item.totalActualCost === null
              ? t("actualPending")
              : t("actualIs", { amount: money(item.totalActualCost) })}
          </p>
        </div>
      </div>
      {item.children.map((child) => (
        <CostRow
          key={child.constructionItemId}
          item={child}
          depth={depth + 1}
          money={money}
        />
      ))}
    </>
  );
}

function Figure({
  label,
  value,
  emphasis,
  muted,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-semibold",
          emphasis ? "text-lg text-primary" : "text-base",
          muted && "text-sm font-normal text-muted-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
