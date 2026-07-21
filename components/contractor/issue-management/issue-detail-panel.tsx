"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, CheckCircle2, ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { IssueStatusControl } from "./issue-status-control";
import type { Issue, IssueStatus } from "@/lib/projects/issue-types";

interface IssueDetailPanelProps {
  issue: Issue | null;
  onChangeStatus: (id: number, next: IssueStatus) => void;
  onEdit?: (issue: Issue) => void;
  onClose?: () => void;
  isChangingStatus?: boolean;
}

const formatDateTime = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
};

/**
 * Inline read-only / status-change panel that lives in the right
 * column of the issues page. Renders nothing visual until an
 * issue is selected — when null it shows a quiet placeholder
 * instructing the user to pick a row from the list.
 */
export function IssueDetailPanel({
  issue,
  onChangeStatus,
  onEdit,
  onClose,
  isChangingStatus,
}: IssueDetailPanelProps) {
  const t = useTranslations("MilestoneManagement.issue.detail");
  const tCommon = useTranslations("MilestoneManagement.common");
  const tEdit = useTranslations("MilestoneManagement.issue.edit");

  if (!issue) {
    return (
      <aside
        aria-label="Issue detail"
        className={cn(
          "flex h-full min-h-65 flex-col items-center justify-center gap-3",
          "rounded-lg border border-dashed border-border/60 bg-card/20 p-8",
          "text-center text-sm text-muted-foreground"
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-muted/30">
          <ImageIcon aria-hidden className="size-4" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground/80">{t("selectPromptTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("selectPromptBody")}</p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label={`Issue #${issue.id} detail`}
      className={cn(
        "flex h-full flex-col overflow-hidden",
        "rounded-lg border border-border/60 bg-card/30"
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-border/60 px-5 py-4">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          #{issue.id}
        </span>
        <h2 className="text-base font-semibold leading-tight text-foreground">
          {issue.issueTypeName ?? t("title")}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <IssueStatusControl
            status={issue.status}
            onChange={(next) => onChangeStatus(issue.id, next)}
            disabled={isChangingStatus}
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* LEFT — photos */}
          <div className="flex flex-col gap-3">
            <PhotoBlock label={t("fields.issueImage")} url={issue.issueImage} />
            <PhotoBlock label={t("fields.confirmImage")} url={issue.confirmImage} />
          </div>

          {/* RIGHT — narrative + meta */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/40 px-3.5 py-3 text-xs">
              <DateRow
                icon={<CalendarDays aria-hidden className="size-3.5" />}
                label={t("estimateAt")}
                value={formatDate(issue.estimateAt)}
              />
              {issue.actualAt ? (
                <DateRow
                  icon={
                    <CheckCircle2
                      aria-hidden
                      className="size-3.5 text-emerald-600 dark:text-emerald-400"
                    />
                  }
                  label={t("actualAt")}
                  value={formatDate(issue.actualAt)}
                  tone="success"
                />
              ) : null}
            </div>

            <Section title={t("fields.cause")} body={issue.cause} />
            <Section title={t("fields.reason")} body={issue.reason} />
            <Section title={t("fields.solution")} body={issue.solution} />

            <Separator />

            <dl className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
              <div>
                <dt className="inline font-medium">{t("createdBy")}: </dt>
                <dd className="inline">#{issue.createdBy}</dd>
              </div>
              <div>
                <dt className="inline font-medium">{t("updatedAt")}: </dt>
                <dd className="inline">{formatDateTime(issue.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-popover/95 px-5 py-3 backdrop-blur">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          #{issue.id}
        </span>
        <div className="flex items-center gap-2">
          {onClose ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {tCommon("close")}
            </Button>
          ) : null}
          {onEdit ? (
            <Button type="button" size="sm" onClick={() => onEdit(issue)}>
              {tEdit("title")}
            </Button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function DateRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      <span
        className={
          tone === "success"
            ? "font-medium text-emerald-600 dark:text-emerald-400"
            : "font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <section className="flex flex-col gap-1">
      <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {body}
      </p>
    </section>
  );
}

function PhotoBlock({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className="aspect-video w-full rounded-md border border-border/60 object-cover transition-opacity hover:opacity-90"
          />
        </a>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/30 text-muted-foreground">
          <ImageIcon aria-hidden className="size-5" />
        </div>
      )}
    </div>
  );
}