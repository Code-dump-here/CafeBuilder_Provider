"use client";

import { MapPin } from "lucide-react";

import { env } from "@/lib/env";
import { tileGrid } from "@/lib/maps";
import { cn } from "@/lib/utils";

interface TileMapProps {
  latitude: number;
  longitude: number;
  /** Rendered box in CSS pixels. The tile grid is laid out against these exactly. */
  width: number;
  height: number;
  /** 16 shows a city block. 15 for a neighbourhood, 17 for a building. */
  zoom?: number;
  className?: string;
}

/**
 * A flat map centred on one point, composed from raster tiles.
 *
 * MapTiler's **Static Maps API is a paid feature** — it answers 403 with
 * `X-MAPTILER-FREE: 1` on this account — while raster tiles are free. So
 * instead of one ready-made image, this positions the handful of tiles that
 * cover the box so the coordinate lands dead centre.
 *
 * Plain `<img>` tags rather than MapLibre GL: this is read-only, so a WebGL
 * canvas and ~200KB of map library would buy nothing over a few images the
 * browser caches. It also renders without JavaScript.
 *
 * `overflow-hidden` on the wrapper matters — tiles deliberately overhang the
 * box edges, because a grid that lands exactly on the boundary is only
 * possible when the point sits exactly on a tile corner.
 */
export function TileMap({
  latitude,
  longitude,
  width,
  height,
  zoom = 16,
  className,
}: TileMapProps) {
  if (!env.mapsEnabled) return null;

  const tiles = tileGrid({ latitude, longitude, zoom, width, height });

  return (
    <div
      className={cn("relative overflow-hidden bg-muted", className)}
      style={{ width, height }}
      role="img"
      aria-label={`Map centred on ${latitude}, ${longitude}`}
    >
      {tiles.map((tile) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={tile.url}
          src={tile.url}
          alt=""
          aria-hidden
          loading="lazy"
          draggable={false}
          className="absolute max-w-none select-none"
          style={{ left: tile.left, top: tile.top, width: 512, height: 512 }}
        />
      ))}

      {/* Nudged up so the pin's point, not its middle, sits on the coordinate. */}
      <MapPin
        className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-full fill-red-500 text-red-700 drop-shadow"
        aria-hidden
      />

      {/* Attribution is a licence condition of the OpenStreetMap data, not decoration. */}
      <span className="absolute bottom-0 right-0 bg-white/75 px-1 text-[8px] leading-tight text-black">
        © MapTiler © OpenStreetMap
      </span>
    </div>
  );
}
