/**
 * Mirrors the C# `DesignBrief` entity. `AiRecommendation` mirrors
 * `AiRecommendation`. Server payloads are normalized on the way in
 * (ISO date strings → `Date`, nullables kept nullable) — components
 * never deal with raw JSON.
 */

export interface DesignBrief {
  id: string;
  projectId: string;

  targetCustomer: string;
  style: string;
  mood: string;

  /** Seat count is optional — projects in early brief may not know yet. */
  seatCount: number | null;

  /** Free-form text from owner. May be null. */
  timeline: string | null;
  brandNote: string | null;
  businessModel: string | null;
  businessGoals: string | null;
  operationNote: string | null;

  createdAt: Date;
  updatedAt: Date;

  // Navigations are surfaced through dedicated hooks; kept here for typing.
  aiRecommendations: AiRecommendation[];
}

/** Stage names on the customer flow timeline. */
export type CustomerFlowStage =
  | "ENTRANCE"
  | "COUNTER"
  | "PICKUP"
  | "SEATING_AREA"
  | string;

export interface CustomerFlowStep {
  stage: CustomerFlowStage;
  description: string;
}

export interface PlanRecommendation {
  title: string;
  rationale: string | null;
  /** 1 = highest priority, 3 = lowest in the sample data. */
  priority: number;
}

export interface RiskNote {
  level: "low" | "medium" | "high";
  title: string;
  description: string;
  mitigation: string | null;
}

export interface LayoutZone {
  id: string;
  label: string;
  purpose: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Whether staff-only. */
  is_staff_only: boolean;
}

export type AiRecommendationState =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | null;

/**
 * AI generation job + plan + cost + image. The C# entity packs a lot into
 * one record — we keep the same shape but type everything cleanly. The
 * `payload` field is the raw JSON request, useful for debugging; consumers
 * should prefer the typed fields below.
 */
export interface AiRecommendation {
  id: string;
  briefId: string;
  conceptSummary: string;

  /** Raw JSON request payload (stringified). Use typed fields when possible. */
  payload: string;

  estimatedDesignCost: number | null;
  estimatedConstructionCost: number | null;

  createdAt: Date;

  /** Job id from the backend worker. Older mock entries use `null`. */
  jobId: string | null;

  /** `null` for legacy / manually-inserted rows. */
  state: AiRecommendationState;
  lastError: string | null;
  attempts: number;
  startedAt: Date | null;
  completedAt: Date | null;

  parentJobId: string | null;

  // ---- Plan summary ----
  planConceptName: string | null;
  planSummary: string | null;

  // ---- Layout grid ----
  layoutWidth: number | null;
  layoutHeight: number | null;
  layoutUnit: string | null;
  layoutZones: LayoutZone[] | null;
  /** Free-form adjacency rules; kept as `unknown[]` — shape varies. */
  layoutAdjacencyRules: unknown[] | null;

  // ---- Cost ----
  fitoutMinVnd: number | null;
  fitoutMaxVnd: number | null;
  equipmentMinVnd: number | null;
  equipmentMaxVnd: number | null;
  contingencyPercent: number | null;
  costNotes: string | null;

  // ---- Customer flow + risks ----
  customerFlow: CustomerFlowStep[] | null;
  recommendations: PlanRecommendation[] | null;
  riskNotes: RiskNote[] | null;

  // ---- Image ----
  imageView: string | null;
  imagePrompt: string | null;
  imageAspectRatio: string | null;
  imageNegativePrompt: string | null;
  imageReferenceUrls: string[] | null;
  imageArtifactUrl: string | null;

  /** Recommended seat count from the planner. May differ from brief target. */
  seatCapacityRecommendation: number | null;
}
