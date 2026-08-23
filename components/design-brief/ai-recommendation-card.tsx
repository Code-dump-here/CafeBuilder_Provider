"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  Coins,
  ExternalLink,
  Grid3x3,
  ListOrdered,
  Loader2,
  Maximize2,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ConceptImage } from "@/components/design-brief/concept-image";

import { projectActionToast } from "@/components/project-overview/project-action-toast";
import { formatVndMillions } from "@/lib/format-currency";
import type {
  AiRecommendation,
  AiRecommendationState,
  RiskNote,
} from "@/features/projects/design-brief-types";

interface AiRecommendationCardProps {
  recommendation: AiRecommendation;
  /**
   * Open the full detail dialog for this iteration. When omitted, the
   * card stays visual-only (no affordance shown). The caller (the list)
   * owns the dialog state so a single keypress closes any open detail.
   */
  onOpenDetails?: (rec: AiRecommendation) => void;
}

type Variant = "queued" | "running" | "completed" | "failed" | "legacy";

function deriveVariant(state: AiRecommendationState): Variant {
  switch (state) {
    case "queued":
      return "queued";
    case "running":
      return "running";
    case "failed":
      return "failed";
    case "completed":
      return "completed";
    case null:
    default:
      return "legacy";
  }
}

function formatDateTime(
  value: Date | null,
  format: ReturnType<typeof useFormatter>,
) {
  if (!value) return null;
  return format.dateTime(value, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Renders one AI design iteration. The layout is **state-aware**: queued
 * entries stay slim (just status + timestamp + concept summary), failed
 * entries surface the worker error inline, and completed entries expand
 * into the full plan / cost / flow / image grid.
 *
 * Why a switch (not early returns): keeps the outer card chrome consistent
 * (border, padding, header) across states so the timeline reads as a single
 * vertical column even when the inner content density varies wildly.
 */
export function AiRecommendationCard({
  recommendation,
  onOpenDetails,
}: AiRecommendationCardProps) {
  const t = useTranslations("ProjectsOverview.designBrief.ai");
  const format = useFormatter();

  const variant = deriveVariant(recommendation.state);
  const createdAt = formatDateTime(recommendation.createdAt, format);

  // `legacy` rows predate the `state` column on the backend — render them
  // with the same chrome as `queued` so the timeline stays uniform.
  const stateKey: "queued" | "running" | "completed" | "failed" =
    variant === "legacy" ? "queued" : variant;
  const stateLabel = t(`states.${stateKey}`);

  const copyError = React.useCallback(async () => {
    if (!recommendation.lastError) return;
    try {
      await navigator.clipboard.writeText(recommendation.lastError);
      projectActionToast(t("errorCopied"));
    } catch {
      projectActionToast(t("errorCopied"));
    }
  }, [recommendation.lastError, t]);

  return (
    <article
      aria-labelledby={`ai-rec-${recommendation.id}-title`}
      data-variant={variant}
      className={cn(
        "flex flex-col gap-4 rounded-lg border bg-background/40 p-4 transition-colors",
        "border-border/60",
        variant === "failed" && "border-destructive/40 bg-destructive/5",
        variant === "queued" && "border-dashed",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            id={`ai-rec-${recommendation.id}-title`}
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <Sparkles
              className="size-3.5 shrink-0 text-primary"
              aria-hidden
            />
            <span className="truncate">{recommendation.conceptSummary}</span>
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {createdAt ? (
              <>
                {formatDateTime(recommendation.createdAt, format)}
                {" · "}
              </>
            ) : null}
            <span className="font-mono">#{recommendation.id}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {onOpenDetails ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("viewDetails")}
              onClick={() => onOpenDetails(recommendation)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Maximize2 aria-hidden />
            </Button>
          ) : null}
          <StateBadge variant={variant} label={stateLabel} />
        </div>
      </header>

      {variant === "queued" || variant === "running" ? (
        <QueuedBody jobId={recommendation.jobId} jobLabel={t("jobId")} noJobLabel={t("noJobId")} />
      ) : null}

      {variant === "failed" ? (
        <FailedBody
          error={recommendation.lastError}
          jobId={recommendation.jobId}
          copyLabel={t("copyError")}
          retryLabel={t("retry")}
          retryHint={t("retryComingSoon")}
          onCopy={copyError}
        />
      ) : null}

      {variant === "completed" ? (
        <CompletedBody rec={recommendation} />
      ) : null}

      {variant === "legacy" ? (
        <LegacyBody rec={recommendation} />
      ) : null}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents

function StateBadge({ variant, label }: { variant: Variant; label: string }) {
  const Icon =
    variant === "completed"
      ? CheckCircle2
      : variant === "failed"
        ? TriangleAlert
        : variant === "running"
          ? Loader2
          : Clock;

  return (
    <Badge
      variant={
        variant === "completed"
          ? "default"
          : variant === "failed"
            ? "destructive"
            : "secondary"
      }
      className={cn(
        "shrink-0 gap-1 text-[10px] font-semibold uppercase tracking-wide",
        variant === "running" && "animate-pulse",
      )}
    >
      <Icon
        className={cn(
          "size-3",
          variant === "running" && "animate-spin",
        )}
        aria-hidden
      />
      {label}
    </Badge>
  );
}

function QueuedBody({
  jobId,
  jobLabel,
  noJobLabel,
}: {
  jobId: string | null;
  jobLabel: string;
  noJobLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Loader2 className="size-3 animate-spin" aria-hidden />
        <span className="wrap-break-word font-mono">
          {jobId ?? noJobLabel}
        </span>
      </span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
        {jobLabel}
      </span>
    </div>
  );
}

function FailedBody({
  error,
  jobId,
  copyLabel,
  retryLabel,
  retryHint,
  onCopy,
}: {
  error: string | null;
  jobId: string | null;
  copyLabel: string;
  retryLabel: string;
  retryHint: string;
  onCopy: () => void;
}) {
  const t = useTranslations("ProjectsOverview.designBrief.ai");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
        <AlertTriangle
          className="mt-0.5 size-3.5 shrink-0"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t("failedTitle")}</p>
          {error ? (
            <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap wrap-break-word font-mono text-[11px] leading-relaxed text-destructive/90">
              {error}
            </pre>
          ) : null}
          <p className="mt-2 text-[11px] text-destructive/80">
            {t("failedHint")}
          </p>
          {jobId ? (
            <p className="mt-1 font-mono text-[10px] text-destructive/70">
              {t("jobId")}: {jobId}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onCopy}
          disabled={!error}
          aria-label={copyLabel}
        >
          <ClipboardCopy aria-hidden />
          {copyLabel}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => projectActionToast(retryHint)}
          aria-label={retryLabel}
        >
          <RefreshCw aria-hidden />
          {retryLabel}
        </Button>
      </div>
    </div>
  );
}

function LegacyBody({ rec }: { rec: AiRecommendation }) {
  return (
    <p className="text-sm text-foreground/90 wrap-break-word">
      {rec.conceptSummary}
    </p>
  );
}

function CompletedBody({ rec }: { rec: AiRecommendation }) {
  const t = useTranslations("ProjectsOverview.designBrief.ai");
  const format = useFormatter();
  const hasCost =
    rec.fitoutMinVnd != null ||
    rec.fitoutMaxVnd != null ||
    rec.equipmentMinVnd != null ||
    rec.equipmentMaxVnd != null;
  const hasLayout =
    rec.layoutWidth != null &&
    rec.layoutHeight != null &&
    rec.layoutUnit != null;
  const hasFlow = !!rec.customerFlow && rec.customerFlow.length > 0;
  const hasRecs = !!rec.recommendations && rec.recommendations.length > 0;
  const hasRisks = !!rec.riskNotes && rec.riskNotes.length > 0;
  const hasImage = !!rec.imageArtifactUrl;
  const hasPlan = !!rec.planConceptName || !!rec.planSummary;

  if (
    !hasCost &&
    !hasLayout &&
    !hasFlow &&
    !hasRecs &&
    !hasRisks &&
    !hasImage &&
    !hasPlan
  ) {
    return (
      <p className="text-sm text-muted-foreground">{t("noPlan")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rec.imageArtifactUrl ? (
        <ConceptImage
          src={rec.imageArtifactUrl}
          prompt={rec.imagePrompt}
          promptLabel={t("imagePromptLabel")}
          imageLabel={t("image")}
        />
      ) : null}

      {hasPlan ? (
        <section
          aria-label={t("planSummary")}
          className="flex flex-col gap-1.5"
        >
          <SectionHeading icon={Sparkles}>
            {t("planSummary")}
          </SectionHeading>
          {rec.planConceptName ? (
            <p className="text-sm font-semibold text-foreground">
              {rec.planConceptName}
            </p>
          ) : null}
          {rec.planSummary ? (
            <p className="text-sm text-foreground/90 wrap-break-word">
              {rec.planSummary}
            </p>
          ) : null}
        </section>
      ) : null}

      {hasCost ? (
        <section aria-label={t("cost")} className="flex flex-col gap-2">
          <SectionHeading icon={Coins}>{t("cost")}</SectionHeading>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rec.fitoutMinVnd != null && rec.fitoutMaxVnd != null ? (
              <CostRow
                label={t("fitout")}
                value={`${formatVndMillions(rec.fitoutMinVnd, format)} – ${formatVndMillions(rec.fitoutMaxVnd, format)}`}
              />
            ) : null}
            {rec.equipmentMinVnd != null && rec.equipmentMaxVnd != null ? (
              <CostRow
                label={t("equipment")}
                value={`${formatVndMillions(rec.equipmentMinVnd, format)} – ${formatVndMillions(rec.equipmentMaxVnd, format)}`}
                bordered={false}
              />
            ) : null}
            {rec.contingencyPercent != null ? (
              <CostRow
                label={t("contingency")}
                value={`${format.number(rec.contingencyPercent, { maximumFractionDigits: 0 })}%`}
                bordered={false}
                className="sm:col-span-2"
              />
            ) : null}
          </dl>
        </section>
      ) : null}

      {hasLayout ? (
        <section
          aria-label={t("layout")}
          className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs"
        >
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Grid3x3 className="size-3.5" aria-hidden />
            {t("layout")}
          </span>
          <span className="font-mono font-medium text-foreground">
            {t("layoutSize", {
              width: rec.layoutWidth ?? 0,
              height: rec.layoutHeight ?? 0,
              unit: rec.layoutUnit ?? "m",
            })}
          </span>
        </section>
      ) : null}

      {rec.seatCapacityRecommendation != null ? (
        <section className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-primary/5 px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <ListOrdered className="size-3.5" aria-hidden />
            {t("seatCapacity")}
          </span>
          <span className="font-semibold text-foreground">
            {rec.seatCapacityRecommendation}
          </span>
        </section>
      ) : null}

      {hasFlow ? (
        <section
          aria-label={t("customerFlow")}
          className="flex flex-col gap-2"
        >
          <SectionHeading icon={ArrowRight}>{t("customerFlow")}</SectionHeading>
          <ol className="flex flex-col gap-1.5">
            {rec.customerFlow!.map((step, i) => (
              <li
                key={`${step.stage}-${i}`}
                className="flex items-start gap-2 rounded-md border border-border/60 bg-background/40 p-2.5 text-xs"
              >
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {step.stage}
                  </p>
                  <p className="wrap-break-word text-foreground/90">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {hasRecs ? (
        <section
          aria-label={t("recommendations")}
          className="flex flex-col gap-2"
        >
          <SectionHeading icon={Sparkles}>
            {t("recommendations")}
          </SectionHeading>
          <ul className="flex flex-col gap-1.5">
            {rec.recommendations!.map((item, i) => (
              <li
                key={`${item.title}-${i}`}
                className="flex items-start gap-2 rounded-md border border-border/60 bg-background/40 p-2.5 text-xs"
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    priorityTone(item.priority),
                  )}
                >
                  P{item.priority}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">
                    {item.title}
                  </p>
                  {item.rationale ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground wrap-break-word">
                      {item.rationale}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasRisks ? (
        <section aria-label={t("riskNotes")} className="flex flex-col gap-2">
          <SectionHeading icon={TriangleAlert}>{t("riskNotes")}</SectionHeading>
          <ul className="flex flex-col gap-1.5">
            {rec.riskNotes!.map((risk, i) => (
              <li
                key={`${risk.title}-${i}`}
                className={cn(
                  "flex items-start gap-2 rounded-md border p-2.5 text-xs",
                  riskLevelTone(risk.level),
                )}
              >
                <AlertTriangle
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{risk.title}</p>
                  <p className="mt-0.5 wrap-break-word text-foreground/90">
                    {risk.description}
                  </p>
                  {risk.mitigation ? (
                    <p className="mt-1 text-[11px] text-muted-foreground wrap-break-word">
                      {risk.mitigation}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      <Icon className="size-3" aria-hidden />
      {children}
    </p>
  );
}

function CostRow({
  label,
  value,
  bordered = true,
  className,
}: {
  label: string;
  value: string;
  bordered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        bordered && "border-b border-border/60 pb-2 last:border-b-0",
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground wrap-break-word">
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tone helpers

function priorityTone(priority: number) {
  if (priority <= 1) return "bg-primary text-primary-foreground";
  if (priority <= 2) return "bg-primary/15 text-primary";
  return "bg-muted text-muted-foreground";
}

function riskLevelTone(level: RiskNote["level"]) {
  switch (level) {
    case "high":
      return "border-destructive/40 bg-destructive/5 text-destructive";
    case "medium":
      return "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300";
    case "low":
    default:
      return "border-border/60 bg-background/40 text-foreground/90";
  }
}