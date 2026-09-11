/**
 * The colour a person gets when they have no avatar.
 *
 * A *categorical* palette — eight hues chosen to be distinguishable from one
 * another, not to mean anything. Deliberately not the status tokens
 * (`--success` and friends): a provider is not "a warning" because they
 * happened to hash to amber.
 *
 * It lives here because it was previously declared twice — once in
 * `project-owner-card`, once in `project-members-card` — with the same eight
 * values in a different order. Indices 1 and 2 were transposed, so the same
 * hash produced a different colour in the two components, quietly breaking the
 * thing owner-card's own comment said it wanted: that "the owner and the
 * providers feel like they live in the same visual world".
 *
 * Values are hex rather than theme tokens because they must stay put across a
 * restyle. If identity colours moved with the theme, someone people recognise
 * by their green chip would come back as a different person's colour.
 *
 * Pair it with `paletteIndexFor` / `paletteIndexForAll` from `@/lib/id-hash`,
 * which already handle turning uuids into a stable index.
 */
export const AVATAR_PALETTE = [
  "#A07B5A",
  "#5A8F7B",
  "#3B5BA9",
  "#8E5A3B",
  "#7B5A9B",
  "#5A7B8F",
  "#A95A8E",
  "#9B8B5A",
] as const;
