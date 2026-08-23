"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Briefcase,
  FileText,
  Send,
  Handshake,
  FileSignature,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useAdminOverview } from "@/features/admin/hooks";
import {
  StatCard,
  SectionHeader,
  StatusBadge,
  SimpleBarChart,
  LoadingSpinner,
  EmptyState,
} from "./admin-components";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Revenue Card ─────────────────────────────────────────────────────────────

function RevenueCard({
  total,
  thisMonth,
  currency,
}: {
  total: number;
  thisMonth: number;
  currency: string;
}) {
  const t = useTranslations("Admin");
  // Suffixed rather than `style: "currency"`, which renders the ₫ symbol —
  // the rest of this app and the mobile app both spell the currency out.
  const nf = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
  const unit = currency || "VND";
  const formattedTotal = `${nf.format(total)} ${unit}`;
  const formattedMonth = `${nf.format(thisMonth)} ${unit}`;

  return (
    <div className="rounded-xl border border-border bg-linear-to-br from-emerald-500/10 to-teal-500/10 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600">
          <TrendingUp className="size-4" />
        </div>
        <span className="text-xs font-medium uppercase tracking-wider text-emerald-600">
          {t("stats.revenue")}
        </span>
      </div>
      <p className="font-heading text-3xl font-bold text-foreground">
        {formattedTotal}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("stats.thisMonth")}: {formattedMonth}
      </p>
    </div>
  );
}

// ─── Status Breakdown ─────────────────────────────────────────────────────────

function StatusBreakdown({
  title,
  counts,
  total,
}: {
  title: string;
  counts: Record<string, number>;
  total: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <span className="text-xs font-semibold text-foreground">{total}</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {Object.entries(counts).map(([status, count]) => {
          const percent = total > 0 ? (count / total) * 100 : 0;
          return (
            <div
              key={status}
              className={cn(
                "h-full transition-all",
                status === "active" || status === "completed" || status === "confirmed" || status === "accepted" || status === "paid"
                  ? "bg-emerald-500"
                  : status === "pending" || status === "in_progress" || status === "briefed" || status === "open"
                    ? "bg-amber-500"
                    : status === "banned" || status === "cancelled" || status === "rejected" || status === "failed" || status === "terminated"
                      ? "bg-red-500"
                      : "bg-blue-500",
              )}
              style={{ width: `${percent}%` }}
              title={`${status}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <StatusBadge status={status} />
            <span>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Quick Link Card ───────────────────────────────────────────────────────────

function QuickLinkCard({
  title,
  count,
  href,
  icon: Icon,
}: {
  title: string;
  count: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{count} total</p>
        </div>
      </div>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const t = useTranslations("Admin");
  const { data, isLoading, isError, error } = useAdminOverview();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner className="size-8" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title={t("errors.loadFailed")}
        description={error instanceof Error ? error.message : t("errors.tryAgain")}
        icon={Users}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t("actions.retry")}
          </Button>
        }
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title={t("errors.noData")}
        icon={Users}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex size-2 animate-pulse rounded-full bg-emerald-500" />
          {t("dashboard.lastUpdated")}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("stats.accounts")}
          value={data.accounts.total}
          subtitle={`${data.accounts.newThisMonth} ${t("stats.newThisMonth")}`}
          icon={Users}
        />
        <StatCard
          title={t("stats.projects")}
          value={data.projects.total}
          icon={Briefcase}
        />
        <StatCard
          title={t("stats.posts")}
          value={data.posts.total}
          icon={FileText}
        />
        <StatCard
          title={t("stats.applications")}
          value={data.applications.total}
          icon={Send}
        />
      </div>

      {/* Revenue & Status Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Card */}
        <RevenueCard
          total={data.revenue.total}
          thisMonth={data.revenue.thisMonth}
          currency={data.revenue.currency}
        />

        {/* Subscription Card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600">
              <CreditCard className="size-4" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-amber-600">
              {t("stats.subscriptions")}
            </span>
          </div>
          <p className="font-heading text-3xl font-bold text-foreground">
            {data.activeSubscriptions}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("stats.activeSubscriptions")}
          </p>
        </div>

        {/* Engagements Card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-600">
              <Handshake className="size-4" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-purple-600">
              {t("stats.engagements")}
            </span>
          </div>
          <p className="font-heading text-3xl font-bold text-foreground">
            {data.engagements.total}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("stats.activeEngagements", { count: data.engagements.byStatus.accepted || 0 })}
          </p>
        </div>
      </div>

      {/* Status Breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeader
            title={t("dashboard.accountStatus")}
            action={
              <Link href="/admin/accounts">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  {t("actions.viewAll")}
                  <ArrowUpRight className="size-3" />
                </Button>
              </Link>
            }
          />
          <div className="mt-4 space-y-4">
            <StatusBreakdown
              title={t("dashboard.accounts")}
              counts={data.accounts}
              total={data.accounts.total}
            />
            <StatusBreakdown
              title={t("dashboard.projects")}
              counts={data.projects.byStatus}
              total={data.projects.total}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeader
            title={t("dashboard.transactionStatus")}
            action={
              <Link href="/admin/revenue">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  {t("actions.viewAll")}
                  <ArrowUpRight className="size-3" />
                </Button>
              </Link>
            }
          />
          <div className="mt-4 space-y-4">
            <StatusBreakdown
              title={t("dashboard.contracts")}
              counts={data.contracts.byStatus}
              total={data.contracts.total}
            />
            <StatusBreakdown
              title={t("dashboard.applications")}
              counts={data.applications.byStatus}
              total={data.applications.total}
            />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <SectionHeader title={t("dashboard.quickActions")} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLinkCard
            title={t("dashboard.accounts")}
            count={data.accounts.total}
            href="/admin/accounts"
            icon={Users}
          />
          <QuickLinkCard
            title={t("stats.revenue")}
            count={data.revenue.paidTransactions}
            href="/admin/revenue"
            icon={CreditCard}
          />
          <QuickLinkCard
            title={t("dashboard.projects")}
            count={data.projects.total}
            href="/admin/projects"
            icon={Briefcase}
          />
          {/* Removed: "/admin/contracts" has no matching page under
              app/[locale]/admin/ — keeping the card here (not deleting)
              so it's easy to re-enable once that page exists.
          <QuickLinkCard
            title={t("dashboard.contracts")}
            count={data.contracts.total}
            href="/admin/contracts"
            icon={FileSignature}
          />
          */}
        </div>
      </div>
    </div>
  );
}
