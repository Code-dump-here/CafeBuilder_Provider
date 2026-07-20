"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  Camera,
  Cloud,
  CloudRain,
  Sun,
  TriangleAlert,
  Users,
  Wind,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import type {
  ConstructionLogEntry,
  ConstructionLogPhoto,
} from "@/lib/contractor/construction-log-data";

interface ConstructionLogEntryCardProps {
  entry: ConstructionLogEntry;
  /** First entry in the timeline — hides the top connector. */
  isFirst: boolean;
  /** Last entry in the timeline — hides the bottom connector. */
  isLast: boolean;
}

/**
 * A single day's construction log rendered as a timeline node.
 *
 * Layout:
 *   ┌─ connector ──── date badge ──── status pill ──── progress chip ─┐
 *   │                                                                │
 *   │  Title                                                         │
 *   │  • work performed bullet                                       │
 *   │  • work performed bullet                                       │
 *   │                                                                │
 *   │  [photo] [photo] [photo]                                       │
 *   │                                                                │
 *   │  weather · workers · issues                                    │
 *   └────────────────────────────────────────────────────────────────┘
 */
export function ConstructionLogEntryCard({
  entry,
  isFirst,
  isLast,
}: ConstructionLogEntryCardProps) {
  const t = useTranslations("ConstructionLog.entry");
  const tStatus = useTranslations("ConstructionLog.status");
  const tWeather = useTranslations("ConstructionLog.weather");
  const format = useFormatter();

  const dateLabel = format.dateTime(new Date(entry.date), {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const tone = STATUS_TONE[entry.status];

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {/* Connector rail */}
      <div aria-hidden className="flex w-8 flex-col items-center pt-1">
        <div
          className={`size-3 rounded-full ${tone.dotClass} ring-4 ring-card`}
        />
        <div
          className={`mt-1 flex-1 ${isLast ? "opacity-0" : "bg-border"}`}
          style={{ width: 2 }}
        />
      </div>

      {/* Entry body */}
      <div className="flex-1">
        <Card size="sm" className="border-border/60">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <time className="text-xs font-semibold text-foreground tabular-nums">
                {dateLabel}
              </time>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone.className}`}
              >
                {tStatus(entry.status)}
              </span>
              <ProgressChip
                delta={entry.progressDelta}
                cumulative={entry.cumulativeProgress}
                t={t}
              />
            </div>
            <CardTitle className="mt-1 text-sm">{entry.title}</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            <ul className="flex flex-col gap-1 text-xs text-foreground">
              {entry.workPerformed.map((line, idx) => (
                <li key={idx} className="flex gap-2">
                  <span
                    aria-hidden
                    className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/60"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            {entry.photos.length > 0 ? (
              <PhotoStrip photos={entry.photos} t={t} />
            ) : null}

            <Separator className="bg-border/60" />

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <WeatherIcon weather={entry.weather} />
                {tWeather(entry.weather)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" aria-hidden />
                {t("workers", { count: entry.workersOnSite })}
              </span>
              {entry.issueIds.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <TriangleAlert className="size-3" aria-hidden />
                  {t("issues", { count: entry.issueIds.length })}
                </span>
              ) : null}
              <span className="ml-auto text-[10px] uppercase tracking-wider">
                {t("loggedBy", { name: entry.loggedBy })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </li>
  );
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function ProgressChip({
  delta,
  cumulative,
  t,
}: {
  delta: number;
  cumulative: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const isUp = delta > 0;
  const isFlat = delta === 0;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-foreground tabular-nums">
      <span aria-hidden className={isFlat ? "text-muted-foreground" : isUp ? "text-emerald-500" : "text-rose-500"}>
        {isFlat ? "—" : isUp ? "▲" : "▼"}
      </span>
      <span>{t("progressDelta", { value: Math.abs(delta) })}</span>
      <span className="text-muted-foreground">·</span>
      <span>{t("cumulative", { percent: cumulative })}</span>
    </span>
  );
}

function PhotoStrip({
  photos,
  t,
}: {
  photos: ConstructionLogPhoto[];
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div
      role="list"
      aria-label={t("photosLabel")}
      className="grid grid-cols-3 gap-2 sm:grid-cols-4"
    >
      {photos.map((photo) => (
        <div
          key={photo.id}
          role="listitem"
          className={`group relative flex aspect-[4/3] items-end overflow-hidden rounded-md border border-border/40 ${PHOTO_TONE[photo.tone]}`}
        >
          <Camera
            className="absolute right-1.5 top-1.5 size-3 text-foreground/50"
            aria-hidden
          />
          <span className="relative w-full truncate px-1.5 py-1 text-[10px] font-medium text-foreground/90">
            {photo.caption}
          </span>
        </div>
      ))}
    </div>
  );
}

function WeatherIcon({
  weather,
}: {
  weather: ConstructionLogEntry["weather"];
}) {
  const className = "size-3";
  switch (weather) {
    case "sunny":
      return <Sun className={className} aria-hidden />;
    case "cloudy":
      return <Cloud className={className} aria-hidden />;
    case "rainy":
      return <CloudRain className={className} aria-hidden />;
    case "stormy":
      return <Wind className={className} aria-hidden />;
  }
}

// ─── Tone maps ───────────────────────────────────────────────────────────────

const STATUS_TONE: Record<
  ConstructionLogEntry["status"],
  { className: string; dotClass: string }
> = {
  onTrack: {
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
  minorDelay: {
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
  blocked: {
    className: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    dotClass: "bg-rose-500",
  },
  completed: {
    className: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    dotClass: "bg-sky-500",
  },
};

const PHOTO_TONE: Record<ConstructionLogPhoto["tone"], string> = {
  amber: "bg-amber-500/20",
  blue: "bg-sky-500/20",
  emerald: "bg-emerald-500/20",
  rose: "bg-rose-500/20",
  violet: "bg-violet-500/20",
  slate: "bg-slate-500/20",
};