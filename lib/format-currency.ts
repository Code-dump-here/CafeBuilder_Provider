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
 *
 * A second round found five more places that had never routed through here.
 * The worst was the admin project list, which wrote `${value.toLocaleString()}`
 * inside JSX — the `$` is literal text there, so a 1.5 billion dong budget was
 * displayed to admins as `$1,500,000,000`, in the wrong currency entirely.
 * The others hardcoded `vi-VN` regardless of the reader's locale, or rebuilt
 * `Intl.NumberFormat` inline on every render.
 *
 * The rule this file exists to enforce: if an amount reaches a screen, it came
 * from here, and it knows what locale it is being read in.
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
  return {
    full: formatVnd(amount, locale),
    compact: formatVndCompact(amount, locale),
  };
}

/**
 * The full amount: `1,500,000 VND` in English, `1.500.000 VND` in Vietnamese.
 *
 * Use this wherever the exact figure matters. It is the default — reach for
 * [formatVndCompact] only when the space genuinely cannot hold the number.
 *
 * `unit` exists for two callers: the admin revenue card, whose currency
 * arrives from the server rather than being VND by construction, and the
 * marketplace tile, which passes `""` because the full amount sits directly
 * beneath the compact one and would repeat the suffix. Everything else should
 * leave it alone.
 */
export function formatVnd(
  amount: number,
  locale: string,
  unit = "VND",
): string {
  const isVi = locale.startsWith("vi");
  const digits = (isVi ? NF_VND_FULL_VI : NF_VND_FULL_EN).format(amount);
  return unit ? `${digits} ${unit}` : digits;
}

/**
 * The abbreviated amount, for axis labels and narrow tiles: `1.5B VND`.
 *
 * Never use it where the figure is being approved or paid — an abbreviated
 * number is not one anybody can check against a bank transfer.
 */
export function formatVndCompact(
  amount: number,
  locale: string,
  unit = "VND",
): string {
  const isVi = locale.startsWith("vi");
  const digits = (isVi ? NF_VND_COMPACT_VI : NF_VND_COMPACT_EN).format(amount);
  return unit ? `${digits} ${unit}` : digits;
}
