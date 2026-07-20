"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  Circle,
  FlagTriangleRight,
  TriangleAlert,
  User,
  Users,
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

import {
  phaseExtras,
  type BlockerSeverity,
  type MilestonePhase,
} from "@/lib/contractor/construction-overview-data";

interface PhaseDetailDrawerProps {
  phase: MilestonePhase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Project id — used by "Open full page" to deep-link into /milestones. */
  projectId?: string;
}

/**
 * Right-side drawer that opens when the user clicks "Open phase detail"
 * on the construction-overview page. Renders a full read of the
 * selected phase: KPI strip, narrative, tasks (with local done state),
 * blockers (severity-toned), photos grid, and crew avatars.
 *
 * Why a drawer instead of a subroute:
 *  - Keeps the track + tiles in the parent page accessible.
 *  - Avoids URL churn while the user explores.
 *  - Matches the "context peek, not navigation" intent.
 */
export function PhaseDetailDrawer({
  phase,
  open,
  onOpenChange,
  projectId,
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

  // Per-drawer-open task completion. Reset every time `phase` changes
  // so reopening the drawer for a different phase starts fresh.
  const [doneTasks, setDoneTasks] = React.useState<Record<string, boolean>>(
    {}
  );
  React.useEffect(() => {
    setDoneTasks({});
  }, [phase?.id]);

  const extras = phase ? phaseExtras[phase.id] : null;

  if (!phase) return null;

  const doneCount = Object.values(doneTasks).filter(Boolean).length;
  const totalTasks = phase.tasks.length;
  const blockersCount = phase.blockerCount;

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
                  .join(" ")
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
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                    blockersCount > 0 && "text-rose-700 dark:text-rose-300"
                  )}
                >
                  {blockersCount}
                </span>
              }
            />
            <Kpi
              label={t("kpi.photos")}
              value={<span className="tabular-nums">{phase.photoCount}</span>}
            />
          </dl>

          {/* Meta */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <User className="size-3" aria-hidden />
              <span className="font-medium text-foreground">{phase.lead}</span>
              <span className="opacity-80">· {t("kpi.lead")}</span>
            </span>
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
            {/* Narrative */}
            {extras?.narrative ? (
              <Section title={t("sections.narrative")}>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {extras.narrative}
                </p>
              </Section>
            ) : null}

            {/* Tasks */}
            <Section
              title={t("sections.tasks")}
              meta={
                doneCount > 0
                  ? `${doneCount}/${totalTasks}`
                  : undefined
              }
            >
              {totalTasks === 0 ? (
                <Empty>{t("noTasks")}</Empty>
              ) : (
                <ul className="flex flex-col gap-1">
                  {phase.tasks.map((task, idx) => {
                    const id = `${phase.id}-task-${idx}`;
                    const done = Boolean(doneTasks[id]);
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() =>
                            setDoneTasks((prev) => ({ ...prev, [id]: !prev[id] }))
                          }
                          aria-pressed={done}
                          aria-label={done ? t("taskUndone") : t("taskDone")}
                          className={cn(
                            "group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            done && "text-muted-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                              done
                                ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "border-border bg-card text-muted-foreground"
                            )}
                          >
                            {done ? (
                              <CheckCircle2 className="size-3" aria-hidden />
                            ) : (
                              <Circle className="size-2.5" aria-hidden />
                            )}
                          </span>
                          <span className={cn(done && "line-through")}>
                            {task}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            {/* Blockers */}
            <Section
              title={t("sections.blockers")}
              meta={
                extras?.blockers?.length
                  ? `${extras.blockers.length}`
                  : undefined
              }
            >
              {!extras || extras.blockers.length === 0 ? (
                <Empty>{t("noBlockers")}</Empty>
              ) : (
                <ul className="flex flex-col gap-2">
                  {extras.blockers.map((b) => {
                    const tone = SEVERITY_TONE[b.severity];
                    return (
                      <li
                        key={b.id}
                        className={cn(
                          "rounded-md border px-3 py-2",
                          tone.boxClass
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {b.title}
                          </p>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                              tone.badgeClass
                            )}
                          >
                            {t(`severity.${b.severity}`)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {b.context}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {t("blockerFiled", {
                            date: format.dateTime(new Date(b.filedAt), {
                              month: "short",
                              day: "numeric",
                            }),
                          })}
                          {" · "}
                          {t("blockerOwner", { owner: b.ownerLabel })}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            {/* Photos */}
            <Section title={t("sections.photos")}>
              {!extras || extras.photos.length === 0 ? (
                <Empty>
                  <span className="inline-flex items-center gap-1.5">
                    <Camera className="size-3.5" aria-hidden />
                    {t("noPhotos")}
                  </span>
                </Empty>
              ) : (
                <ul className="grid grid-cols-3 gap-2">
                  {extras.photos.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-col gap-1"
                    >
                      <div
                        className={cn(
                          "aspect-square w-full rounded-md border border-border/40",
                          PHOTO_TONE[p.tone]
                        )}
                        aria-label={p.caption}
                        role="img"
                      />
                      <span className="line-clamp-1 text-[10px] text-muted-foreground">
                        {p.caption}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Crew */}
            <Section title={t("sections.crew")}>
              {!extras || extras.crew.length === 0 ? (
                <Empty>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" aria-hidden />
                    {t("noCrew")}
                  </span>
                </Empty>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {extras.crew.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-2 py-1 text-xs"
                    >
                      <span
                        aria-hidden
                        className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold uppercase text-primary"
                      >
                        {member.initials}
                      </span>
                      <span className="flex flex-col leading-tight">
                        <span className="font-medium text-foreground">
                          {member.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {member.role}
                        </span>
                      </span>
                    </li>
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
            {blockersCount > 0 ? tStatus("blocked") : tStatus("inProgress")}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleOpenFull}
              disabled={!projectId}
              title={
                projectId
                  ? t("openFull")
                  : undefined
              }
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

const SEVERITY_TONE: Record<
  BlockerSeverity,
  { boxClass: string; badgeClass: string }
> = {
  low: {
    boxClass: "border-border/60 bg-card",
    badgeClass: "bg-muted text-muted-foreground",
  },
  medium: {
    boxClass: "border-amber-500/40 bg-amber-500/5",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  high: {
    boxClass: "border-rose-500/40 bg-rose-500/5",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
};

const PHOTO_TONE: Record<string, string> = {
  amber: "bg-gradient-to-br from-amber-300/60 via-amber-200/40 to-amber-100/20",
  rose: "bg-gradient-to-br from-rose-300/60 via-rose-200/40 to-rose-100/20",
  emerald:
    "bg-gradient-to-br from-emerald-300/60 via-emerald-200/40 to-emerald-100/20",
  sky: "bg-gradient-to-br from-sky-300/60 via-sky-200/40 to-sky-100/20",
  violet:
    "bg-gradient-to-br from-violet-300/60 via-violet-200/40 to-violet-100/20",
};