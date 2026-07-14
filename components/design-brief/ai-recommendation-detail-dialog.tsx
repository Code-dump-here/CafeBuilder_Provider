"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Coins,
  Compass,
  ExternalLink,
  FileCode2,
  ImageIcon,
  ListOrdered,
  Map as MapIcon,
  Ruler,
  ScanLine,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import type {
  AiRecommendation,
  CustomerFlowStep,
  LayoutZone,
  PlanRecommendation,
  RiskNote,
} from "@/lib/projects/design-brief-types";

interface AiRecommendationDetailDialogProps {
  recommendation: AiRecommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Variant = "queued" | "running" | "completed" | "failed" | "legacy";

function deriveVariant(state: AiRecommendation["state"]): Variant {
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

const EMPTY_ZONE = "—";

/**
 * Full-page modal for inspecting a single AI design iteration.
 *
 * Sections, in order:
 *   1. Concept header (conceptSummary + state badge + timestamps + ids)
 *   2. Concept render (large image + view/aspect/negative-prompt/refs)
 *   3. Plan (concept name + free-form summary)
 *   4. Cost (fitout/equipment/contingency + per-cost-design/construction)
 *   5. Layout (zone grid viz + adjacency rules + seat capacity)
 *   6. Customer flow (numbered steps)
 *   7. Designer recommendations (priority-ranked)
 *   8. Risks & notes (level-toned)
 *   9. Lifecycle (attempts / startedAt / completedAt / parentJobId)
 *  10. Request payload (collapsible raw JSON)
 *
 * Sections that have no data on this iteration are hidden entirely —
 * we only render sections the backend actually returned, so the dialog
 * stays focused on what the AI worker produced.
 */
export function AiRecommendationDetailDialog({
  recommendation,
  open,
  onOpenChange,
}: AiRecommendationDetailDialogProps) {
  const t = useTranslations("ProjectsOverview.designBrief.ai");
  const tDetails = useTranslations("ProjectsOverview.designBrief.ai.details");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        // Override the primitive's `grid` so the dialog becomes a flex
        // column with a bounded height. The ScrollArea below needs a
        // real height to become scrollable — without `h-full`, `h-full`
        // on any child resolves to `auto` and the content overflows the
        // dialog instead of scrolling.
        className="left-0 top-0 flex h-full max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:left-1/2 sm:top-1/2 sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
      >
        {recommendation ? (
          <RecommendationBody
            rec={recommendation}
            t={t}
            tDetails={tDetails}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Body — owns the scroll region and the custom close button (the
// Radix-built-in close lives in the corner; we suppress it via
// `showCloseButton={false}` and render our own to control placement).

function RecommendationBody({
  rec,
  t,
  tDetails,
}: {
  rec: AiRecommendation;
  t: ReturnType<typeof useTranslations>;
  tDetails: ReturnType<typeof useTranslations>;
}) {
  const format = useFormatter();
  const variant = deriveVariant(rec.state);
  const stateKey: "queued" | "running" | "completed" | "failed" =
    variant === "legacy" ? "queued" : variant;
  const stateLabel = t(`states.${stateKey}`);
  const hasImage = !!rec.imageArtifactUrl;
  const hasImageMeta =
    !!rec.imagePrompt ||
    !!rec.imageView ||
    !!rec.imageAspectRatio ||
    !!rec.imageNegativePrompt ||
    !!rec.imageReferenceUrls?.length;
  const hasPlan = !!rec.planConceptName || !!rec.planSummary;
  const hasCost =
    rec.fitoutMinVnd != null ||
    rec.fitoutMaxVnd != null ||
    rec.equipmentMinVnd != null ||
    rec.equipmentMaxVnd != null ||
    rec.estimatedDesignCost != null ||
    rec.estimatedConstructionCost != null ||
    rec.contingencyPercent != null ||
    !!rec.costNotes;
  const hasZones =
    rec.layoutWidth != null &&
    rec.layoutHeight != null &&
    rec.layoutUnit != null;
  const hasZoneList = !!rec.layoutZones && rec.layoutZones.length > 0;
  const hasAdjacency =
    !!rec.layoutAdjacencyRules && rec.layoutAdjacencyRules.length > 0;
  const hasFlow = !!rec.customerFlow && rec.customerFlow.length > 0;
  const hasRecs = !!rec.recommendations && rec.recommendations.length > 0;
  const hasRisks = !!rec.riskNotes && rec.riskNotes.length > 0;
  const hasLifecycle =
    !!rec.jobId ||
    rec.attempts > 0 ||
    !!rec.startedAt ||
    !!rec.completedAt ||
    !!rec.parentJobId;
  const hasPayload = !!rec.payload;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <DialogHeader className="flex shrink-0 flex-row items-start justify-between gap-3 border-b border-border/60 bg-card/30 px-5 py-4">
        <div className="min-w-0 flex-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="truncate">{rec.conceptSummary}</span>
          </DialogTitle>
          <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span className="font-mono text-foreground/80">
              #{rec.id} · {t("jobId")}: {rec.jobId ?? t("noJobId")}
            </span>
            {rec.createdAt.getTime() !== 0 ? (
              <span>
                {tDetails("startedAt")}:{" "}
                <span className="text-foreground/80">
                  {format.dateTime(rec.createdAt, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </span>
            ) : null}
          </DialogDescription>
        </div>
        <div className="flex items-center gap-2">
          <VariantBadge variant={variant} label={stateLabel} />
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close">
              <X aria-hidden />
            </Button>
          </DialogClose>
        </div>
      </DialogHeader>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-6 px-5 py-5">
          <Section
            icon={Boxes}
            title={tDetails("concept")}
            hint={tDetails("conceptMissing")}
            visible
          >
            <p className="text-sm text-foreground/90 wrap-break-word">
              {rec.conceptSummary}
            </p>
          </Section>

          {hasImage ? (
            <Section icon={ImageIcon} title={tDetails("image")}>
              <ConceptImageLarge
                src={rec.imageArtifactUrl!}
                alt={rec.conceptSummary}
              />
            </Section>
          ) : null}

          {hasImageMeta ? (
            <Section icon={ScanLine} title={tDetails("imageMeta")}>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rec.imageView ? (
                  <MetaField
                    icon={Compass}
                    label={tDetails("imageView")}
                    value={rec.imageView}
                  />
                ) : null}
                {rec.imageAspectRatio ? (
                  <MetaField
                    icon={ArrowDownUp}
                    label={tDetails("imageAspect")}
                    value={rec.imageAspectRatio}
                  />
                ) : null}
              </dl>
              {rec.imagePrompt ? (
                <CollapsibleCode label={t("imagePromptLabel")}>
                  {rec.imagePrompt}
                </CollapsibleCode>
              ) : null}
              {rec.imageNegativePrompt ? (
                <CollapsibleCode label={tDetails("imageNegativePrompt")}>
                  {rec.imageNegativePrompt}
                </CollapsibleCode>
              ) : null}
              <ReferenceUrls
                urls={rec.imageReferenceUrls ?? []}
                label={tDetails("imageRefs")}
                emptyLabel={tDetails("imageRefsEmpty")}
              />
            </Section>
          ) : null}

          {hasPlan ? (
            <Section icon={Sparkles} title={tDetails("plan")}>
              {rec.planConceptName ? (
                <p className="text-base font-semibold text-foreground">
                  {rec.planConceptName}
                </p>
              ) : null}
              {rec.planSummary ? (
                <p className="text-sm text-foreground/90 wrap-break-word">
                  {rec.planSummary}
                </p>
              ) : null}
            </Section>
          ) : null}

          {hasCost ? (
            <Section icon={Coins} title={tDetails("cost")}>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rec.fitoutMinVnd != null && rec.fitoutMaxVnd != null ? (
                  <CostRangeField
                    icon={Coins}
                    label={tDetails("fitoutRange")}
                    min={rec.fitoutMinVnd}
                    max={rec.fitoutMaxVnd}
                    format={format}
                  />
                ) : null}
                {rec.equipmentMinVnd != null &&
                rec.equipmentMaxVnd != null ? (
                  <CostRangeField
                    icon={Coins}
                    label={tDetails("equipmentRange")}
                    min={rec.equipmentMinVnd}
                    max={rec.equipmentMaxVnd}
                    format={format}
                  />
                ) : null}
                {rec.estimatedDesignCost != null ? (
                  <MetaField
                    icon={Coins}
                    label={tDetails("designCost")}
                    value={formatVnd(rec.estimatedDesignCost, format)}
                  />
                ) : null}
                {rec.estimatedConstructionCost != null ? (
                  <MetaField
                    icon={Coins}
                    label={tDetails("constructionCost")}
                    value={formatVnd(rec.estimatedConstructionCost, format)}
                  />
                ) : null}
                {rec.contingencyPercent != null ? (
                  <MetaField
                    icon={Coins}
                    label={tDetails("contingency")}
                    value={`${format.number(rec.contingencyPercent, { maximumFractionDigits: 0 })}%`}
                  />
                ) : null}
              </dl>
              {rec.costNotes ? (
                <p className="text-sm text-foreground/90 wrap-break-word">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {tDetails("costNotes")}
                  </span>{" "}
                  {rec.costNotes}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {tDetails("costNotesEmpty")}
                </p>
              )}
            </Section>
          ) : null}

          {hasZones || hasZoneList ? (
            <Section icon={MapIcon} title={tDetails("layout")}>
              {hasZones ? (
                <p className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 font-mono text-xs">
                  <Ruler className="size-3.5 text-muted-foreground" aria-hidden />
                  {tDetails("layoutSize", {
                    width: rec.layoutWidth ?? 0,
                    height: rec.layoutHeight ?? 0,
                    unit: rec.layoutUnit ?? "m",
                  })}
                </p>
              ) : null}
              {hasZoneList ? (
                <div className="flex flex-col gap-3">
                  <ZoneGridVisual zones={rec.layoutZones ?? []} />
                  <ul className="flex flex-col gap-1.5">
                    {(rec.layoutZones ?? []).map((zone) => (
                      <ZoneListRow key={zone.id} zone={zone} />
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {tDetails("zonesEmpty")}
                </p>
              )}
              {hasAdjacency ? (
                <CollapsibleCode label={tDetails("adjacency")}>
                  {JSON.stringify(rec.layoutAdjacencyRules ?? [], null, 2)}
                </CollapsibleCode>
              ) : null}
            </Section>
          ) : null}

          {rec.seatCapacityRecommendation != null ? (
            <MetaField
              icon={Users}
              label={tDetails("seatCapacity")}
              value={String(rec.seatCapacityRecommendation)}
              emphasized
            />
          ) : null}

          {hasFlow ? (
            <Section icon={ArrowRight} title={tDetails("flow")}>
              <CustomerFlowSteps steps={rec.customerFlow ?? []} />
            </Section>
          ) : null}

          {hasRecs ? (
            <Section icon={ListOrdered} title={tDetails("recommendations")}>
              <PlanRecommendationsList items={rec.recommendations ?? []} />
            </Section>
          ) : null}

          {hasRisks ? (
            <Section icon={ShieldAlert} title={tDetails("risks")}>
              <RiskNotesList items={rec.riskNotes ?? []} />
            </Section>
          ) : null}

          {hasLifecycle ? (
            <Section icon={Clock} title={tDetails("lifecycle")}>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rec.attempts != null ? (
                  <MetaField
                    icon={ArrowDownUp}
                    label={tDetails("attempts")}
                    value={format.number(rec.attempts)}
                  />
                ) : null}
                <MetaField
                  icon={Clock}
                  label={tDetails("startedAt")}
                  value={
                    rec.startedAt
                      ? format.dateTime(rec.startedAt, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : tDetails("notRecorded")
                  }
                />
                <MetaField
                  icon={Clock}
                  label={tDetails("completedAt")}
                  value={
                    rec.completedAt
                      ? format.dateTime(rec.completedAt, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : tDetails("notRecorded")
                  }
                />
                {rec.parentJobId ? (
                  <MetaField
                    icon={FileCode2}
                    label="Parent Job"
                    value={rec.parentJobId}
                  />
                ) : null}
              </dl>
            </Section>
          ) : null}

          {hasPayload ? (
            <Section icon={FileCode2} title={tDetails("rawRequest")}>
              <p className="text-xs text-muted-foreground">
                {tDetails("rawRequestHint")}
              </p>
              <CollapsibleCode
                label={tDetails("rawRequest")}
                defaultOpen={false}
              >
                {rec.payload}
              </CollapsibleCode>
            </Section>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper — provides consistent icon + title header + spacing.

function Section({
  icon: Icon,
  title,
  hint,
  visible = true,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  visible?: boolean;
  children: React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/30 p-4"
    >
      <header className="flex items-center gap-2">
        <Icon className="size-3.5 text-primary" aria-hidden />
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </header>
      <div className="flex flex-col gap-3">{children}</div>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Variant badge — same visual language as the card.

function VariantBadge({
  variant,
  label,
}: {
  variant: Variant;
  label: string;
}) {
  const Icon =
    variant === "completed"
      ? CheckCircle2
      : variant === "failed"
        ? TriangleAlert
        : variant === "running"
          ? Clock
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
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Meta field — labelled key/value row.

function MetaField({
  icon: Icon,
  label,
  value,
  emphasized = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" aria-hidden />
        {label}
      </p>
      <p
        className={cn(
          "wrap-break-word text-sm",
          emphasized
            ? "text-base font-semibold text-foreground"
            : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function CostRangeField({
  icon: Icon,
  label,
  min,
  max,
  format,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  min: number;
  max: number;
  format: ReturnType<typeof useFormatter>;
}) {
  return (
    <MetaField
      icon={Icon}
      label={label}
      value={`${formatVnd(min, format)} – ${formatVnd(max, format)}`}
      emphasized
    />
  );
}

function formatVnd(value: number, format: ReturnType<typeof useFormatter>) {
  const millions = value / 1_000_000;
  return `${format.number(millions, { maximumFractionDigits: 0 })} tr VND`;
}

// ---------------------------------------------------------------------------
// Image — large, with graceful fallback.

function ConceptImageLarge({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = React.useState(false);
  if (error) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="flex aspect-video w-full items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/30 text-xs text-muted-foreground"
      >
        <AlertTriangle className="size-4" aria-hidden />
        {alt}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setError(true)}
      className="aspect-video w-full rounded-md border border-border/60 bg-muted object-cover"
    />
  );
}

// ---------------------------------------------------------------------------
// Reference URL list.

function ReferenceUrls({
  urls,
  label,
  emptyLabel,
}: {
  urls: string[];
  label: string;
  emptyLabel: string;
}) {
  if (urls.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        <span className="text-[10px] font-semibold uppercase tracking-wide">
          {label}:
        </span>{" "}
        {emptyLabel}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <ul className="flex flex-col gap-1">
        {urls.map((url, idx) => (
          <li
            key={`${url}-${idx}`}
            className="flex items-start gap-2 rounded-md border border-border/60 bg-background/40 p-2 text-xs"
          >
            <ExternalLink
              className="mt-0.5 size-3 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="wrap-break-word text-foreground underline-offset-2 hover:underline"
            >
              {url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible code block — expand on click. Used for long prompt /
// payload strings.

function CollapsibleCode({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border/60 bg-background/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between gap-2 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <span>{label}</span>
        <span className="text-[10px]">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <pre className="max-h-72 overflow-auto border-t border-border/60 px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground/90 wrap-break-word">
          {children}
        </pre>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Zone grid visualisation — renders the layouts zones onto a W×H canvas
// using absolute positioning. Each zone gets a distinct colour from the
// palette and shows its label on hover.

const ZONE_PALETTE = [
  "bg-primary/15",
  "bg-amber-500/15",
  "bg-emerald-500/15",
  "bg-sky-500/15",
  "bg-rose-500/15",
  "bg-violet-500/15",
  "bg-orange-500/15",
];

function ZoneGridVisual({ zones }: { zones: LayoutZone[] }) {
  const width = zones.reduce((acc, z) => Math.max(acc, z.x + z.w), 1);
  const height = zones.reduce((acc, z) => Math.max(acc, z.y + z.h), 1);
  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-muted/30 p-2">
      <div
        className="relative w-full"
        style={{
          aspectRatio: `${width} / ${height}`,
        }}
      >
        {/* Cell grid for spatial context. */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`,
          }}
          aria-hidden
        >
          {Array.from({ length: width * height }).map((_, i) => (
            <div
              key={i}
              className="border border-border/30"
            />
          ))}
        </div>
        {zones.map((zone, idx) => {
          const palette = ZONE_PALETTE[idx % ZONE_PALETTE.length];
          return (
            <div
              key={zone.id}
              title={`${zone.label} — ${zone.purpose}`}
              className={cn(
                "absolute flex items-center justify-center rounded-sm border border-border/70 p-1 text-[9px] font-medium text-foreground/90 backdrop-blur-sm",
                palette,
              )}
              style={{
                left: `${(zone.x / width) * 100}%`,
                top: `${(zone.y / height) * 100}%`,
                width: `${(zone.w / width) * 100}%`,
                height: `${(zone.h / height) * 100}%`,
              }}
            >
              <span className="truncate text-center leading-tight">
                {zone.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ZoneListRow({ zone }: { zone: LayoutZone }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-background/40 p-2.5 text-xs">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{zone.label}</p>
        <p className="mt-0.5 wrap-break-word text-muted-foreground">
          {zone.purpose}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          {zone.id} · ({zone.x},{zone.y}) → {EMPTY_ZONE}{zone.w} × {EMPTY_ZONE}
          {zone.h}
        </p>
      </div>
      {zone.is_staff_only ? (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          Staff
        </Badge>
      ) : null}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Customer flow — horizontal numbered chips on lg+, vertical on small.

function CustomerFlowSteps({ steps }: { steps: CustomerFlowStep[] }) {
  return (
    <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
      {steps.map((step, idx) => (
        <li
          key={`${step.stage}-${idx}`}
          className="flex flex-1 items-start gap-2 rounded-md border border-border/60 bg-background/40 p-3 text-xs"
        >
          <span
            aria-hidden
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary"
          >
            {idx + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {step.stage}
            </p>
            <p className="mt-0.5 wrap-break-word text-foreground/90">
              {step.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Recommendations — priority-ranked.

function PlanRecommendationsList({ items }: { items: PlanRecommendation[] }) {
  const tDetails = useTranslations("ProjectsOverview.designBrief.ai.details");
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {tDetails("noRecommendations")}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, idx) => (
        <li
          key={`${item.title}-${idx}`}
          className="rounded-md border border-border/60 bg-background/40 p-3 text-xs"
        >
          <header className="flex items-start gap-2">
            <span
              aria-hidden
              className={cn(
                "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                priorityTone(item.priority),
              )}
            >
              P{item.priority}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{item.title}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {tDetails("recPriority", { priority: item.priority })}
              </p>
              {item.rationale ? (
                <p className="mt-1.5 wrap-break-word text-foreground/90">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {tDetails("recRationale")}:
                  </span>{" "}
                  {item.rationale}
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {tDetails("noRationale")}
                </p>
              )}
            </div>
          </header>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Risk notes — level-toned.

function RiskNotesList({ items }: { items: RiskNote[] }) {
  const tDetails = useTranslations("ProjectsOverview.designBrief.ai.details");
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{tDetails("noRisks")}</p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((risk, idx) => (
        <li
          key={`${risk.title}-${idx}`}
          className={cn(
            "rounded-md border p-3 text-xs",
            riskLevelTone(risk.level),
          )}
        >
          <header className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {risk.title} ·{" "}
                <span className="font-mono uppercase">{risk.level}</span>
              </p>
              <p className="mt-0.5 wrap-break-word">{risk.description}</p>
              {risk.mitigation ? (
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  Mitigation: {risk.mitigation}
                </p>
              ) : null}
            </div>
          </header>
        </li>
      ))}
    </ul>
  );
}

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