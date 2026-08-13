"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  Hammer,
  Layers,
  PenLine,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatVndParts } from "@/lib/format-currency";
import type {
  MyProjectContractType,
  MyProjectStatus,
  MyProjectWorking,
} from "@/features/projects/my-projects-types";

// ─── Locale-aware formatters (kept inline — single use site) ────────────────

const NF_DATE_EN = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const NF_DATE_VI = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});


function formatDate(date: Date, locale: string): string {
  return (locale.startsWith("vi") ? NF_DATE_VI : NF_DATE_EN).format(date);
}

// ─── Status / contract-type tone ────────────────────────────────────────────

const STATUS_TONE: Record<MyProjectStatus, string> = {
  requested:
    "border-sky-300/50 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-950/40 dark:text-sky-300",
  accepted:
    "border-emerald-300/50 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-950/40 dark:text-emerald-300",
  completed:
    "border-border bg-muted text-muted-foreground",
};

const CONTRACT_ICON: Record<
  MyProjectContractType,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  design: PenLine,
  construction: Hammer,
  // Turnkey — neither a pen nor a hammer alone reads right, so use the
  // combined-scope icon.
  both: Layers,
};

interface MyProjectCardProps {
  project: MyProjectWorking;
  className?: string;
}

/**
 * Card for a single "My Projects" row. Click anywhere on the card body
 * to navigate to the underlying project's overview page
 * (`/[locale]/projects/{projectShopOwnerId}`).
 *
 * Surfaces:
 *   - Project name
 *   - Contract-type pill (design / construction) and status pill
 *   - Confirmed-contract badge (only when `hasConfirmedContract`)
 *   - Owner invitation message preview (single line, truncated)
 *   - Engagement start date (or fall back to `createdAt`)
 */
export function MyProjectCard({ project, className }: MyProjectCardProps) {
  const locale = useLocale();
  const t = useTranslations("MyProjects.card");

  const ContractIcon = CONTRACT_ICON[project.contractType];
  const statusLabel = t(`status.${project.status}`);
  const contractTypeLabel = t(`contractType.${project.contractType}`);

  // Prefer `startedAt` when present; otherwise fall back to `createdAt`
  // so cards always render a meaningful date for the row.
  const displayDate = project.startedAt ?? project.createdAt;
  const dateLabel = project.startedAt ? t("startedLabel") : t("invitedLabel");

  const contract = project.contract;
  const contractValue = contract ? formatVndParts(contract.agreedValue, locale) : null;

  return (
    <Link
      href={`/projects/${project.projectShopOwnerId}`}
      className={cn(
        "group flex h-full flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
      aria-label={t("viewAria", { name: project.projectName })}
    >
      <div className="flex items-start justify-between gap-2">
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/5 text-primary"
        >
          <ContractIcon className="me-1 size-3" aria-hidden />
          {contractTypeLabel}
        </Badge>
        <Badge variant="outline" className={STATUS_TONE[project.status]}>
          {statusLabel}
        </Badge>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
          {project.projectName || t("unnamedProject")}
        </h3>
        {project.requestMessage ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {project.requestMessage}
          </p>
        ) : null}
      </div>

      {/* Confirmed-contract badge — only when the backend says one exists.
          Shows title + agreed value so the provider sees the headline
          terms at a glance without drilling into the contract page. */}
      {project.hasConfirmedContract && contract ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-300/40 bg-emerald-50/60 px-3 py-2 text-[11px] text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-1.5 font-medium">
              <FileText className="size-3 shrink-0" aria-hidden />
              <span className="line-clamp-1">{contract.title}</span>
            </div>
            {contractValue ? (
              <span className="text-emerald-700/80 dark:text-emerald-300/80">
                {contractValue.full}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-3 shrink-0" aria-hidden />
          <span>
            {dateLabel}: {formatDate(displayDate, locale)}
          </span>
        </div>
        <ArrowUpRight
          className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden
        />
      </div>
    </Link>
  );
}
