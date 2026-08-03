// ─── Shared types ────────────────────────────────────────────────────────────

export type MilestoneStatus = "pending" | "in_progress" | "completed";

export type MilestonePhase = 
  | "survey"
  | "design"
  | "permits"
  | "construction"
  | "handover";

export interface PhaseExtras {
  constructionPercent?: number;
  lastActivityAt?: string;
  issueCount?: number;
  openIssueCount?: number;
}

export interface MilestonePhaseData {
  status: MilestoneStatus;
  extras: PhaseExtras;
}
