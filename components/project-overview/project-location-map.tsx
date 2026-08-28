"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/env";
import { directionsUrl } from "@/lib/maps";
import { TileMap } from "@/components/ui/tile-map";
import { interactiveRow } from "@/lib/interactive";
import { cn } from "@/lib/utils";

interface ProjectLocationMapProps {
  address: string;
  latitude: number | null;
  longitude: number | null;
  className?: string;
}

/**
 * The project's site on a map.
 *
 * Renders the **Static Maps API** rather than loading the interactive Maps
 * JavaScript SDK. On a read-only card nobody pans or zooms, so the SDK would
 * buy nothing for the cost of a map session, a ~200KB script and a second
 * render pass — a static image is one cached request that also works with
 * JavaScript disabled.
 *
 * Returns null unless there is both a key and a pin. A provider reading a
 * project created before the map picker existed sees the address line in
 * `QuickFactsCard` exactly as before, with no empty frame where a map isn't.
 */
export function ProjectLocationMap({
  address,
  latitude,
  longitude,
  className,
}: ProjectLocationMapProps) {
  const t = useTranslations("ProjectsOverview.locationMap");

  if (!env.mapsEnabled || latitude == null || longitude == null) return null;

  const mapsHref = directionsUrl(latitude, longitude);

  return (
    <Card size="sm" className={cn("border-border/60", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="size-4 text-primary" aria-hidden />
          {t("title")}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            interactiveRow,
            "group relative block overflow-hidden rounded-lg border border-border/60",
          )}
          aria-label={t("openAria", { address })}
        >
          {/* Fixed pixel box: the tile grid is positioned against these exact
              numbers, and a fluid width would slide the centre pin off the
              coordinate. `max-w-full` keeps it from overflowing a narrow rail. */}
          <TileMap
            latitude={latitude}
            longitude={longitude}
            width={560}
            height={260}
            className="max-w-full"
          />
          <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-[10px] font-medium text-foreground shadow-sm">
            <ExternalLink className="size-3" aria-hidden />
            {t("openInMaps")}
          </span>
        </a>

        <p className="text-xs leading-relaxed text-muted-foreground">{address}</p>
      </CardContent>
    </Card>
  );
}
