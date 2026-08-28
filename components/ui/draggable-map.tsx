"use client";

import * as React from "react";
import { MapPin, Minus, Plus } from "lucide-react";

import { env } from "@/lib/env";
import { TILE_SIZE, latLngFromWorldPixel, tileGrid, worldPixel } from "@/lib/maps";
import { cn } from "@/lib/utils";

interface DraggableMapProps {
  latitude: number;
  longitude: number;
  /** Fires continuously while dragging. The caller debounces before geocoding. */
  onChange: (latitude: number, longitude: number) => void;
  width: number;
  height: number;
  className?: string;
  labels: {
    hint: string;
    zoomIn: string;
    zoomOut: string;
  };
}

const MIN_ZOOM = 3;
const MAX_ZOOM = 19;

/**
 * A draggable map for placing a pin by hand, for when search can't find the
 * address — a new build on an unnamed lane, a site OpenStreetMap hasn't mapped
 * yet. The provider knows where their workshop is even when the geocoder
 * doesn't.
 *
 * **The pin never moves; the map moves under it.** The coordinate is whatever
 * sits at the centre of the box. Besides matching what people already know
 * from ride-hailing apps, it removes hit-testing entirely — there is no drag
 * target to grab, just a translation.
 *
 * Zoom steps between integer levels rather than scaling smoothly: tiles are
 * raster images at fixed zooms, so a fractional level would mean stretching
 * them and accepting a blurry map.
 */
export function DraggableMap({
  latitude,
  longitude,
  onChange,
  width,
  height,
  className,
  labels,
}: DraggableMapProps) {
  const [zoom, setZoom] = React.useState(17);
  const [isDragging, setIsDragging] = React.useState(false);
  const lastPointRef = React.useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Capture so the drag keeps working when the cursor leaves the box —
    // without it the map sticks the moment you overshoot the edge.
    event.currentTarget.setPointerCapture(event.pointerId);
    lastPointRef.current = { x: event.clientX, y: event.clientY };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const last = lastPointRef.current;
    if (!last) return;

    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    if (dx === 0 && dy === 0) return;
    lastPointRef.current = { x: event.clientX, y: event.clientY };

    // Dragging the map right moves the viewport left, so the delta is
    // subtracted from the centre's world position.
    const centre = worldPixel(latitude, longitude, zoom);
    const moved = latLngFromWorldPixel(centre.x - dx, centre.y - dy, zoom);
    onChange(moved.latitude, moved.longitude);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    lastPointRef.current = null;
    setIsDragging(false);
  };

  // Zoom keeps the centre fixed, so the coordinate is unchanged — only the
  // tiles differ, and the caller needs no notification.
  const stepZoom = (by: number) =>
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + by)));

  if (!env.mapsEnabled) return null;

  const tiles = tileGrid({ latitude, longitude, zoom, width, height });

  return (
    <div
      className={cn(
        "relative touch-none select-none overflow-hidden rounded-md border border-border/60 bg-muted",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
      style={{ width, height }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="application"
      aria-label={labels.hint}
    >
      {tiles.map((tile) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={tile.url}
          src={tile.url}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute max-w-none select-none"
          style={{ left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE }}
        />
      ))}

      {/* Lifted while dragging, with its shadow left on the ground below. That
          gap is what makes the pin read as hovering over a moving map rather
          than being dragged across it. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2">
        <MapPin
          className={cn(
            "size-8 fill-red-500 text-red-700 drop-shadow transition-transform",
            isDragging ? "-translate-y-[calc(100%+6px)]" : "-translate-y-full",
          )}
          aria-hidden
        />
        <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40" />
      </div>

      <div className="absolute right-2 top-2 flex flex-col gap-1.5">
        <ZoomButton
          label={labels.zoomIn}
          disabled={zoom >= MAX_ZOOM}
          onClick={() => stepZoom(1)}
        >
          <Plus className="size-3.5" aria-hidden />
        </ZoomButton>
        <ZoomButton
          label={labels.zoomOut}
          disabled={zoom <= MIN_ZOOM}
          onClick={() => stepZoom(-1)}
        >
          <Minus className="size-3.5" aria-hidden />
        </ZoomButton>
      </div>

      {/* Says what the gesture does. A map that looks like a picture gets
          treated like one, and nobody discovers it moves. */}
      <span
        className={cn(
          "pointer-events-none absolute left-2 top-2 rounded bg-background/90 px-2 py-1 text-[10px] text-muted-foreground transition-opacity",
          isDragging ? "opacity-0" : "opacity-100",
        )}
      >
        {labels.hint}
      </span>

      {/* Attribution is a licence condition of the OpenStreetMap data. */}
      <span className="pointer-events-none absolute bottom-0 right-0 bg-white/75 px-1 text-[8px] leading-tight text-black">
        © MapTiler © OpenStreetMap
      </span>
    </div>
  );
}

function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      // Stops the press from being read as the start of a drag, which would
      // otherwise nudge the map every time someone zooms.
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
      className="grid size-7 place-items-center rounded bg-background shadow-sm transition-colors hover:bg-accent disabled:opacity-40"
    >
      {children}
    </button>
  );
}
