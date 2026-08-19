"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  Hammer,
  PencilRuler,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useContracts } from "@/features/projects/use-contracts";
import { useDesigns } from "@/features/projects/use-designs";
import { useConstructionItems } from "@/features/projects/use-construction";
import type { Engagement } from "@/features/projects/engagement-types";

interface NextStepsCardProps {
  /** The viewer's own accepted engagement on this project. */
  engagement: Engagement;
  projectId: string;
}

/** One thing to do, in the order the work actually happens. */
interface Step {
  key: string;
  icon: LucideIcon;
  /** Where the work gets done. Omitted when the ball is in the other court. */
  href?: string;
  /** `true` when this is on the provider's plate right now. */
  actionable: boolean;
}

/**
 * "What do I do next on this job?"
 *
 * The rules the backend enforces are spread across several endpoints — a
 * design needs a confirmed contract, a milestone needs one too, closing a
 * milestone needs its checklist passed — so a provider landing on the overview
 * had no way to tell whether they were blocked, waiting, or free to work
 * without opening each page in turn.
 *
 * This derives the current step from the engagement's own data. It reads three
 * queries the project's other pages already run, so revisiting the overview
 * costs nothing extra.
 */
export function NextStepsCard({ engagement, projectId }: NextStepsCardProps) {
  const t = useTranslations("ProjectsOverview.nextSteps");

  const scope = engagement.contractType;
  const hasDesignPhase = scope === "design" || scope === "both";
  const hasBuildPhase = scope === "construction" || scope === "both";

  const { confirmedContract, latestContract, isLoading: loadingContracts } =
    useContracts({ projectWorkingId: engagement.id });

  // Design and milestone work is gated on a signed contract server-side, so
  // there is nothing to ask about until there is one.
  const gateOpen = confirmedContract != null;

  const { designs, isLoading: loadingDesigns } = useDesigns({
    projectWorkingId: engagement.id,
    enabled: gateOpen && hasDesignPhase,
  });

  const { topLevelItems, isLoading: loadingItems } = useConstructionItems({
    projectWorkingId: engagement.id,
    enabled: gateOpen && hasBuildPhase,
    pageSize: 100,
  });

  const isLoading =
    loadingContracts ||
    (gateOpen && hasDesignPhase && loadingDesigns) ||
    (gateOpen && hasBuildPhase && loadingItems);

  const steps = React.useMemo<Step[]>(() => {
    const out: Step[] = [];

    // 1. Contract. Everything else is blocked until it is signed, so it is
    //    always the first and only step while it is outstanding.
    if (!gateOpen) {
      out.push({
        key: latestContract == null ? "contractMissing" : "contractUnsigned",
        icon: FileSignature,
        href: `/projects/${projectId}/contracts`,
        actionable: true,
      });
      return out;
    }

    // 2. Design, for any scope that includes it.
    if (hasDesignPhase) {
      const approved = designs.some((d) => d.status === "approved");
      const awaitingOwner = designs.some((d) => d.status === "submitted");
      const needsRevision = designs.some((d) => d.status === "revision");

      if (designs.length === 0) {
        out.push({ key: "designStart", icon: PencilRuler, href: `/projects/${projectId}/design-management`, actionable: true });
      } else if (needsRevision) {
        out.push({ key: "designRevise", icon: PencilRuler, href: `/projects/${projectId}/design-management`, actionable: true });
      } else if (awaitingOwner) {
        // Nothing to do — say so rather than offering a button that does nothing.
        out.push({ key: "designWaiting", icon: ClipboardCheck, actionable: false });
      } else if (!approved) {
        out.push({ key: "designSubmit", icon: PencilRuler, href: `/projects/${projectId}/design-management`, actionable: true });
      }
    }

    // 3. Construction.
    if (hasBuildPhase) {
      if (topLevelItems.length === 0) {
        out.push({ key: "milestonesPlan", icon: Hammer, href: `/projects/${projectId}/milestones`, actionable: true });
      } else {
        const open = topLevelItems.filter((i) => i.status !== "completed");
        if (open.length > 0) {
          out.push({ key: "milestonesProgress", icon: Hammer, href: `/projects/${projectId}/milestones`, actionable: true });
        }
      }
    }

    return out;
  }, [gateOpen, latestContract, hasDesignPhase, hasBuildPhase, designs, topLevelItems, projectId]);

  // Counts for the copy — only ever read when the matching step is present.
  const openMilestones = topLevelItems.filter((i) => i.status !== "completed").length;

  if (isLoading) {
    return (
      <Card size="sm" className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 p-4 pt-0">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  const allDone = steps.length === 0;

  return (
    <Card size="sm" aria-labelledby="next-steps-title" className="border-border/60">
      <CardHeader>
        <CardTitle id="next-steps-title" className="flex items-center gap-2 text-base">
          <ClipboardCheck className="size-4 text-primary" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 p-4 pt-0">
        {allDone ? (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-foreground">{t("allDone.title")}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("allDone.subtitle")}
              </p>
            </div>
          </div>
        ) : (
          steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex flex-col gap-1.5">
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                      step.actionable
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      {t(`steps.${step.key}.title`, { count: openMilestones })}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t(`steps.${step.key}.detail`, { count: openMilestones })}
                    </p>
                  </div>
                </div>
                {step.href ? (
                  <Button asChild size="sm" variant="outline" className="ml-7 w-fit">
                    <Link href={step.href}>
                      {t(`steps.${step.key}.cta`)}
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
