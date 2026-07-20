"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Filter,
  FolderKanban,
  LayoutGrid,
  List,
  MapPin,
  Pause,
  Plus,
  Search,
} from "lucide-react";
import { useFormatter } from "next-intl";

import { PageHead } from "@/components/admin/page-head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ADMIN_PROJECTS,
  type AdminProject,
} from "@/lib/admin/admin-mock-data";

const STATUS_TONE: Record<AdminProject["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  on_hold: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  completed: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  draft: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<AdminProject["status"], string> = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  draft: "Draft",
};

const VIEW_OPTIONS = ["grid", "list"] as const;
type ViewMode = (typeof VIEW_OPTIONS)[number];

export default function AdminProjectsPage() {
  const format = useFormatter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | AdminProject["status"]>("all");
  const [view, setView] = React.useState<ViewMode>("grid");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return ADMIN_PROJECTS.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q) ||
        p.contractorName.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
      );
    });
  }, [search, statusFilter]);

  const summary = React.useMemo(() => {
    return {
      total: ADMIN_PROJECTS.length,
      active: ADMIN_PROJECTS.filter((p) => p.status === "active").length,
      onHold: ADMIN_PROJECTS.filter((p) => p.status === "on_hold").length,
      drafts: ADMIN_PROJECTS.filter((p) => p.status === "draft").length,
    };
  }, []);

  return (
    <>
      <PageHead
        title="Project management"
        description={`${summary.total} projects in flight · ${summary.active} active · ${summary.onHold} on hold`}
        actions={
          <>
            <Button size="sm" variant="outline">
              <FolderKanban aria-hidden />
              Templates
            </Button>
            <Button size="sm">
              <Plus aria-hidden />
              New project
            </Button>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryStat label="Total projects" value={summary.total} tone="default" />
        <SummaryStat label="Active" value={summary.active} tone="emerald" />
        <SummaryStat label="On hold" value={summary.onHold} tone="amber" />
        <SummaryStat label="Drafts" value={summary.drafts} tone="muted" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/60 p-3 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, city, or contractor…"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border/60 bg-background p-0.5 text-xs">
          <FilterPill active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
            All
          </FilterPill>
          <FilterPill active={statusFilter === "active"} onClick={() => setStatusFilter("active")}>
            Active
          </FilterPill>
          <FilterPill active={statusFilter === "on_hold"} onClick={() => setStatusFilter("on_hold")}>
            On hold
          </FilterPill>
          <FilterPill active={statusFilter === "completed"} onClick={() => setStatusFilter("completed")}>
            Completed
          </FilterPill>
          <FilterPill active={statusFilter === "draft"} onClick={() => setStatusFilter("draft")}>
            Draft
          </FilterPill>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-md border border-border/60 bg-background p-0.5">
          <button
            type="button"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
            className={cn(
              "flex size-8 items-center justify-center rounded-sm",
              view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            className={cn(
              "flex size-8 items-center justify-center rounded-sm",
              view === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="List view"
          >
            <List className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} format={format} />
          ))}
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              No projects match the current filters.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/60 bg-card/60 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Project</th>
                <th className="px-4 py-2.5 text-left font-medium">Owner</th>
                <th className="px-4 py-2.5 text-left font-medium">Contractor</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Progress</th>
                <th className="px-4 py-2.5 text-right font-medium">Budget</th>
                <th className="px-4 py-2.5 text-left font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.ownerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.contractorName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {p.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    ${p.budget.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format.relativeTime(new Date(p.updatedAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ProjectCard({
  project,
  format,
}: {
  project: AdminProject;
  format: ReturnType<typeof useFormatter>;
}) {
  const overspent = project.spent > project.budget;
  return (
    <Link
      href={`/projects/${project.id}/overview`}
      className="group flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 p-4 shadow-sm transition-colors hover:border-primary/60 hover:bg-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{project.name}</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3" aria-hidden /> {project.city}
          </span>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Progress</span>
          <span className="tabular-nums text-foreground">{project.progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <Field label="Owner">
          <span className="text-foreground">{project.ownerName}</span>
        </Field>
        <Field label="Contractor">
          <span className="text-foreground">{project.contractorName}</span>
        </Field>
      </div>

      <div className="flex items-end justify-between border-t border-border/60 pt-2 text-[11px]">
        <div className="flex flex-col">
          <span className="text-muted-foreground">Budget</span>
          <span className="tabular-nums font-medium text-foreground">
            ${project.budget.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-muted-foreground">Spent</span>
          <span
            className={cn(
              "tabular-nums font-medium",
              overspent ? "text-rose-600" : "text-foreground"
            )}
            title={overspent ? `${Math.round(((project.spent - project.budget) / project.budget) * 100)}% over budget` : undefined}
          >
            ${project.spent.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-muted-foreground">Updated</span>
          <span className="text-foreground">{format.relativeTime(new Date(project.updatedAt))}</span>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 self-end text-[11px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open project <ArrowUpRight className="size-3" aria-hidden />
      </span>
    </Link>
  );
}

function StatusBadge({ status }: { status: AdminProject["status"] }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_TONE[status])}>
      {status === "on_hold" ? (
        <Pause className="mr-1 mt-px size-3" aria-hidden />
      ) : null}
      {STATUS_LABEL[status]}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-sm px-2 py-1 text-xs",
        active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: "default" | "emerald" | "amber" | "muted" }) {
  const toneClass = {
    default: "text-foreground",
    emerald: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
    muted: "text-muted-foreground",
  }[tone];
  return (
    <div className="flex flex-col rounded-lg border border-border/60 bg-card/60 p-3">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("mt-1 text-xl font-semibold tabular-nums", toneClass)}>{value}</span>
    </div>
  );
}