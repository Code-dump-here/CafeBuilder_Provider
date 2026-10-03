/**
 * Shares the editor fills in by itself are round tens — 10, 20, 30… — never a
 * split like 33.3 / 66.7 (chốt 03/10/2026). That covers the templates and the
 * percentage prefilled when an instalment is tied to a design part. What the
 * provider types is left alone: an odd share entered on purpose is accepted,
 * here and on the server.
 */
export const ROUND_PERCENT_STEP = 10;

/**
 * A share of the total snapped to the nearest round step, for prefilling an
 * instalment from a part's price. Never below one step: a part priced at 3%
 * of the total still gets an instalment the provider can then adjust.
 */
export function roundPercentOf(amount: number, total: number): number {
  if (total <= 0) return ROUND_PERCENT_STEP;
  const snapped =
    Math.round(((amount / total) * 100) / ROUND_PERCENT_STEP) * ROUND_PERCENT_STEP;
  return Math.min(100, Math.max(ROUND_PERCENT_STEP, snapped));
}
