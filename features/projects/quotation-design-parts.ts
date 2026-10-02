import type { DesignType } from "./design-types";

/**
 * The four deliverables a design quotation prices — one line each, at most
 * once (chốt 02/10/2026).
 *
 * The set is `DesignType` on purpose: these are exactly the kinds of design the
 * studio later uploads for the owner to approve, so every quoted line — and
 * every instalment tied to one — names something the design flow produces.
 * A free-text line ("Hoàn thiện concept và 2D, 3D") priced three deliverables
 * at once and could not be matched to any of them.
 */
export type DesignQuotationPart = DesignType;

/** In the order the work is done — also the dropdown order. */
export const DESIGN_QUOTATION_PARTS: readonly DesignQuotationPart[] = [
  "concept",
  "layout_2d",
  "render_3d",
  "technical_drawing",
] as const;

/**
 * The name written to the quotation line and to the payment term. Fixed rather
 * than localised: it is stored, read back by the owner app and the comparison
 * screen, and parsed back into a part when the draft is edited — a name that
 * followed the provider's UI language would split one deliverable into two
 * spellings. The dropdown shows a localised label instead.
 */
export const DESIGN_PART_STORED_NAME: Record<DesignQuotationPart, string> = {
  concept: "Concept",
  layout_2d: "Bản vẽ 2D",
  render_3d: "Phối cảnh 3D",
  technical_drawing: "Tài liệu thiết kế",
};

/** A deliverable is sold whole: one package of it. */
export const DESIGN_PART_UNIT = "package";

/** Spellings a part may have been stored under (lower-case). */
const ALIASES: Record<DesignQuotationPart, readonly string[]> = {
  concept: ["concept", "phác thảo ý tưởng"],
  layout_2d: ["bản vẽ 2d", "2d", "layout 2d", "2d layout", "layout_2d"],
  render_3d: ["phối cảnh 3d", "3d", "render 3d", "3d render", "render_3d"],
  technical_drawing: [
    "tài liệu thiết kế",
    "design documents",
    "bản vẽ kỹ thuật",
    "technical drawings",
    "technical_drawing",
  ],
};

/**
 * The part a stored line or term name stands for, or null for a name written
 * before the parts were fixed — the editor then asks the provider to pick one
 * instead of silently dropping the line.
 */
export function designPartFromName(name: string): DesignQuotationPart | null {
  const normalised = name.trim().toLowerCase();
  if (!normalised) return null;
  return (
    DESIGN_QUOTATION_PARTS.find(
      (part) =>
        DESIGN_PART_STORED_NAME[part].toLowerCase() === normalised ||
        ALIASES[part].includes(normalised),
    ) ?? null
  );
}
