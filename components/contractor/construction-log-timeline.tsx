"use client";

import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ConstructionLogEntryCard } from "@/components/contractor/construction-log-entry";
import type { ConstructionLogEntry } from "@/lib/contractor/construction-log-data";

interface ConstructionLogTimelineProps {
  entries: ConstructionLogEntry[];
}

/**
 * Vertical timeline rail for the construction log. Renders an entry
 * card per day with a connector line between them. Shows an empty-state
 * block when the filtered set is empty so the layout doesn't collapse.
 */
export function ConstructionLogTimeline({ entries }: ConstructionLogTimelineProps) {
  const t = useTranslations("ConstructionLog.timeline");

  return (
    <Card
      size="sm"
      aria-labelledby="construction-log-timeline-title"
      className="border-border/60"
    >
      <CardHeader>
        <CardTitle id="construction-log-timeline-title" className="text-base">
          {t("title")}
        </CardTitle>
        <CardDescription>{t("subtitle", { count: entries.length })}</CardDescription>
      </CardHeader>

      <CardContent>
        {entries.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <ol className="flex flex-col">
            {entries.map((entry, idx) => (
              <ConstructionLogEntryCard
                key={entry.id}
                entry={entry}
                isFirst={idx === 0}
                isLast={idx === entries.length - 1}
              />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}