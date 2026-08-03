"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  CalendarClock,
  CheckCircle2,
  CircleDot,
  FileSignature,
  MessageSquare,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { OwnerAvatar } from "@/components/data-table";
import { projectActionToast } from "@/components/project-overview/project-action-toast";
import { cn } from "@/lib/utils";

import type {
  TechnicalDrawing,
  TechnicalDrawingAuthor,
} from "@/features/projects/technical-drawing-types";

interface ReviewerInfoCardProps {
  drawing: TechnicalDrawing | null;
}

/**
 * Right-rail card under the version history. Shows review state (open
 * / awaiting / approved), assigned reviewer(s), key dates and primary
 * action buttons. Today the assignees / dates are derived from the
 * drawing's author + latest revision; real reviewer assignments come
 * from the backend once wired.
 */
export function ReviewerInfoCard({ drawing }: ReviewerInfoCardProps) {
  const t = useTranslations("TechnicalDrawings");
  const format = useFormatter();

  if (!drawing) return null;

  // Mock reviewers: owner + contractor. Replace with backend fetch.
  const reviewers: TechnicalDrawingAuthor[] = [
    drawing.author,
    {
      id: 21,
      fullName: "Le Quang Huy",
      avatarColor: "#8E5A3B",
    },
  ];

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card">
      <header className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <FileSignature aria-hidden className="size-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground">
          {t("review.title")}
        </h3>
        <span className="ml-auto">
          <ReviewStatusBadge status={drawing.kind === "CONTRACT" ? "approved" : "open"} />
        </span>
      </header>

      <div className="flex flex-col gap-4 p-3">
        <div className="flex flex-col gap-1.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("review.reviewers")}
          </h4>
          <ul role="list" className="flex flex-col gap-1.5">
            {reviewers.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <OwnerAvatar name={r.fullName} color={r.avatarColor} />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-xs font-medium text-foreground">
                    {r.fullName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {r.id === drawing.author.id
                      ? t("review.roles.author")
                      : t("review.roles.contractor")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <dl className="grid grid-cols-1 gap-2 rounded-md bg-muted/30 p-2.5 text-xs">
          <MetaRow
            icon={CalendarClock}
            label={t("review.createdAt")}
            value={format.dateTime(drawing.createdAt, {
              dateStyle: "medium",
            })}
          />
          <MetaRow
            icon={CalendarClock}
            label={t("review.updatedAt")}
            value={format.dateTime(drawing.updatedAt, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
        </dl>

        <div className="flex flex-col gap-1.5">
          <Button
            size="sm"
            onClick={() => projectActionToast("Send for review will be available once the backend is wired.")}
          >
            <Send aria-hidden />
            {t("review.actions.sendForReview")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => projectActionToast("Review comments coming soon.")}
          >
            <MessageSquare aria-hidden />
            {t("review.actions.openComments")}
          </Button>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon aria-hidden className="size-3 shrink-0 text-muted-foreground" />
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="ml-auto text-xs font-medium text-foreground">{value}</dd>
    </div>
  );
}

function ReviewStatusBadge({
  status,
}: {
  status: "open" | "awaiting" | "approved";
}) {
  const t = useTranslations("TechnicalDrawings");
  const map: Record<typeof status, { icon: React.ComponentType<{ className?: string }>; cls: string; label: string }> = {
    open: {
      icon: CircleDot,
      cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      label: t("review.status.open"),
    },
    awaiting: {
      icon: CheckCircle2,
      cls: "bg-muted text-muted-foreground",
      label: t("review.status.awaiting"),
    },
    approved: {
      icon: CheckCircle2,
      cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      label: t("review.status.approved"),
    },
  };
  const tone = map[status];
  const Icon = tone.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone.cls,
      )}
    >
      <Icon className="size-2.5" aria-hidden />
      {tone.label}
    </span>
  );
}