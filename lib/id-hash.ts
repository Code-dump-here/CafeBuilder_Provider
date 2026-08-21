/**
 * Deterministic index from an id, for picking a stable avatar colour.
 *
 * These used to be arithmetic on numeric ids (`id * 11 + 3`). Ids are uuids
 * now, so there is no number to multiply — but the requirement is unchanged:
 * the same entity must get the same colour on every render and every reload,
 * and different entities should spread across the palette rather than
 * clumping.
 *
 * FNV-1a is used because it is short, has no dependencies, and mixes the
 * low-entropy parts of a uuid well. Taking `id.length` or a char code instead
 * would put most uuids in the same bucket, since they share a fixed length and
 * a limited alphabet.
 */
export function hashId(id: string | null | undefined): number {
  if (!id) return 0;

  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    // 32-bit FNV prime multiply, kept in range with Math.imul.
    hash = Math.imul(hash, 0x01000193);
  }
  // `>>> 0` makes it unsigned so callers never index with a negative number.
  return hash >>> 0;
}

/** Stable index into a palette (or any fixed-length array) for an id. */
export function paletteIndexFor(
  id: string | null | undefined,
  length: number,
): number {
  if (length <= 0) return 0;
  return hashId(id) % length;
}

/** Same, but blends several ids so a pair (e.g. engagement + provider) is stable. */
export function paletteIndexForAll(
  ids: Array<string | null | undefined>,
  length: number,
): number {
  if (length <= 0) return 0;
  return hashId(ids.filter(Boolean).join("|")) % length;
}
