"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, ListChecks, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface MilestoneManagementToolbarProps {
  projectId: string;
  phaseCount: number;
  taskCount: number;
  doneTaskCount: number;
  onAddPhase: () => void;
  /**
   * Disables the "Add phase" CTA. Creating a construction item requires an
   * `accepted` engagement with a confirmed contract — the server refuses
   * otherwise, so the button shouldn't invite the attempt.
   */
  addPhaseDisabled?: boolean;
  /**
   * Opens the "apply a process template" dialog. Omitted on screens with no
   * engagement to apply one to, and the button is left out entirely there
   * rather than rendered dead.
   */
  onApplyTemplate?: () => void;
  /** Same gate as {@link addPhaseDisabled} — applying also needs a signed contract. */
  applyTemplateDisabled?: boolean;
}

/**
 * Sticky toolbar at the top of the management page. Carries the
 * page-level title, summary stats, and the primary "Add phase" CTA.
 */
export function MilestoneManagementToolbar({
  projectId,
  phaseCount,
  taskCount,
  doneTaskCount,
  onAddPhase,
  addPhaseDisabled = false,
  onApplyTemplate,
  applyTemplateDisabled = false,
}: MilestoneManagementToolbarProps) {
  const t = useTranslations("MilestoneManagement.toolbar");

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-gradient-to-br from-primary/5 via-background to-background px-4 py-3">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="font-heading text-lg font-semibold text-foreground">
            <MilestoneManagementTitle />
          </h1>
        </div>
        <p className="max-w-prose text-xs text-muted-foreground">
          <MilestoneManagementSubtitle />
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
          <Pill>{t("totalPhases", { count: phaseCount })}</Pill>
          <Pill>{t("totalTasks", { count: taskCount })}</Pill>
          <Pill highlight>{t("doneTasks", { done: doneTaskCount, total: taskCount })}</Pill>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          asChild
          type="button"
          size="sm"
          variant="ghost"
        >
          <Link href={`/projects/${projectId}/construction-overview`}>
            <ArrowLeft aria-hidden />
            {t("backToOverview")}
          </Link>
        </Button>
        {onApplyTemplate ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onApplyTemplate}
            disabled={applyTemplateDisabled}
          >
            <ListChecks aria-hidden />
            {t("applyTemplate")}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          onClick={onAddPhase}
          disabled={addPhaseDisabled}
        >
          <Plus aria-hidden />
          {t("addPhase")}
        </Button>
      </div>
    </header>
  );
}

function Pill({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <span
      className={
        highlight
          ? "rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-foreground"
          : "rounded-full border border-border/60 bg-card px-2 py-0.5 text-foreground"
      }
    >
      {children}
    </span>
  );
}

function MilestoneManagementTitle() {
  const t = useTranslations("MilestoneManagement");
  return <>{t("title")}</>;
}

function MilestoneManagementSubtitle() {
  const t = useTranslations("MilestoneManagement");
  return <>{t("subtitle")}</>;
}