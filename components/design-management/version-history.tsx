"use client";

import * as React from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { CheckCircle2, Circle, CircleDot, Clock, History } from "lucide-react";

import { cn } from "@/lib/utils";

import type {
  DesignVersion,
  VersionStatus,
} from "@/features/projects/design-version-types";

interface VersionHistoryProps {
  versions: DesignVersion[];
  currentVersionId: number;
  projectId: string;
}

const STATUS_ICON: Record<
  VersionStatus,
  React.ComponentType<{ className?: string }>
> = {
  in_progress: Circle,
  submitted: Clock,
  revision: CircleDot,
  approved: CheckCircle2,
};

const STATUS_COLOR: Record<VersionStatus, string> = {
  in_progress: "text-stone-500",
  submitted: "text-amber-500",
  revision: "text-red-500",
  approved: "text-emerald-500",
};

/**
 * Right rail showing the *project-level* version history (every
 * version, regardless of which one is currently open). The active
 * version is highlighted; the connecting rail gives the impression
 * of a release log timeline.
 */
export function VersionHistory({
  versions,
  currentVersionId,
  projectId,
}: VersionHistoryProps) {
  const t = useTranslations("DesignManagement");
  const format = useFormatter();

  // Sort newest first so the most recent activity surfaces at the
  // top (the user's attention usually goes there first).
  const sorted = React.useMemo(
    () =>
      [...versions].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      ),
    [versions],
  );

  return (
    <aside
      aria-label={t("history.label")}
      className="flex h-full flex-col gap-4 overflow-y-auto p-4"
    >
      <header className="flex flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("history.heading")}
        </p>
        <h3 className="text-sm font-semibold text-foreground">
          {t("history.title")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("history.subtitle", {
            count: sorted.length,
          })}
        </p>
      </header>

      <ol className="relative flex flex-col gap-3 border-l border-border/60 pl-4">
        {sorted.map((version) => {
          const Icon = STATUS_ICON[version.status];
          const isCurrent = version.id === currentVersionId;
          return (
            <li key={version.id} className="relative">
              {/* Dot on the rail. Uses `current` to brighten the
                  marker for the active version. */}
              <span
                aria-hidden
                className={cn(
                  "absolute left-[-1.45rem] top-1.5 flex size-4 items-center justify-center rounded-full bg-card",
                  STATUS_COLOR[version.status],
                )}
              >
                <Icon className="size-3" />
              </span>

              <Link
                href={`/projects/${projectId}/design-management/${version.id}`}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "flex flex-col gap-1 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-border/60 hover:bg-muted/40",
                  isCurrent && "border-primary/30 bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {version.code}
                  </span>
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-primary">
                      <Clock aria-hidden className="size-2.5" />
                      {t("history.active")}
                    </span>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "line-clamp-1 text-xs font-medium",
                    isCurrent ? "text-primary" : "text-foreground",
                  )}
                >
                  {version.name}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className={STATUS_COLOR[version.status]}>
                    {t(
                      `status.${version.status.toLowerCase()}` as
                        | "draft"
                        | "working"
                        | "published",
                    )}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    {format.dateTime(version.updatedAt, {
                      dateStyle: "medium",
                    })}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <footer className="mt-auto rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <History aria-hidden className="size-3" />
          {t("history.footnote")}
        </span>
      </footer>
    </aside>
  );
}
