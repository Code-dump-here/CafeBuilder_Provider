"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, MapPin, UserRound } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { TitleBlock, TitleCell } from "@/components/drawing-set/title-block";
import { useProjectDetail } from "@/features/projects/use-project-detail";
import { useEngagementBrief } from "@/features/projects/use-engagement-brief";
import { useConstructionItems } from "@/features/projects/use-construction";
import type { MyProjectWorking } from "@/features/projects/my-projects-types";
import { formatVndCompact } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

/**
 * What a provider needs to recognise a job without opening it: who it is
 * for, where, what was asked, what it is worth, when it is due and how far
 * along it is.
 *
 * The engagement list carries none of that — only the project name, the
 * owner's message and a date — so this reads the same three records the
 * project pages already load (and cache): the project, the owner's brief
 * through the engagement (readable from the invitation onwards, which is
 * the point: it is how a provider decides), and the milestone schedule once
 * there is construction work.
 */
function useProjectFacts(project: MyProjectWorking) {
  const { detail, isLoading: loadingDetail } = useProjectDetail(project.projectShopOwnerId);
  const { brief, isLoading: loadingBrief } = useEngagementBrief(project.id);
  const hasSchedule = project.status !== "requested" && project.contractType !== "design";
  const { topLevelItems } = useConstructionItems({
    projectWorkingId: project.id,
    pageSize: 100,
    enabled: hasSchedule,
  });

  const phases = hasSchedule ? topLevelItems : [];
  const lastEstimate = phases
    .map((phase) => phase.estimateAt)
    .filter((date): date is string => Boolean(date))
    .sort()
    .pop();

  return {
    detail,
    brief,
    isLoading: loadingDetail || loadingBrief,
    phasesDone: phases.filter((phase) => phase.status === "completed").length,
    phasesTotal: phases.length,
    targetDate: lastEstimate ? new Date(lastEstimate) : null,
  };
}

const formatDay = (date: Date, locale: string) =>
  new Intl.DateTimeFormat(locale.startsWith("vi") ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

/** Client, address and a one-line brief. */
export function ProjectFacts({
  project,
  className,
}: {
  project: MyProjectWorking;
  className?: string;
}) {
  const t = useTranslations("MyProjects.card.facts");
  const { detail, brief, isLoading } = useProjectFacts(project);

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
    );
  }

  const owner = detail?.owner;
  const briefLine = [
    brief?.style,
    brief?.seatCount ? t("seats", { count: brief.seatCount }) : null,
    detail?.areaM2 ? t("area", { area: detail.areaM2 }) : null,
  ].filter(Boolean);

  if (!owner && !detail?.address && briefLine.length === 0 && !brief?.timeline) return null;

  return (
    <dl className={cn("flex flex-col gap-1.5 text-xs", className)}>
      {owner ? (
        <div className="flex items-start gap-1.5">
          <dt className="sr-only">{t("client")}</dt>
          <UserRound aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <dd className="min-w-0 truncate text-foreground">
            {owner.fullName}
            {owner.shopName ? (
              <span className="text-muted-foreground"> · {owner.shopName}</span>
            ) : null}
          </dd>
        </div>
      ) : null}
      {detail?.address ? (
        <div className="flex items-start gap-1.5">
          <dt className="sr-only">{t("address")}</dt>
          <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <dd className="min-w-0 truncate text-muted-foreground">{detail.address}</dd>
        </div>
      ) : null}
      {/* The owner's own words for when — free text, so it gets a line here
          rather than being cut off in a title-block cell. */}
      {brief?.timeline ? (
        <div className="flex items-start gap-1.5">
          <dt className="sr-only">{t("timeline")}</dt>
          <CalendarClock aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <dd className="min-w-0 truncate text-foreground" title={brief.timeline}>
            {brief.timeline}
          </dd>
        </div>
      ) : null}
      {briefLine.length > 0 ? (
        <div>
          <dt className="sr-only">{t("brief")}</dt>
          <dd className="line-clamp-2 text-muted-foreground">{briefLine.join(" · ")}</dd>
        </div>
      ) : null}
    </dl>
  );
}

/**
 * The job's particulars as a title block along the foot of the card: value,
 * target and progress. Value is the confirmed contract when there is one,
 * otherwise the owner's budget. Target is the last milestone's estimate and
 * only appears once there is a schedule; before that the owner's timeline
 * is in `ProjectFacts`.
 */
export function ProjectFactsBlock({
  project,
  className,
}: {
  project: MyProjectWorking;
  className?: string;
}) {
  const t = useTranslations("MyProjects.card.facts");
  const tCard = useTranslations("MyProjects.card");
  const locale = useLocale();
  const { detail, phasesDone, phasesTotal, targetDate } = useProjectFacts(project);

  const contractValue = project.hasConfirmedContract ? project.contract?.agreedValue ?? null : null;
  const value = contractValue ?? detail?.budget ?? null;

  return (
    <TitleBlock className={cn("w-full border-x-0 border-b-0", className)}>
      <TitleCell label={contractValue !== null ? t("contract") : t("budget")} grow>
        {value !== null ? formatVndCompact(value, locale) : "—"}
      </TitleCell>
      {targetDate ? (
        <TitleCell label={t("target")} grow>
          {formatDay(targetDate, locale)}
        </TitleCell>
      ) : null}
      {phasesTotal > 0 ? (
        <TitleCell label={t("phases")}>
          {phasesDone}/{phasesTotal}
        </TitleCell>
      ) : (
        <TitleCell label={project.startedAt ? tCard("startedLabel") : tCard("invitedLabel")}>
          {formatDay(project.startedAt ?? project.createdAt, locale)}
        </TitleCell>
      )}
    </TitleBlock>
  );
}
