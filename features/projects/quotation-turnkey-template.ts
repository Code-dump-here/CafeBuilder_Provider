import {
  DESIGN_QUOTATION_PARTS,
  type DesignQuotationPart,
} from "./quotation-design-parts";
import { CONSTRUCTION_TEMPLATE_DURATION_DAYS } from "./quotation-construction-template";

/**
 * Starting point for a `both` (design + build) quotation (chốt 03/10/2026).
 *
 * One provider sells both halves of the job, so the template is the two
 * existing ones side by side: the design deliverables the provider picks — any
 * 1 to 4 of the fixed parts, under the same stored names as the design-only
 * form — followed by the three construction phases of
 * `quotation-construction-template.ts`.
 *
 * The schedule is deliberately NOT one instalment per design part, as the
 * design-only form does: on a turnkey total a 2D layout is a few percent, and
 * instalments are kept to round tens (see `quotation-percent.ts`). Four
 * instalments follow the job instead — signing (design starts), final design
 * approved (site handed over, build starts), rough work & concealed MEP
 * accepted, handover. 20 / 30 / 30 / 20 is a default the provider edits, not a
 * rule. Texts live in i18n under `Quotations.editor.turnkey`.
 */
export const TURNKEY_TEMPLATE_TERMS = [
  { key: "signing", percentage: 20 },
  { key: "designApproved", percentage: 30 },
  { key: "rough", percentage: 30 },
  { key: "handover", percentage: 20 },
] as const;

/**
 * Working days the template budgets per design part, before the 71-day build.
 * Only used to prefill an empty duration — the provider states the real one.
 */
const DESIGN_PART_DAYS: Record<DesignQuotationPart, number> = {
  concept: 5,
  layout_2d: 5,
  render_3d: 6,
  technical_drawing: 5,
};

export function turnkeyTemplateDurationDays(
  parts: readonly DesignQuotationPart[],
): number {
  return (
    parts.reduce((sum, part) => sum + DESIGN_PART_DAYS[part], 0) +
    CONSTRUCTION_TEMPLATE_DURATION_DAYS
  );
}

/** The picker opens with every part ticked; the provider unticks what isn't sold. */
export const TURNKEY_DEFAULT_PARTS: readonly DesignQuotationPart[] = DESIGN_QUOTATION_PARTS;
