import { MetricCard } from "@/components/admin/metric-card";
import { PageHead } from "@/components/admin/page-head";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { BuildsChart } from "@/components/admin/builds-chart";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Download, Plus } from "lucide-react";
import { resolveAdminIcon } from "@/lib/admin/admin-icons";
import {
  ADMIN_ACTIVITY,
  ADMIN_BUILDS_TIMELINE,
  ADMIN_METRICS,
} from "@/lib/admin/admin-mock-data";

export default function AdminOverviewPage() {
  const today = ADMIN_METRICS.find((m) => m.id === "active_builds");
  const revenue = ADMIN_METRICS.find((m) => m.id === "revenue");

  return (
    <>
      <PageHead
        title="Operations overview"
        description="Real-time snapshot of accounts, projects, and active builds across all regions."
        actions={
          <>
            <Button size="sm" variant="outline">
              <Download aria-hidden />
              Export CSV
            </Button>
            <Button size="sm">
              <Plus aria-hidden />
              New project
            </Button>
          </>
        }
      />

      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        {ADMIN_METRICS.map((m) => {
          const Icon = resolveAdminIcon(m.icon);
          return (
            <MetricCard
              key={m.id}
              label={m.label}
              value={m.value}
              delta={m.delta}
              inverse={m.inverse}
              icon={Icon}
            />
          );
        })}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-card/60 p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Active builds — last 30d</h2>
              <p className="text-xs text-muted-foreground">
                {today?.value} ongoing right now, peaking on day 30 with {ADMIN_BUILDS_TIMELINE.at(-1)?.builds}.
              </p>
            </div>
            <Button size="sm" variant="ghost">
              <ArrowUpRight aria-hidden />
              Open reports
            </Button>
          </div>
          <div className="mt-4">
            <BuildsChart data={ADMIN_BUILDS_TIMELINE} />
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Day 1</span>
            <span>
              Revenue: <strong className="font-semibold text-foreground">{revenue?.value}</strong>{" "}
              <span className="text-emerald-600">(+{revenue?.delta.toFixed(1)}%)</span>
            </span>
            <span>Day 30</span>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-card/60 p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <p className="text-xs text-muted-foreground">Last 4 days across all projects.</p>
          <div className="mt-4">
            <ActivityFeed items={ADMIN_ACTIVITY.slice(0, 6)} />
          </div>
        </div>
      </section>
    </>
  );
}