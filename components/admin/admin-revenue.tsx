"use client";

import * as React from "react";
import {
  TrendingUp,
  Download,
  Calendar,
  Filter,
  RefreshCw,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useRevenueReport, useTransactions } from "@/features/admin/hooks";
import type {
  RevenueReport,
  TransactionListResponse,
  TransactionStatus,
  TransactionPurpose,
} from "@/features/admin/types";
import {
  SectionHeader,
  SimpleBarChart,
  LoadingSpinner,
  EmptyState,
  Pagination,
  StatusBadge,
} from "./admin-components";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatVnd, formatVndCompact } from "@/lib/format-currency";

// ─── Revenue Chart ───────────────────────────────────────────────────────────────

function RevenueChart({ data }: { data: RevenueReport }) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const chartData = data.series.map((point) => ({
    label: point.period.slice(5), // Show MM for monthly, DD for daily
    value: point.amount,
  }));

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const formattedMax = formatVndCompact(maxValue, locale);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            {t("revenue.totalRevenue")}:{" "}
            <span className="font-heading text-2xl font-bold text-emerald-600">
              {formatVnd(data.totalRevenue, locale)}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {data.transactionCount} {t("revenue.transactions")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Max: {formattedMax}
          </span>
        </div>
      </div>

      <div className="flex items-end gap-4" style={{ height: 240 }}>
        {chartData.map((item, i) => {
          const heightPercent = (item.value / maxValue) * 100;
          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center"
            >
              <div
                className="w-full cursor-pointer rounded-t-lg bg-linear-to-t from-emerald-600 to-emerald-400 transition-all hover:from-emerald-500 hover:to-emerald-300"
                style={{
                  height: `${heightPercent}%`,
                  minHeight: item.value > 0 ? "4px" : "0",
                }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
                  {formatVnd(item.value, locale)}
                </div>
              </div>
              <span className="mt-2 text-xs text-muted-foreground">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Revenue by Purpose ─────────────────────────────────────────────────────────

function RevenueByPurpose({ data }: { data: RevenueReport }) {
  const t = useTranslations("Admin");
  const locale = useLocale();

  return (
    <div className="space-y-3">
      {data.byPurpose.map((item) => (
        <div
          key={item.purpose}
          className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-lg",
                item.purpose === "subscription"
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-purple-500/10 text-purple-600",
              )}
            >
              <TrendingUp className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground capitalize">
                {item.purpose === "subscription"
                  ? t("revenue.subscription")
                  : t("revenue.postBoost")}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.count} {t("revenue.transactions")}
              </p>
            </div>
          </div>
          <p className="font-heading text-lg font-bold text-foreground">
            {formatVnd(item.amount, locale)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Transactions Table ──────────────────────────────────────────────────────────

function TransactionsTable({ data }: { data: TransactionListResponse }) {
  const t = useTranslations("Admin");
  const locale = useLocale();

  const columns = [
    {
      key: "orderCode",
      header: t("transactions.orderCode"),
      cell: (row: typeof data.items[0]) => (
        <span className="font-mono text-xs">#{row.orderCode}</span>
      ),
    },
    {
      key: "purpose",
      header: t("transactions.purpose"),
      cell: (row: typeof data.items[0]) => (
        <span className="capitalize">
          {row.purpose === "subscription"
            ? t("revenue.subscription")
            : t("revenue.postBoost")}
        </span>
      ),
    },
    {
      key: "amount",
      header: t("transactions.amount"),
      cell: (row: typeof data.items[0]) => (
        <span className="font-semibold">
          {formatVnd(row.amount, locale)}
        </span>
      ),
    },
    {
      key: "status",
      header: t("transactions.status"),
      cell: (row: typeof data.items[0]) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      key: "platform",
      header: t("transactions.platform"),
      cell: (row: typeof data.items[0]) => (
        <span className="capitalize text-muted-foreground">{row.platform}</span>
      ),
    },
    {
      key: "createdAt",
      header: t("transactions.date"),
      cell: (row: typeof data.items[0]) => (
        <span className="text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.items.map((row) => (
              <tr key={row.id} className="hover:bg-muted/30">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm">
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Revenue Page ──────────────────────────────────────────────────────────

export function AdminRevenue() {
  const t = useTranslations("Admin");
  const locale = useLocale();

  const [params, setParams] = React.useState({
    from: null as string | null,
    to: null as string | null,
    groupBy: "month" as "day" | "month",
  });

  const [transactionParams, setTransactionParams] = React.useState({
    pageNumber: 1,
    pageSize: 10,
    status: null as TransactionStatus | null,
    purpose: null as TransactionPurpose | null,
  });

  const { data: revenueData, isLoading: revenueLoading } = useRevenueReport(params);
  const { data: transactionData, isLoading: transactionLoading } = useTransactions(transactionParams);

  const handleGroupByChange = (groupBy: "day" | "month") => {
    setParams((prev) => ({ ...prev, groupBy }));
  };

  const handleTransactionPageChange = (page: number) => {
    setTransactionParams((prev) => ({ ...prev, pageNumber: page }));
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {t("revenue.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("revenue.subtitle")}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="size-4" />
          {t("actions.export")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {t("revenue.timeRange")}:
          </span>
        </div>
        <div className="flex gap-1">
          {(["day", "month"] as const).map((groupBy) => (
            <Button
              key={groupBy}
              variant={params.groupBy === groupBy ? "default" : "outline"}
              size="sm"
              onClick={() => handleGroupByChange(groupBy)}
              className="text-xs"
            >
              {groupBy === "day" ? t("revenue.daily") : t("revenue.monthly")}
            </Button>
          ))}
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <SectionHeader
            title={t("revenue.chart")}
            description={`${t("revenue.totalRevenue")}: ${revenueData ? formatVnd(revenueData.totalRevenue, locale) : "..."}`}
          />
          <div className="mt-6">
            {revenueLoading ? (
              <div className="flex h-64 items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : revenueData ? (
              <RevenueChart data={revenueData} />
            ) : (
              <EmptyState title={t("errors.noData")} />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <SectionHeader title={t("revenue.byPurpose")} />
          <div className="mt-4">
            {revenueLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>
            ) : revenueData ? (
              <RevenueByPurpose data={revenueData} />
            ) : (
              <EmptyState title={t("errors.noData")} />
            )}
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-4">
        <SectionHeader
          title={t("transactions.title")}
          action={
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="size-3" />
              {t("actions.filter")}
            </Button>
          }
        />

        {transactionLoading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
            <LoadingSpinner />
          </div>
        ) : transactionData ? (
          <>
            <TransactionsTable data={transactionData} />
            <Pagination
              pageNumber={transactionData.pageNumber}
              pageSize={transactionData.pageSize}
              totalItems={transactionData.totalItems}
              totalPages={transactionData.totalPages}
              onPageChange={handleTransactionPageChange}
            />
          </>
        ) : (
          <EmptyState title={t("errors.noData")} />
        )}
      </div>
    </div>
  );
}
