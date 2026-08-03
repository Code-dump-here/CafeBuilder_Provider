import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  AiRecommendation,
  AiRecommendationState,
  CustomerFlowStep,
  LayoutZone,
  PlanRecommendation,
  RiskNote,
} from "./design-brief-types";

// ─── Filters ────────────────────────────────────────────────────────────────

export interface AiRecommendationListFilters {
  /** Required by the backend to scope recommendations to one brief. */
  briefId: number;
  pageNumber: number;
  pageSize: number;
}

// ─── Paged response ─────────────────────────────────────────────────────────

/**
 * Mirror of the backend `PagedResponse<T>` envelope. Same shape as
 * `PagedDesignBriefs` — kept as its own type so consumers can't
 * accidentally pass one for the other.
 */
export interface PagedAiRecommendations {
  items: AiRecommendation[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// ─── Wire types ─────────────────────────────────────────────────────────────

interface RawLayoutZone {
  id: string;
  label: string;
  purpose: string;
  x: number;
  y: number;
  w: number;
  h: number;
  is_staff_only: boolean;
}

interface RawCustomerFlowStep {
  stage: string;
  description: string;
}

interface RawPlanRecommendation {
  title: string;
  rationale: string | null;
  priority: number;
}

interface RawRiskNote {
  level: "low" | "medium" | "high";
  title: string;
  description: string;
  mitigation: string | null;
}

interface RawAiRecommendation {
  id: number;
  briefId: number;
  conceptSummary: string;
  payload: string;
  estimatedDesignCost: number | null;
  estimatedConstructionCost: number | null;
  createdAt: string;
  jobId: string | null;
  state: string | null;
  lastError: string | null;
  attempts: number;
  startedAt: string | null;
  completedAt: string | null;
  parentJobId: string | null;
  planConceptName: string | null;
  planSummary: string | null;
  layoutWidth: number | null;
  layoutHeight: number | null;
  layoutUnit: string | null;
  layoutZones: RawLayoutZone[] | null;
  layoutAdjacencyRules: unknown[] | null;
  fitoutMinVnd: number | null;
  fitoutMaxVnd: number | null;
  equipmentMinVnd: number | null;
  equipmentMaxVnd: number | null;
  contingencyPercent: number | null;
  costNotes: string | null;
  customerFlow: RawCustomerFlowStep[] | null;
  recommendations: RawPlanRecommendation[] | null;
  riskNotes: RawRiskNote[] | null;
  imageView: string | null;
  imagePrompt: string | null;
  imageAspectRatio: string | null;
  imageNegativePrompt: string | null;
  imageReferenceUrls: string[] | null;
  imageArtifactUrl: string | null;
  seatCapacityRecommendation: number | null;
}

interface RawPagedAiRecommendations {
  items: RawAiRecommendation[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch the (paged) AI design recommendations for a brief.
 *
 * Endpoint: `GET /api/ai-recommendations?pageNumber={n}&pageSize={m}&briefId={id}`.
 *
 * The shared `api` axios instance already attaches the Bearer access
 * token via the request interceptor (see `lib/http/axios.ts`). No extra
 * auth wiring is needed here — the user just needs to be logged in.
 */
export async function fetchAiRecommendations(
  filters: AiRecommendationListFilters,
  config?: RequestConfig,
): Promise<PagedAiRecommendations> {
  const response = await api.get<RawPagedAiRecommendations>(
    "/api/ai-recommendations",
    {
      ...config,
      params: {
        briefId: filters.briefId,
        pageNumber: filters.pageNumber,
        pageSize: filters.pageSize,
      },
    },
  );
  return normalizePagedResponse(response.data);
}

// ─── Normalization ──────────────────────────────────────────────────────────

function normalizePagedResponse(
  raw: RawPagedAiRecommendations,
): PagedAiRecommendations {
  return {
    items: raw.items.map(normalizeRecommendation),
    pageNumber: raw.pageNumber,
    pageSize: raw.pageSize,
    totalItems: raw.totalItems,
    totalPages: raw.totalPages,
    hasPrevious: raw.hasPrevious,
    hasNext: raw.hasNext,
  };
}

function normalizeRecommendation(
  raw: RawAiRecommendation,
): AiRecommendation {
  return {
    id: raw.id,
    briefId: raw.briefId,
    conceptSummary: raw.conceptSummary,
    payload: raw.payload,
    estimatedDesignCost: raw.estimatedDesignCost ?? null,
    estimatedConstructionCost: raw.estimatedConstructionCost ?? null,
    createdAt: new Date(raw.createdAt),
    jobId: raw.jobId ?? null,
    state: coerceState(raw.state),
    lastError: raw.lastError ?? null,
    attempts: raw.attempts ?? 0,
    startedAt: raw.startedAt ? new Date(raw.startedAt) : null,
    completedAt: raw.completedAt ? new Date(raw.completedAt) : null,
    parentJobId: raw.parentJobId ?? null,
    planConceptName: raw.planConceptName ?? null,
    planSummary: raw.planSummary ?? null,
    layoutWidth: raw.layoutWidth ?? null,
    layoutHeight: raw.layoutHeight ?? null,
    layoutUnit: raw.layoutUnit ?? null,
    layoutZones: raw.layoutZones
      ? raw.layoutZones.map(normalizeZone)
      : null,
    layoutAdjacencyRules: raw.layoutAdjacencyRules ?? null,
    fitoutMinVnd: raw.fitoutMinVnd ?? null,
    fitoutMaxVnd: raw.fitoutMaxVnd ?? null,
    equipmentMinVnd: raw.equipmentMinVnd ?? null,
    equipmentMaxVnd: raw.equipmentMaxVnd ?? null,
    contingencyPercent: raw.contingencyPercent ?? null,
    costNotes: raw.costNotes ?? null,
    customerFlow: raw.customerFlow
      ? raw.customerFlow.map(normalizeFlowStep)
      : null,
    recommendations: raw.recommendations
      ? raw.recommendations.map(normalizePlanRec)
      : null,
    riskNotes: raw.riskNotes
      ? raw.riskNotes.map(normalizeRiskNote)
      : null,
    imageView: raw.imageView ?? null,
    imagePrompt: raw.imagePrompt ?? null,
    imageAspectRatio: raw.imageAspectRatio ?? null,
    imageNegativePrompt: raw.imageNegativePrompt ?? null,
    imageReferenceUrls: raw.imageReferenceUrls ?? null,
    imageArtifactUrl: raw.imageArtifactUrl ?? null,
    seatCapacityRecommendation: raw.seatCapacityRecommendation ?? null,
  };
}

function normalizeZone(raw: RawLayoutZone): LayoutZone {
  return {
    id: raw.id,
    label: raw.label,
    purpose: raw.purpose,
    x: raw.x,
    y: raw.y,
    w: raw.w,
    h: raw.h,
    is_staff_only: raw.is_staff_only,
  };
}

function normalizeFlowStep(raw: RawCustomerFlowStep): CustomerFlowStep {
  return {
    stage: raw.stage,
    description: raw.description,
  };
}

function normalizePlanRec(raw: RawPlanRecommendation): PlanRecommendation {
  return {
    title: raw.title,
    rationale: raw.rationale ?? null,
    priority: raw.priority,
  };
}

function normalizeRiskNote(raw: RawRiskNote): RiskNote {
  return {
    level: raw.level,
    title: raw.title,
    description: raw.description,
    mitigation: raw.mitigation ?? null,
  };
}

/**
 * Coerce a free-form `state` string to the typed `AiRecommendationState`
 * union. The backend may add new states over time; we fall back to `null`
 * for anything we don't recognize so the UI renders as legacy until the
 * type list catches up.
 */
function coerceState(value: string | null): AiRecommendationState {
  if (value == null) return null;
  switch (value) {
    case "queued":
    case "running":
    case "completed":
    case "failed":
      return value;
    default:
      return null;
  }
}
