/**
 * Shared types for the construction-overview page.
 *
 * The live data layer is now the backend (item / task / issue APIs); this
 * module exists only to carry the legacy presentation-only types that
 * pre-date that wiring. Keep the types here while the page still consumes
 * them, and delete the module when the last consumer goes.
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
  tone: "amber" | "rose" | "emerald" | "sky" | "violet";
}

export interface PhaseExtras {
  blockers: Blocker[];
  crew: CrewMember[];
  photos: PhasePhoto[];
  /** Long-form copy for the drawer hero paragraph. */
  narrative: string;
}
