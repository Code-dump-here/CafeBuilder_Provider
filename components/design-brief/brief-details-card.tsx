"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  CalendarDays,
  CircleDot,
  Coins,
  HeartHandshake,
  Lightbulb,
  Palette,
  PenLine,
  Rocket,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DefinitionRow } from "@/components/project-overview/definition-row";
import type { DesignBrief } from "@/features/projects/design-brief-types";

interface BriefDetailsCardProps {
  brief: DesignBrief;
}

const SECTION_GAP = "border-t border-border/60 pt-4";

/**
 * Left-column "what the owner told us" card for the brief page.
 * Mirrors the design language of `ProjectIdentityCard` (same DefinitionRow,
 * same `border-t` separators) so the two-column layout reads as one
 * consistent surface.
 */
export function BriefDetailsCard({ brief }: BriefDetailsCardProps) {
  const t = useTranslations("ProjectsOverview.designBrief.detailsCard");
  const format = useFormatter();

  const formatDate = (value: Date) =>
    format.dateTime(value, { dateStyle: "medium" });

  return (
    <Card size="sm" aria-labelledby="brief-details-title" className="border-border/60">
      <CardHeader>
        <CardTitle id="brief-details-title" className="text-base">
          {t("title")}
        </CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <section
          aria-label={t("targetCustomer")}
          className="flex flex-col gap-3"
        >
          <DefinitionRow
            label={t("targetCustomer")}
            value={brief.targetCustomer}
            bordered={false}
          />
        </section>

        <section className={`flex flex-col gap-3 ${SECTION_GAP}`}>
          <DefinitionRow
            label={t("style")}
            value={
              <span className="inline-flex items-center gap-1.5">
                <Palette
                  className="size-3.5 text-muted-foreground"
                  aria-hidden
                />
                {brief.style}
              </span>
            }
          />
          <DefinitionRow
            label={t("mood")}
            value={
              <span className="inline-flex items-center gap-1.5">
                <Sparkles
                  className="size-3.5 text-muted-foreground"
                  aria-hidden
                />
                {brief.mood}
              </span>
            }
            bordered={false}
          />
        </section>

        <section className={`flex flex-col gap-3 ${SECTION_GAP}`}>
          <DefinitionRow
            label={t("seatCount")}
            value={
              <span className="inline-flex items-center gap-1.5">
                <Users
                  className="size-3.5 text-muted-foreground"
                  aria-hidden
                />
                {brief.seatCount != null
                  ? t("seats", { count: brief.seatCount })
                  : "—"}
              </span>
            }
            bordered={false}
          />
        </section>

        <section className={`flex flex-col gap-4 ${SECTION_GAP}`}>
          {brief.businessModel ? (
            <DefinitionRow
              label={t("businessModel")}
              value={
                <span className="inline-flex items-start gap-2">
                  <Coins
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="wrap-break-word">{brief.businessModel}</span>
                </span>
              }
            />
          ) : null}
          {brief.businessGoals ? (
            <DefinitionRow
              label={t("businessGoals")}
              value={
                <span className="inline-flex items-start gap-2">
                  <Rocket
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="wrap-break-word">{brief.businessGoals}</span>
                </span>
              }
            />
          ) : null}
          {brief.brandNote ? (
            <DefinitionRow
              label={t("brandNote")}
              value={
                <span className="inline-flex items-start gap-2">
                  <Lightbulb
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="wrap-break-word">{brief.brandNote}</span>
                </span>
              }
            />
          ) : null}
          {brief.operationNote ? (
            <DefinitionRow
              label={t("operationNote")}
              value={
                <span className="inline-flex items-start gap-2">
                  <Settings2
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="wrap-break-word">{brief.operationNote}</span>
                </span>
              }
              bordered={false}
            />
          ) : null}
        </section>

        {brief.timeline ? (
          <section
            className={`flex flex-col gap-3 ${SECTION_GAP}`}
            aria-label={t("timeline")}
          >
            <div className="flex items-start gap-2 rounded-md border-l-2 border-primary bg-primary/5 p-3 text-sm text-foreground/90">
              <CalendarDays
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("timeline")}
                </p>
                <p className="mt-1 wrap-break-word font-medium">
                  {brief.timeline}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <footer
          className={`flex items-center justify-between gap-2 text-xs text-muted-foreground ${SECTION_GAP}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <PenLine className="size-3.5" aria-hidden />
            <CircleDot className="size-1.5" aria-hidden />
            <span>{t("lastUpdated")}</span>
          </span>
          <time
            className="inline-flex items-center gap-1.5 font-medium text-foreground"
            dateTime={brief.updatedAt.toISOString()}
          >
            <HeartHandshake className="size-3.5" aria-hidden />
            {formatDate(brief.updatedAt)}
          </time>
        </footer>
      </CardContent>
    </Card>
  );
}