/**
 * Three-phase starting point for a construction quotation (chốt 02/10/2026).
 *
 * The public construction template ("Thi công quán cà phê - Quy trình chuẩn",
 * `DbSeeder.SeedConstructionTemplatesAsync`) has nine milestones over 71 days.
 * Priced and paid at that grain it is nine invoices for one café; real fit-out
 * contracts bill in three phases, so the nine are grouped by what they leave
 * behind on site:
 *
 *  1. rough     — site prep & demolition, rough build, concealed MEP (5+10+12 d)
 *  2. finishing — ceiling/walls/floor, paint, bar counter & fixed joinery (10+7+12 d)
 *  3. handover  — equipment & lighting, signage, cleaning & acceptance (6+5+4 d)
 *
 * Payment follows the common Vietnamese fit-out split: an advance on signing so
 * the contractor can order materials and start joinery, a progress payment once
 * the concealed work is accepted (the last point where defects are cheap to
 * fix), and the balance on handover. 30 / 40 / 30 is a default the provider
 * edits, not a rule. Texts live in i18n under `Quotations.editor.template`.
 */
export const CONSTRUCTION_TEMPLATE_PHASES = [
  { key: "rough", days: 27 },
  { key: "finishing", days: 29 },
  { key: "handover", days: 15 },
] as const;

export const CONSTRUCTION_TEMPLATE_TERMS = [
  { key: "advance", percentage: 30 },
  { key: "progress", percentage: 40 },
  { key: "final", percentage: 30 },
] as const;

export const CONSTRUCTION_TEMPLATE_DURATION_DAYS = CONSTRUCTION_TEMPLATE_PHASES.reduce(
  (sum, phase) => sum + phase.days,
  0,
);

/** A phase is priced as one lump sum. */
export const CONSTRUCTION_TEMPLATE_UNIT = "package";
