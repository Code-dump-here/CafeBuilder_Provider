"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import { AiRecommendationCard } from "./ai-recommendation-card";
import { AiRecommendationDetailDialog } from "./ai-recommendation-detail-dialog";
import type { AiRecommendation } from "@/features/projects/design-brief-types";

interface AiRecommendationsListProps {
  recommendations: AiRecommendation[];
}

/**
 * Right-column "AI Design Iterations" list for the brief page.
 *
 * Each iteration is rendered as its own card with state-aware contents
 * (queued/failed/completed). The wrapper itself stays small so it can
 * scroll independently when the history grows long — matches the
 * behaviour of the sidebar's collapsible items on the overview page.
 *
 * The list also owns the single detail-dialog instance so clicking any
 * card opens one modal rather than spawning multiple stacked overlays.
 */
export function AiRecommendationsList({
  recommendations,
}: AiRecommendationsListProps) {
  const t = useTranslations("ProjectsOverview.designBrief.ai");

  const [activeRec, setActiveRec] = React.useState<AiRecommendation | null>(
    null,
  );

  const handleOpen = React.useCallback((rec: AiRecommendation) => {
    setActiveRec(rec);
  }, []);

  const handleOpenChange = React.useCallback((next: boolean) => {
    if (!next) setActiveRec(null);
  }, []);

  return (
    <>
      <Card
        size="sm"
        aria-labelledby="ai-iterations-title"
        aria-describedby="ai-iterations-subtitle"
        className="border-border/60"
      >
        <CardHeader>
          <CardTitle
            id="ai-iterations-title"
            className="flex items-center gap-2 text-base"
          >
            <Sparkles className="size-4 text-primary" aria-hidden />
            {t("title")}
          </CardTitle>
          <CardDescription id="ai-iterations-subtitle">
            {t("subtitle", { count: recommendations.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recommendations.length === 0 ? (
            <p className="px-3 pb-3 text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <ol className="flex flex-col gap-3 px-3 pb-3">
                {recommendations.map((rec, idx) => (
                  <li key={rec.id} aria-posinset={idx + 1}>
                    <AiRecommendationCard
                      recommendation={rec}
                      onOpenDetails={handleOpen}
                    />
                  </li>
                ))}
              </ol>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AiRecommendationDetailDialog
        recommendation={activeRec}
        open={activeRec != null}
        onOpenChange={handleOpenChange}
      />
    </>
  );
}