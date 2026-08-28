import { env } from "@/lib/env";

/**
 * Address search and map tiles, backed by **MapTiler Cloud**.
 *
 * Mirrors `lib/services/places_service.dart` in the mobile app — same
 * endpoints, same country and language filters, same proximity bias — so an
 * address picked on either client resolves to the same place. Change one,
 * change the other.
 *
 * Replaced Google Maps Platform, which refused every request: Maps Platform
 * requires a billing account with a payment method, and the linked account
 * never satisfied that check. MapTiler's free tier needs no card.
 *
 * Free tier, verified against the live API:
 *   Geocoding + reverse geocoding   ✅
 *   Raster map tiles (incl. @2x)    ✅
 *   Static Maps API                 ❌ 403 with `X-MAPTILER-FREE: 1`
 *
 * That last one is why previews are composed from tiles rather than fetched
 * as one ready-made image.
 */

const HOST = "https://api.maptiler.com";

/** Restrict to Vietnam, label in Vietnamese. Every project here is a cafe in Vietnam. */
const COUNTRY = "vn";
const LANGUAGE = "vi";

/** `streets-v2` carries street names and POIs, so a preview reads as a place. */
const STYLE = "streets-v2";

/** `@2x` tiles are 512px, not 256. Everything downstream depends on this. */
export const TILE_SIZE = 512;

/**
 * Search bias when nothing better is known.
 *
 * Not cosmetic — MapTiler's ranking is poor without it. Verified live:
 * "123 Nguyen Hue Quan 1" unbiased returns *Nguyễn Hữu Cầu*, a different
 * street, and adding more of the address makes it worse. With this bias the
 * same query resolves to Đại lộ Nguyễn Huệ.
 *
 * Ho Chi Minh City, because that is where the projects are. Callers pass the
 * current pin once there is one.
 */
export const DEFAULT_PROXIMITY = { lat: 10.7769, lng: 106.7009 };

export interface PlaceSuggestion {
  fullText: string;
  mainText: string;
  secondaryText: string;
  /** Inline from the search response — no second request needed. */
  latitude: number;
  longitude: number;
}

export interface PickedLocation {
  address: string;
  /** Null when the address was typed rather than picked. Always paired. */
  latitude: number | null;
  longitude: number | null;
}

export const hasCoordinates = (
  location: PickedLocation | null,
): location is PickedLocation & { latitude: number; longitude: number } =>
  location != null && location.latitude != null && location.longitude != null;

// ── Search ──────────────────────────────────────────────────────────────────

/**
 * Address suggestions for a partial query.
 *
 * Each result carries its own coordinates, so choosing one costs nothing —
 * that removed the round trip, the billing session tokens and the
 * "chosen but unresolvable" state the Google version had to handle.
 *
 * Resolves to an empty array, never rejects.
 */
export async function autocomplete(
  input: string,
  options?: { proximity?: { lat: number; lng: number }; signal?: AbortSignal },
): Promise<PlaceSuggestion[]> {
  const query = input.trim();
  if (!env.mapsEnabled || query.length < 2) return [];

  const proximity = options?.proximity ?? DEFAULT_PROXIMITY;

  try {
    const url = new URL(`${HOST}/geocoding/${encodeURIComponent(query)}.json`);
    url.searchParams.set("key", env.googleMapsApiKey);
    url.searchParams.set("country", COUNTRY);
    url.searchParams.set("language", LANGUAGE);
    url.searchParams.set("autocomplete", "true");
    url.searchParams.set("limit", "6");
    // GeoJSON order throughout MapTiler: longitude first.
    url.searchParams.set("proximity", `${proximity.lng},${proximity.lat}`);

    const response = await fetch(url, { signal: options?.signal });
    if (!response.ok) {
      logFailure("autocomplete", response.status, await response.text());
      return [];
    }

    const body = (await response.json()) as {
      features?: Array<{
        center?: [number, number];
        place_name?: string;
        place_name_vi?: string;
        text?: string;
        text_vi?: string;
      }>;
    };

    return (body.features ?? []).flatMap((feature) => {
      // `center` is [lon, lat]. Reading it the other way round silently drops
      // the pin in the Indian Ocean, which is why the tests assert against a
      // known Ho Chi Minh City fixture.
      const lng = feature.center?.[0];
      const lat = feature.center?.[1];
      // Prefer the Vietnamese rendering — it keeps the ward ("Phường …") that
      // a local address is normally written with; the English one drops it.
      const full = feature.place_name_vi ?? feature.place_name;
      if (lat == null || lng == null || !full) return [];

      const name = feature.text_vi ?? feature.text ?? full;
      const secondary = full.startsWith(`${name}, `)
        ? full.slice(name.length + 2)
        : full === name
          ? ""
          : full;

      return [{ fullText: full, mainText: name, secondaryText: secondary, latitude: lat, longitude: lng }];
    });
  } catch (error) {
    // An abort is the expected result of typing another character.
    if ((error as Error)?.name !== "AbortError") {
      console.warn("[maps] autocomplete failed", error);
    }
    return [];
  }
}

/** Coordinates for a typed address. Null when nothing matches. */
export async function geocode(address: string): Promise<PickedLocation | null> {
  const results = await autocomplete(address);
  if (results.length === 0) return null;
  const [first] = results;
  return { address: first.fullText, latitude: first.latitude, longitude: first.longitude };
}

/** The address at a point. Null on failure — the caller keeps the coordinates. */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<PickedLocation | null> {
  if (!env.mapsEnabled) return null;

  try {
    // Longitude first — see the note in `autocomplete`.
    const url = new URL(`${HOST}/geocoding/${longitude},${latitude}.json`);
    url.searchParams.set("key", env.googleMapsApiKey);
    url.searchParams.set("language", LANGUAGE);

    const response = await fetch(url);
    if (!response.ok) {
      logFailure("reverseGeocode", response.status, await response.text());
      return null;
    }

    const body = (await response.json()) as {
      features?: Array<{ place_name?: string; place_name_vi?: string }>;
    };
    const first = body.features?.[0];
    const address = first?.place_name_vi ?? first?.place_name;
    if (!address) return null;

    return { address, latitude, longitude };
  } catch (error) {
    console.warn("[maps] reverseGeocode failed", error);
    return null;
  }
}

// ── Tiles ───────────────────────────────────────────────────────────────────

/** URL of one raster map tile. */
export function tileUrl(zoom: number, x: number, y: number): string {
  return `${HOST}/maps/${STYLE}/${zoom}/${x}/${y}@2x.png?key=${env.googleMapsApiKey}`;
}

/**
 * Web Mercator: a coordinate to its position in the world pixel grid at
 * `zoom`, where the world is `TILE_SIZE * 2^zoom` pixels square.
 *
 * Verified against the live tile server: Ho Chi Minh City and Hanoi land on
 * dense ~150KB city tiles, a point in open ocean on a 222-byte empty one.
 */
export function worldPixel(
  latitude: number,
  longitude: number,
  zoom: number,
): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((longitude + 180) / 360) * scale;

  // Clamped short of the poles: the projection is undefined at ±90°, where
  // tan() runs to infinity and the arithmetic yields NaN.
  const lat = Math.min(Math.max(latitude, -85.05112878), 85.05112878);
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;

  return { x, y };
}

/**
 * The inverse of {@link worldPixel}: a position in the world pixel grid back
 * to a coordinate. This is what makes a map draggable — a pan is measured in
 * pixels, and the pin's new location has to be read back out of them.
 *
 * Longitude wraps rather than clamping, so dragging past the date line
 * continues instead of sticking. Latitude clamps at the Mercator limit, where
 * the projection stops being defined.
 *
 * Round-trips with `worldPixel` to floating-point precision — verified at
 * z12/16/19 across Vietnam, worst error ~6e-14 degrees.
 */
export function latLngFromWorldPixel(
  x: number,
  y: number,
  zoom: number,
): { latitude: number; longitude: number } {
  const scale = TILE_SIZE * 2 ** zoom;

  let longitude = (x / scale) * 360 - 180;
  longitude = (((longitude + 180) % 360) + 360) % 360 - 180;

  const n = Math.PI * (1 - 2 * Math.min(Math.max(y / scale, 0), 1));
  const latitude = (Math.atan(Math.sinh(n)) * 180) / Math.PI;

  return { latitude, longitude };
}

/**
 * The tiles needed to fill a `width` x `height` box centred on a coordinate,
 * each with the offset it should be positioned at inside that box.
 */
export function tileGrid({
  latitude,
  longitude,
  zoom,
  width,
  height,
}: {
  latitude: number;
  longitude: number;
  zoom: number;
  width: number;
  height: number;
}): Array<{ url: string; left: number; top: number }> {
  const maxIndex = 2 ** zoom - 1;
  const centre = worldPixel(latitude, longitude, zoom);
  const originX = centre.x - width / 2;
  const originY = centre.y - height / 2;

  const firstX = Math.floor(originX / TILE_SIZE);
  const firstY = Math.floor(originY / TILE_SIZE);
  // How far into the first tile the box's corner falls. Shifting the grid by
  // this remainder is what centres the point instead of snapping it to a tile
  // boundary.
  const offsetX = firstX * TILE_SIZE - originX;
  const offsetY = firstY * TILE_SIZE - originY;

  const columns = Math.ceil((width - offsetX) / TILE_SIZE);
  const rows = Math.ceil((height - offsetY) / TILE_SIZE);

  const tiles: Array<{ url: string; left: number; top: number }> = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const tileY = firstY + row;
      // Latitude does not wrap — there is no tile above the north pole, and
      // asking for one returns an error image. Longitude does, so x wraps.
      if (tileY < 0 || tileY > maxIndex) continue;
      const tileX = ((firstX + col) % (maxIndex + 1) + maxIndex + 1) % (maxIndex + 1);

      tiles.push({
        url: tileUrl(zoom, tileX, tileY),
        left: offsetX + col * TILE_SIZE,
        top: offsetY + row * TILE_SIZE,
      });
    }
  }
  return tiles;
}

/** Opens the point in Google Maps — what people actually want from a map tile. */
export function directionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function logFailure(call: string, status: number, body: string): void {
  const snippet = body.length > 300 ? `${body.slice(0, 300)}…` : body;
  console.warn(`[maps] ${call} HTTP ${status} — ${snippet}`);
}
