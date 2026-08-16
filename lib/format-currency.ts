import type { useFormatter } from "next-intl";

/**
 * Money formatting for VND, in one place.
 *
 * There were three `formatVnd` functions across the app with two different
 * output shapes, so the same budget could render as "150 tr VND" on one card
 * and "₫150,000,000" on another. They're gathered here so the difference is
 * visible in a single file instead of hidden across three.
 *
 * The product call has now been made: amounts read as a plain number followed
 * by "VND", matching the mobile app. `Intl`'s `style: "currency"` renders the
 * ₫ symbol instead, so the full form builds the string itself rather than
 * letting the formatter pick a symbol.
 */

// ─── Millions form: "150 tr VND" ─────────────────────────────────────────────

/**
 * Compact millions, used on the AI recommendation card and its detail dialog.
 * `tr` is the Vietnamese short form of *triệu* (million).
 */
export function formatVndMillions(
  value: number,
  format: ReturnType<typeof useFormatter>,
): string {
  const millions = value / 1_000_000;
  return `${format.number(millions, { maximumFractionDigits: 0 })} tr VND`;
}

// ─── Locale-aware full / compact form ────────────────────────────────────────

const NF_VND_FULL_VI = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});
const NF_VND_COMPACT_VI = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const NF_VND_FULL_EN = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});
const NF_VND_COMPACT_EN = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Both a full and a compact rendering, used by the my-projects card (compact
 * on the tile, full in the tooltip). Formatter instances are module-level so
 * they're constructed once rather than per render.
 */
export function formatVndParts(
  amount: number,
  locale: string,
): { full: string; compact: string } {
  const isVi = locale.startsWith("vi");
  return {
    full: `${(isVi ? NF_VND_FULL_VI : NF_VND_FULL_EN).format(amount)} VND`,
    compact: `${(isVi ? NF_VND_COMPACT_VI : NF_VND_COMPACT_EN).format(amount)} VND`,
  };
}
