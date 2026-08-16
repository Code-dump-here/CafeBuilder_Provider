"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, Loader2, Sparkles, TriangleAlert } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ConceptImage } from "@/components/design-brief/concept-image";
import type { EngagementAiSummary } from "@/features/projects/engagement-types";

interface AiRecommendationsSummaryListProps {
  recommendations: EngagementAiSummary[];
}

const KNOWN_STATES = ["queued", "running", "completed", "failed"] as const;
type KnownState = (typeof KNOWN_STATES)[number];

function isKnownState(state: string): state is KnownState {
  return (KNOWN_STATES as readonly string[]).includes(state);
}

/**
 * Read-only "AI Design Iterations" summary for providers.
 *
 * Providers can't call `GET /api/ai-recommendations` (owner+admin only —
 * see BE_CHANGES_FOR_FE.md §1.5), so this reads what
 * `GET /api/project-workings/{id}/overview` returns, scoped to the
 * viewer's own engagement.
 *
 * That overview embeds whole recommendation objects, so the generated
 * concept image arrives with them and is shown here — the provider is the
 * one building to it, so withholding the picture helped nobody. The rest
 * of the owner's card (cost bands, zone layout, risk notes) stays out:
 * this is a read-only digest, not the full `AiRecommendationsList`.
 */
export function AiRecommendationsSummaryList({
  recommendations,
}: AiRecommendationsSummaryListProps) {
  const t = useTranslations("ProjectsOverview.designBrief.ai");

  if (recommendations.length === 0) return null;

  return (
    <Card
      size="sm"
      aria-labelledby="ai-iterations-summary-title"
      className="border-border/60"
    >
      <CardHeader>
        <CardTitle
          id="ai-iterations-summary-title"
          className="flex items-center gap-2 text-base"
        >
          <Sparkles className="size-4 text-primary" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("subtitle", { count: recommendations.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[60vh]">
          <ol className="flex flex-col gap-3 px-3 pb-3">
            {recommendations.map((rec, idx) => (
              <li key={rec.id} aria-posinset={idx + 1}>
                <SummaryRow rec={rec} />
              </li>
            ))}
          </ol>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ rec }: { rec: EngagementAiSummary }) {
  const t = useTranslations("ProjectsOverview.designBrief.ai");
  const stateKey = isKnownState(rec.state) ? rec.state : null;

  return (
    <article
      aria-labelledby={`ai-rec-summary-${rec.id}-title`}
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-background/40 p-3",
        "border-border/60",
        stateKey === "failed" && "border-destructive/40 bg-destructive/5",
        stateKey === "queued" && "border-dashed",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          id={`ai-rec-summary-${rec.id}-title`}
          className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground"
        >
          <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
          <span className="truncate">{rec.conceptSummary}</span>
        </h3>
        {stateKey ? (
          <SummaryStateBadge stateKey={stateKey} label={t(`states.${stateKey}`)} />
        ) : null}
      </div>
      {rec.imageArtifactUrl ? (
        <ConceptImage
          src={rec.imageArtifactUrl}
          prompt={rec.imagePrompt ?? null}
          promptLabel={t("imagePromptLabel")}
          imageLabel={t("image")}
        />
      ) : null}
      <p className="font-mono text-[11px] text-muted-foreground">#{rec.id}</p>
    </article>
  );
}

function SummaryStateBadge({
  stateKey,
  label,
}: {
  stateKey: KnownState;
  label: string;
}) {
  const Icon =
    stateKey === "completed"
      ? CheckCircle2
      : stateKey === "failed"
        ? TriangleAlert
        : stateKey === "running"
          ? Loader2
          : Clock;

  return (
    <Badge
      variant={
        stateKey === "completed"
          ? "default"
          : stateKey === "failed"
            ? "destructive"
            : "secondary"
      }
      className={cn(
        "shrink-0 gap-1 text-[10px] font-semibold uppercase tracking-wide",
        stateKey === "running" && "animate-pulse",
      )}
    >
      <Icon
        className={cn("size-3", stateKey === "running" && "animate-spin")}
        aria-hidden
      />
      {label}
    </Badge>
  );
}
