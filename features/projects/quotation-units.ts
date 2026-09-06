import type { QuotationVariant } from "./quotation-variant";

/**
 * Units of measure a quotation line can be priced in.
 *
 * Free text before this: the server keeps `QuotationItem.Unit` as a nullable
 * string and validates nothing, so "m2", "M2", "mét vuông" and "m²" all
 * reached the owner's comparison screen as different units and could not be
 * read against each other. The list is fixed here, on the only screen that
 * writes the field.
 *
 * Tokens follow `MATERIAL_UNITS` in `material-types.ts` deliberately — the
 * same vocabulary is already used for the material price list, and a line
 * priced "per m2" in a quotation should read as the same unit when the same
 * work is later drawn from materials. Labels are localised; the token is what
 * is stored and what the owner app prints.
 */
export type QuotationUnit =
  // Measured work
  | "m2"
  | "m3"
  | "md"
  | "kg"
  | "tonne"
  | "litre"
  // Counted work
  | "item"
  | "set"
  | "sheet"
  | "roll"
  | "bag"
  | "room"
  | "zone"
  | "system"
  // Effort and whole-scope work
  | "manday"
  | "package"
  // Design deliverables
  | "option"
  | "drawing";

/**
 * A construction line is nearly always measured or counted: area, volume,
 * length, weight, or a number of things installed. `package` stays available
 * for a genuinely lump-sum item ("site setup"), and `manday` for labour sold
 * by the day.
 */
export const CONSTRUCTION_QUOTATION_UNITS: readonly QuotationUnit[] = [
  "m2",
  "m3",
  "md",
  "item",
  "set",
  "sheet",
  "roll",
  "bag",
  "kg",
  "tonne",
  "litre",
  "room",
  "zone",
  "system",
  "manday",
  "package",
] as const;

/**
 * Design sells deliverables, not measured work, so the list leads with what a
 * studio actually bills: a package (concept, technical drawings), a design
 * option, a drawing, an area designed, a room or zone. The measured units are
 * left out — a design line priced per kg is a mistake, not a use case.
 */
export const DESIGN_QUOTATION_UNITS: readonly QuotationUnit[] = [
  "package",
  "option",
  "drawing",
  "m2",
  "room",
  "zone",
  "set",
  "manday",
] as const;

export function quotationUnitsFor(
  variant: QuotationVariant,
): readonly QuotationUnit[] {
  return variant === "design"
    ? DESIGN_QUOTATION_UNITS
    : CONSTRUCTION_QUOTATION_UNITS;
}

/**
 * The options to show for a row, including whatever the row already holds.
 *
 * Quotations written before this list existed carry arbitrary strings, and a
 * `Select` that cannot represent its own value would silently blank the unit
 * of every legacy line the provider re-saves. An unknown value is kept as its
 * own option instead, so editing one line never rewrites another.
 */
export function quotationUnitOptions(
  variant: QuotationVariant,
  current: string,
): readonly string[] {
  const units = quotationUnitsFor(variant);
  const value = current.trim();
  if (!value || (units as readonly string[]).includes(value)) return units;
  return [value, ...units];
}
