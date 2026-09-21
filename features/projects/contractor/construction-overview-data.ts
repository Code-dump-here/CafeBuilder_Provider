/**
 * Mock data for the construction overview page.
 *
 * A project is broken into `MILESTONE_PHASES` (e.g. Site Prep → Foundation →
 * Framing → MEP → Finishes → Closeout). Each phase carries a status, a
 * percent complete, a target date, top-level tasks, and an open-blocker
 * count. The most-recent phase is treated as the "current phase" via the
 * `CURRENT_PHASE_ID` constant — the page highlights it on the track and
 * in the header.
 *
 * Replace this module with `useConstructionOverview(projectId)` when the
 * backend endpoint lands.
 */

export type MilestoneStatus =
  | "completed"
  | "inProgress"
  | "blocked"
  | "upcoming";

export interface MilestonePhase {
  id: string;
  /** Short label used in the track node badge. */
  shortLabel: string;
  /** Full descriptive name. */
  label: string;
  status: MilestoneStatus;
  /** 0..100 — how complete the phase is. */
  progress: number;
  /** ISO date string for the targeted finish date. */
  targetDate: string;
  /** ISO date string for when work on the phase actually began. */
  startDate: string;
  /** ISO date string for the planned end of the phase. */
  endDate: string;
  /** Lead contractor or crew name (display only). */
  lead: string;
  /** Top tasks for this phase; rendered in the detail card. */
  tasks: string[];
  /** Number of open issues / blockers filed against this phase. */
  blockerCount: number;
  /** Number of photos uploaded for this phase (KPI display). */
  photoCount: number;
  /**
   * True once a payment batch covering this phase has been confirmed.
   * Undefined when the source response predates the field.
   */
  isPaid?: boolean;
}

export interface ConstructionOverviewData {
  projectId: string;
  /** Site name shown in the header. */
  projectName: string;
  /** Overall phase list, ordered left → right. */
  phases: MilestonePhase[];
  /** Cumulative progress 0..100 used in the hero strip. */
  overallProgress: number;
  /** ISO of the latest entry — used as "last updated" timestamp. */
  lastUpdated: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hardcoded project context (matches the rest of the contractor mock data).
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PROJECT_ID = "p-001";
const MOCK_PROJECT_NAME = "Smart Cafe / Nguyen Hue";

/** The phase node the track should pulse as "current". */
export const CURRENT_PHASE_ID: string = "framing";

// ─────────────────────────────────────────────────────────────────────────────
// Phase-detail extras
//
// The overview page shows the headline view of each phase; the detail
// drawer renders the same phase with these richer fields. Kept inline
// in the mock data module so swapping in real data is a one-liner.
// ─────────────────────────────────────────────────────────────────────────────

export type BlockerSeverity = "low" | "medium" | "high";

export interface Blocker {
  id: string;
  title: string;
  /** Short context for "why is this blocked". */
  context: string;
  severity: BlockerSeverity;
  /** ISO date the blocker was filed. */
  filedAt: string;
  /** Free-form owner role label (no real user model yet). */
  ownerLabel: string;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  initials: string;
}

export interface PhasePhoto {
  id: string;
  /** Short caption rendered below the thumb. */
  caption: string;
  /** Accent token used by the placeholder gradient (matches the
   *  chip tones elsewhere so the photo strip feels cohesive). */
  tone: "amber" | "rose" | "emerald" | "sky" | "violet";
}

/**
 * Per-phase "rich" data, looked up in `phaseExtras` below. Keep keys
 * stable so callers don't need to fall back when extras aren't seeded.
 */
export interface PhaseExtras {
  blockers: Blocker[];
  crew: CrewMember[];
  photos: PhasePhoto[];
  /** Long-form copy for the drawer hero paragraph. */
  narrative: string;
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}

// Six phases, designed to span completed → in-progress → blocked → upcoming — so every status tone has somewhere to render.
export const MILESTONE_PHASES: MilestonePhase[] = [
  {
    id: "site-prep",
    shortLabel: "Site Prep",
    label: "Site preparation & mobilization",
    status: "completed",
    progress: 100,
    targetDate: isoDaysFromNow(-21),
    startDate: isoDaysFromNow(-35),
    endDate: isoDaysFromNow(-21),
    lead: "Hung",
    tasks: [
      "Site office + storage container placed",
      "Permits posted, neighbor notice mailed",
      "Safety walkthrough with all workers",
    ],
    blockerCount: 0,
    photoCount: 8,
  },
  {
    id: "foundation",
    shortLabel: "Foundation",
    label: "Demolition & foundation",
    status: "completed",
    progress: 100,
    targetDate: isoDaysFromNow(-10),
    startDate: isoDaysFromNow(-24),
    endDate: isoDaysFromNow(-10),
    lead: "Hung",
    tasks: [
      "Demolition of existing finish surfaces",
      "Slab pour + cure (delayed 1 day for rebar)",
      "Waterproofing under walls",
    ],
    blockerCount: 0,
    photoCount: 14,
  },
  {
    id: "framing",
    shortLabel: "Framing",
    label: "Studs, drywall, MEP rough-in",
    status: "inProgress",
    progress: 68,
    targetDate: isoDaysFromNow(7),
    startDate: isoDaysFromNow(-7),
    endDate: isoDaysFromNow(7),
    lead: "Khoi",
    tasks: [
      "Stud framing on north + west walls",
      "Drywall hung and taped on north + east walls",
      "Electrical panel upgrade to 200A",
      "HVAC ductwork routed above ceiling",
    ],
    blockerCount: 1,
    photoCount: 19,
  },
  {
    id: "finishes",
    shortLabel: "Finishes",
    label: "Finishes, fixtures, equipment",
    status: "blocked",
    progress: 12,
    targetDate: isoDaysFromNow(28),
    startDate: isoDaysFromNow(14),
    endDate: isoDaysFromNow(28),
    lead: "Dat",
    tasks: [
      "Bar counter plumbing rough-in (in progress)",
      "Pendant fixture conduit runs (in progress)",
      "Punch-walk + sign-off cycle",
    ],
    blockerCount: 1,
    photoCount: 4,
  },
  {
    id: "closeout",
    shortLabel: "Closeout",
    label: "Commissioning & handover",
    status: "upcoming",
    progress: 0,
    targetDate: isoDaysFromNow(56),
    startDate: isoDaysFromNow(42),
    endDate: isoDaysFromNow(56),
    lead: "TBD",
    tasks: [
      "Final inspections",
      "Equipment commissioning",
      "Owner training + handover walkthrough",
    ],
    blockerCount: 0,
    photoCount: 0,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate export. Mirrors the shape of the eventual hook so swapping it
// out is a one-liner.
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_CONSTRUCTION_OVERVIEW: ConstructionOverviewData = {
  projectId: MOCK_PROJECT_ID,
  projectName: MOCK_PROJECT_NAME,
  phases: MILESTONE_PHASES,
  // Aggregate progress = weighted average by phase progress; for the mock
  // we hardcode 58% because that's what the page would compute.
  overallProgress: 58,
  lastUpdated: isoDaysFromNow(0),
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-phase rich content for the detail drawer. The drawer pulls
// `phaseExtras[phaseId]` and gracefully falls back when keys are absent
// so adding a new phase to MILESTONE_PHASES without extras doesn't
// crash the page.
// ─────────────────────────────────────────────────────────────────────────────

export const phaseExtras: Record<string, PhaseExtras> = {
  "site-prep": {
    narrative:
      "Mobilization finished a week ahead of plan. Site office and storage container secured, permits posted, and the safety walkthrough wrapped with zero outstanding items.",
    crew: [
      { id: "c-hung", name: "Hung", role: "Site lead", initials: "HU" },
      { id: "c-duc", name: "Duc", role: "Safety officer", initials: "DU" },
      { id: "c-lan", name: "Lan", role: "Logistics", initials: "LA" },
    ],
    blockers: [],
    photos: [
      { id: "sp-1", caption: "Site office placed", tone: "sky" },
      { id: "sp-2", caption: "Storage container", tone: "amber" },
      { id: "sp-3", caption: "Permits posted", tone: "emerald" },
      { id: "sp-4", caption: "Safety walkthrough", tone: "emerald" },
    ],
  },
  foundation: {
    narrative:
      "Demolition went smoothly and the slab pour cured on schedule. Waterproofing under walls is finished and ready for framing to start.",
    crew: [
      { id: "c-hung", name: "Hung", role: "Site lead", initials: "HU" },
      { id: "c-bao", name: "Bao", role: "Concrete foreman", initials: "BA" },
      { id: "c-thanh", name: "Thanh", role: "Waterproofing", initials: "TH" },
    ],
    blockers: [],
    photos: [
      { id: "f-1", caption: "Slab pour", tone: "amber" },
      { id: "f-2", caption: "Cure check", tone: "sky" },
      { id: "f-3", caption: "Waterproofing", tone: "emerald" },
      { id: "f-4", caption: "Under-wall membrane", tone: "emerald" },
    ],
  },
  framing: {
    narrative:
      "Stud framing is 80% done on the north and west walls. Drywall is hung on the north + east walls and taped on the north. Electrical panel upgrade scheduled for tomorrow; HVAC ductwork continues above ceiling. One open blocker: plumbing rough-in delayed pending fixture spec.",
    crew: [
      { id: "c-khoi", name: "Khoi", role: "Framing lead", initials: "KH" },
      { id: "c-minh", name: "Minh", role: "Drywall", initials: "MI" },
      { id: "c-son", name: "Son", role: "Electrician", initials: "SO" },
      { id: "c-hai", name: "Hai", role: "HVAC", initials: "HA" },
      { id: "c-trang", name: "Trang", role: "Apprentice", initials: "TR" },
    ],
    blockers: [
      {
        id: "b-fr-1",
        title: "Plumbing rough-in delayed",
        context:
          "Awaiting final bar-fixture spec from designer. Can't pour until confirmed.",
        severity: "high",
        filedAt: isoDaysFromNow(-2),
        ownerLabel: "Designer (Phuong)",
      },
      {
        id: "b-fr-2",
        title: "Conduit pull behind east wall",
        context: "HVAC routing required drywall to come down in one corner.",
        severity: "low",
        filedAt: isoDaysFromNow(-1),
        ownerLabel: "HVAC crew",
      },
    ],
    photos: [
      { id: "fr-1", caption: "North wall framing", tone: "amber" },
      { id: "fr-2", caption: "East wall drywall", tone: "sky" },
      { id: "fr-3", caption: "Electrical panel prep", tone: "violet" },
      { id: "fr-4", caption: "HVAC duct routing", tone: "rose" },
      { id: "fr-5", caption: "Tape + mud, north wall", tone: "sky" },
      { id: "fr-6", caption: "Crew huddle at start of day", tone: "emerald" },
    ],
  },
  finishes: {
    narrative:
      "Bar counter plumbing rough-in started but is paused waiting on faucet spec confirmation. Pendant fixture conduit runs in progress. One blocker carries from framing into finishes — once plumbing unblocks, finishes can run at full speed.",
    crew: [
      { id: "c-dat", name: "Dat", role: "Finishes lead", initials: "DA" },
      { id: "c-phuong", name: "Phuong", role: "Plumber", initials: "PH" },
      { id: "c-linh", name: "Linh", role: "Electrician", initials: "LI" },
    ],
    blockers: [
      {
        id: "b-fi-1",
        title: "Faucet spec not finalized",
        context:
          "Designer needs to confirm mounting style (wall vs deck) before plumbing can continue.",
        severity: "high",
        filedAt: isoDaysFromNow(-3),
        ownerLabel: "Designer (Phuong)",
      },
    ],
    photos: [
      { id: "fi-1", caption: "Bar counter prep", tone: "amber" },
      { id: "fi-2", caption: "Pendant conduit", tone: "violet" },
      { id: "fi-3", caption: "Plumbing rough-in", tone: "rose" },
      { id: "fi-4", caption: "Drywall finish, south wall", tone: "sky" },
    ],
  },
  closeout: {
    narrative:
      "No work in this phase yet. Final inspections, equipment commissioning, and owner training kick off once finishes are signed off.",
    crew: [
      { id: "c-tbd-1", name: "TBD", role: "Commissioning lead", initials: "—" },
    ],
    blockers: [],
    photos: [],
  },
};
