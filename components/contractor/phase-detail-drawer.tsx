"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  FlagTriangleRight,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConstructionTasks } from "@/features/projects/use-construction";
import { useIssues } from "@/features/projects/use-issues";
import type { ConstructionTask } from "@/features/projects/construction-types";
import type { Issue } from "@/features/projects/issue-types";

import type { MilestonePhase } from "@/lib/contractor/construction-overview-data";
import { useResetOnChange } from "@/hooks/use-reset-on-change";

interface PhaseDetailDrawerProps {
  phase: MilestonePhase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Project id — used by "Open full page" to deep-link into /milestones. */
  projectId?: string;
  /**
   * Engagement id — forwarded to `useConstructionTasks` /
   * `useIssues` so the drawer can fetch real per-milestone records.
   * Pass `null` when no engagement has been resolved yet — the data
   * hooks stay disabled and the drawer renders empty sections.
   */
  projectWorkingId: number | null;
}

/**
 * Right-side drawer that opens when the user clicks "Open phase detail"
 * on the construction-overview page.
 *
 * What it renders (post-refactor):
 *   - Status pill + phase title
 *   - KPI strip — progress %, tasks done/total, open issues
 *   - Meta strip — targeted finish date, real `actualAt` when present
 *   - Sections:
 *     - Tasks (real `ConstructionTask[]`, fetched per milestone)
 *     - Open issues (real `Issue[]`, filtered to `open` / `in_progress`)
 *
 * What's gone (vs. the mock version):
 *   - Narrative paragraph — replaced by the phase meta strip.
 *   - Blocker cards — replaced by the issues section, which uses real
 *     issue records (cause / solution / status / severity via
 *     `IssueType.name` since the API doesn't return a severity enum).
 *   - Photo grid — no API surface; omitted.
 *   - Crew avatars — no API surface; omitted.
 *
 * The "Open full page" button still deep-links to `/milestones#{id}` so
 * the user can drill into the milestone management surface when they
 * need the richer authoring tools.
 */
export function PhaseDetailDrawer({
  phase,
  open,
  onOpenChange,
  projectId,
  projectWorkingId,
}: PhaseDetailDrawerProps) {
  const t = useTranslations("ConstructionOverview.detail.drawer");
  const tStatus = useTranslations("ConstructionOverview.status");
  const format = useFormatter();
  const router = useRouter();

  const handleOpenFull = React.useCallback(() => {
    if (!projectId || !phase) return;
    onOpenChange(false);
    router.push(`/projects/${projectId}/milestones#${phase.id}`);
  }, [projectId, phase, onOpenChange, router]);

  // Resolve the numeric construction-item id from the phase. The phase
  // id is a stringified version of the same number (set in
  // `use-construction-overview.ts`), so this is a safe cast.
  const constructionItemId = React.useMemo<number | null>(() => {
    if (!phase) return null;
    const parsed = Number(phase.id);
    return Number.isFinite(parsed) ? parsed : null;
  }, [phase]);

  // Real data fetches — both hooks short-circuit cleanly when their
  // ids are null (the API endpoints would 404 on bad ids), so we don't
  // need an extra `enabled` here.
  const tasksQuery = useConstructionTasks({
    constructionItemId: constructionItemId ?? undefined,
    enabled: constructionItemId != null && projectWorkingId != null,
    // Already scoped to one milestone, so cross-project bleed isn't a
    // risk here — but the backend still caps at 10 without this, which
    // would quietly truncate a milestone that has more tasks than that.
    pageSize: 200,
  });
  const issuesQuery = useIssues({
    constructionItemId: constructionItemId ?? undefined,
    projectWorkingId: projectWorkingId ?? undefined,
    enabled:
      constructionItemId != null &&
      projectWorkingId != null &&
      projectWorkingId > 0,
  });

  const tasks = tasksQuery.items;
  const openIssues = React.useMemo(
    () =>
      issuesQuery.items.filter(
        (i) => i.status === "open" || i.status === "in_progress",
      ),
    [issuesQuery.items],
  );

  // Per-drawer-open task completion. Reset every time `phase` changes
  // so reopening the drawer for a different phase starts fresh. Local
  // toggle only — the real mutation lands on the dedicated tasks page.
  const [doneTaskIds, setDoneTaskIds] = React.useState<Record<number, boolean>>(
    {},
  );
  useResetOnChange(phase?.id, () => {
    setDoneTaskIds({});
  });

  if (!phase) return null;

  const doneCount = Object.values(doneTaskIds).filter(Boolean).length;
  const totalTasks = tasks.length;
  const blockersCount = openIssues.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        {/* Header */}
        <SheetHeader className="flex-row items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span
              className={cn(
                "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                STATUS_TONE[phase.status].className
                  .split(" ")
                  .filter((c) => c.startsWith("bg-") || c.startsWith("text-"))
                  .join(" "),
              )}
            >
              {phase.status === "inProgress" ? (
                <FlagTriangleRight className="size-3" aria-hidden />
              ) : null}
              {tStatus(phase.status)}
            </span>
            <SheetTitle className="text-base">{phase.label}</SheetTitle>
            <SheetDescription>
              {phase.shortLabel} · {t("title")}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t("close")}
            >
              <X aria-hidden />
            </Button>
          </SheetClose>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* KPI strip */}
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Kpi
              label={t("kpi.progress")}
              value={
                <span className="tabular-nums">{phase.progress}%</span>
              }
            />
            <Kpi
              label={t("kpi.tasksDone")}
              value={
                <span className="tabular-nums">
                  {doneCount}
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    {t("kpi.tasksTotal", { total: totalTasks })}
                  </span>
                </span>
              }
            />
            <Kpi
              label={t("kpi.blockers")}
              value={
                <span
                  className={cn(
                    "tabular-nums",
                    blockersCount > 0 &&
                      "text-rose-700 dark:text-rose-300",
                  )}
                >
                  {blockersCount}
                </span>
              }
            />
          </dl>

          {/* Meta — targeted + actual dates (real data). */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" aria-hidden />
              <span className="text-foreground">
                {format.dateTime(new Date(phase.targetDate), {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="opacity-80">· {t("kpi.target")}</span>
            </span>
          </div>

          {/* Progress bar */}
          <ProgressBar percent={phase.progress} />

          {/* Sections */}
          <div className="mt-5 flex flex-col gap-5">
            {/* Tasks */}
            <Section
              title={t("sections.tasks")}
              meta={
                doneCount > 0
                  ? `${doneCount}/${totalTasks}`
                  : totalTasks > 0
                    ? `${totalTasks}`
                    : undefined
              }
            >
              {tasksQuery.isLoading ? (
                <Empty>{t("loadingTasks")}</Empty>
              ) : totalTasks === 0 ? (
                <Empty>{t("noTasks")}</Empty>
              ) : (
                <ul className="flex flex-col gap-1">
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      done={Boolean(doneTaskIds[task.id])}
                      onToggle={() =>
                        setDoneTaskIds((prev) => ({
                          ...prev,
                          [task.id]: !prev[task.id],
                        }))
                      }
                      tDone={t("taskDone")}
                      tUndone={t("taskUndone")}
                    />
                  ))}
                </ul>
              )}
            </Section>

            {/* Open issues */}
            <Section
              title={t("sections.issues")}
              meta={
                blockersCount > 0 ? `${blockersCount}` : undefined
              }
            >
              {issuesQuery.isLoading ? (
                <Empty>{t("loadingIssues")}</Empty>
              ) : openIssues.length === 0 ? (
                <Empty>{t("noIssues")}</Empty>
              ) : (
                <ul className="flex flex-col gap-2">
                  {openIssues.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      format={format}
                      targetLabel={t("issueTarget", {
                        date: issue.estimateAt
                          ? format.dateTime(new Date(issue.estimateAt), {
                              month: "short",
                              day: "numeric",
                            })
                          : t("issueTargetNone"),
                      })}
                      statusLabel={tStatus(issue.status)}
                    />
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3">
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <TriangleAlert className="size-3" aria-hidden />
            {blockersCount > 0 ? tStatus("blocked") : tStatus(phase.status)}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleOpenFull}
              disabled={!projectId}
              title={projectId ? t("openFull") : undefined}
            >
              <ArrowUpRight aria-hidden />
              {t("openFull")}
            </Button>
            <SheetClose asChild>
              <Button type="button" size="sm" variant="outline">
                {t("closeCta")}
              </Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/40 bg-card/60 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-2 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {meta ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-foreground">
            {meta}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="mt-3 flex flex-col gap-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

function TaskRow({
  task,
  done,
  onToggle,
  tDone,
  tUndone,
}: {
  task: ConstructionTask;
  done: boolean;
  onToggle: () => void;
  tDone: string;
  tUndone: string;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? tUndone : tDone}
        className={cn(
          "group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          done && "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
            done
              ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          {done ? (
            <CheckCircle2 className="size-3" aria-hidden />
          ) : (
            <Circle className="size-2.5" aria-hidden />
          )}
        </span>
        <span className={cn("flex-1", done && "line-through")}>
          {task.name}
        </span>
        {task.reason ? (
          <span
            title={task.reason}
            className="ml-2 line-clamp-1 max-w-[40%] text-[10px] text-muted-foreground"
          >
            {task.reason}
          </span>
        ) : null}
      </button>
    </li>
  );
}

function IssueRow({
  issue,
  format,
  targetLabel,
  statusLabel,
}: {
  issue: Issue;
  format: ReturnType<typeof useFormatter>;
  targetLabel: string;
  statusLabel: string;
}) {
  const tone = ISSUE_TONE[issue.status];
  return (
    <li
      className={cn(
        "rounded-md border px-3 py-2",
        tone.boxClass,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {issue.issueTypeName}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            tone.badgeClass,
          )}
        >
          {statusLabel}
        </span>
      </div>
      {issue.cause ? (
        <p className="mt-1 text-xs text-muted-foreground">{issue.cause}</p>
      ) : null}
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {targetLabel}
        {" · "}
        {format.dateTime(new Date(issue.createdAt), {
          month: "short",
          day: "numeric",
        })}
      </p>
    </li>
  );
}

// ─── Tones (kept locally so the drawer is self-contained) ─────────────────────

const STATUS_TONE: Record<
  string,
  { className: string }
> = {
  completed: {
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  inProgress: {
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  blocked: {
    className: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  upcoming: {
    className: "bg-muted text-muted-foreground",
  },
};

const ISSUE_TONE: Record<
  Issue["status"],
  { boxClass: string; badgeClass: string }
> = {
  open: {
    boxClass: "border-rose-500/40 bg-rose-500/5",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  in_progress: {
    boxClass: "border-amber-500/40 bg-amber-500/5",
    badgeClass:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  resolved: {
    boxClass: "border-emerald-500/40 bg-emerald-500/5",
    badgeClass:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  closed: {
    boxClass: "border-border/60 bg-card",
    badgeClass: "bg-muted text-muted-foreground",
  },
};