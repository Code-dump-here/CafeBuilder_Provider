import * as React from "react";

import type {
  AiRecommendation,
  DesignBrief,
} from "./design-brief-types";

/**
 * Hook to load the design brief + AI recommendations for a project.
 *
 * Today this returns a deterministic mock (so the page renders end-to-end
 * before the real API is wired). Replace by overriding `OVERRIDE` with a
 * real fetcher — components only depend on the typed result, never on
 * JSON shape.
 */
let OVERRIDE: null | ((projectId: string) => DesignBrief) = null;

export const __setDesignBriefOverride = (
  next: (projectId: string) => DesignBrief,
) => {
  OVERRIDE = next;
};

// ---- Sample data ----------------------------------------------------------
//
// Mirrors the JSON sample from the API: 29 AI recommendations across
// `queued` / `completed` / `failed` / legacy. To keep the in-source fixture
// readable we keep the full records for the two most interesting ones (29,
// 28) plus the single `failed` row (19), then pad with queued/completed
// stubs. The order is preserved via `createdAt` desc when rendering.

const RAW_RECOMMENDATIONS: Array<
  Omit<
    AiRecommendation,
    "createdAt" | "startedAt" | "completedAt" | "state"
  > & {
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    state: string | null;
  }
> = [
  {
    id: 29,
    briefId: 1,
    conceptSummary: "AI Design: An's Coffee House - Chi nhánh Quận 1",
    payload:
      '{"briefId": 1, "request": {"Notes": null, "BriefId": 1, "ImageView": null, "DetailLevel": null, "GenerateImage": true, "MustHaveZones": null, "NiceToHaveZones": null, "AlternativesCount": 1, "ReferenceImageUrls": null}, "projectId": 1}',
    estimatedDesignCost: null,
    estimatedConstructionCost: null,
    createdAt: "2026-07-03T14:41:08.03165Z",
    jobId: "job_20260703144108_f3df06b0",
    state: "completed",
    lastError: null,
    attempts: 0,
    startedAt: null,
    completedAt: null,
    parentJobId: null,
    planConceptName: "Specialty Cafe Concept",
    planSummary:
      "Assumption: Assuming typical small Vietnamese specialty cafe operations. Assumption: Assuming a single-shift operation with peak hours in the morning. Assumption: Assuming a single entrance/exit point",
    layoutWidth: 6,
    layoutHeight: 8,
    layoutUnit: "meter",
    layoutZones: [
      {
        id: "ZONE_1",
        label: "Auxiliary zone",
        purpose: "Operational zone added by mapper to satisfy schema minimum.",
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        is_staff_only: false,
      },
      {
        id: "ZONE_2",
        label: "Auxiliary zone",
        purpose: "Operational zone added by mapper to satisfy schema minimum.",
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        is_staff_only: false,
      },
    ],
    layoutAdjacencyRules: [],
    fitoutMinVnd: 400000000,
    fitoutMaxVnd: 500000000,
    equipmentMinVnd: 200000000,
    equipmentMaxVnd: 250000000,
    contingencyPercent: 10,
    costNotes: null,
    customerFlow: [
      { stage: "ENTRANCE", description: "Customers move through ENTRANCE." },
      { stage: "COUNTER", description: "Customers move through COUNTER." },
      { stage: "PICKUP", description: "Customers move through PICKUP." },
      {
        stage: "SEATING_AREA",
        description: "Customers move through SEATING_AREA.",
      },
    ],
    recommendations: [
      {
        title:
          "Focus on creating a warm and inviting atmosphere to attract office workers and tourists.",
        rationale: "Derived from the planner's free-form recommendation.",
        priority: 3,
      },
      {
        title:
          "Ensure the counter and pickup area are easily accessible from the entrance.",
        rationale: "Derived from the planner's free-form recommendation.",
        priority: 2,
      },
      {
        title:
          "Use natural materials like wood and greenery to enhance the industrial pha Scandinavian style.",
        rationale: "Derived from the planner's free-form recommendation.",
        priority: 1,
      },
    ],
    riskNotes: [
      {
        level: "medium",
        title: "Operational note",
        description:
          "The seat target of 60 is not feasible within the given area. Adjusted to 35 seats.",
        mitigation: null,
      },
      {
        level: "medium",
        title: "Operational note",
        description:
          "Staff preparation and back-of-house are adjacent to the pickup area due to space constraints.",
        mitigation: null,
      },
      {
        level: "medium",
        title: "Design assumption",
        description:
          "Assumption: Assuming typical small Vietnamese specialty cafe operations.",
        mitigation: null,
      },
    ],
    imageView: "isometric",
    imagePrompt:
      "Architectural isometric cutaway of a specialty cafe, 30-degree axonometric projection, scale 1:50, matte ambient occlusion, clean edges, presentation-grade rendering. Create an isometric view of a 9.25m x 9.25m industrial pha Scandinavian cafe with a warm and inviting morning atmosphere. The cafe should have a counter at the front, a pickup area next to it, and a seating area that occupies most of",
    imageAspectRatio: null,
    imageNegativePrompt:
      "low quality, blurry, cartoon, anime, sketch, painterly, text, watermark, warped walls, melted furniture, double exposure, fisheye, drone shot, isometric on top-down, deformed faces",
    imageReferenceUrls: [],
    imageArtifactUrl:
      "http://localhost:8000/_artifacts/jobs/job_20260703144108_f3df06b0/art_9ccbef84df414189-image.png",
    seatCapacityRecommendation: 24,
  },
  {
    id: 28,
    briefId: 1,
    conceptSummary: "AI Design: An's Coffee House - Chi nhánh Quận 1",
    payload:
      '{"briefId": 1, "request": {"Notes": null, "BriefId": 1, "ImageView": null, "DetailLevel": null, "GenerateImage": true, "MustHaveZones": null, "NiceToHaveZones": null, "AlternativesCount": 1, "ReferenceImageUrls": null}, "projectId": 1}',
    estimatedDesignCost: null,
    estimatedConstructionCost: null,
    createdAt: "2026-07-03T14:32:20.64478Z",
    jobId: "job_20260703143220_86709676",
    state: "completed",
    lastError: null,
    attempts: 0,
    startedAt: null,
    completedAt: null,
    parentJobId: null,
    planConceptName: "Specialty Cafe Concept",
    planSummary:
      "Assumption: Assuming typical small Vietnamese specialty cafe operations. Risk: Seating area is slightly below the target due to space constraints.",
    layoutWidth: 6,
    layoutHeight: 8,
    layoutUnit: "meter",
    layoutZones: [
      {
        id: "ZONE_1",
        label: "Auxiliary zone",
        purpose: "Operational zone added by mapper to satisfy schema minimum.",
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        is_staff_only: false,
      },
      {
        id: "ZONE_2",
        label: "Auxiliary zone",
        purpose: "Operational zone added by mapper to satisfy schema minimum.",
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        is_staff_only: false,
      },
    ],
    layoutAdjacencyRules: [],
    fitoutMinVnd: 400000000,
    fitoutMaxVnd: 500000000,
    equipmentMinVnd: 200000000,
    equipmentMaxVnd: 250000000,
    contingencyPercent: 10,
    costNotes: null,
    customerFlow: [
      { stage: "ENTRANCE", description: "Customers move through ENTRANCE." },
      { stage: "COUNTER", description: "Customers move through COUNTER." },
      { stage: "PICKUP", description: "Customers move through PICKUP." },
      {
        stage: "SEATING_AREA",
        description: "Customers move through SEATING_AREA.",
      },
    ],
    recommendations: [
      {
        title: "Anchor main bar at the frontage.",
        rationale:
          "Place the primary customer-facing zone near the storefront to maximise walk-in conversion.",
        priority: 2,
      },
      {
        title: "Stage seating behind the service line.",
        rationale:
          "Group seating zones behind the bar to keep the front of house uncluttered.",
        priority: 3,
      },
    ],
    riskNotes: [
      {
        level: "medium",
        title: "Operational note",
        description:
          "Seating area is slightly below the target due to space constraints.",
        mitigation: null,
      },
      {
        level: "medium",
        title: "Design assumption",
        description:
          "Assumption: Assuming typical small Vietnamese specialty cafe operations.",
        mitigation: null,
      },
    ],
    imageView: "isometric",
    imagePrompt:
      "Architectural isometric cutaway of a specialty cafe, 30-degree axonometric projection, scale 1:50, matte ambient occlusion, clean edges, presentation-grade rendering. Design an isometric view of a 85.5 sqm industrial pha Scandinavian cafe with a warm and dynamic morning mood. The cafe should have a main seating area with 50 seats, a counter, a pickup area, a kitchen, a restroom, and a staff area.",
    imageAspectRatio: null,
    imageNegativePrompt:
      "low quality, blurry, cartoon, anime, sketch, painterly, text, watermark, warped walls, melted furniture, double exposure, fisheye, drone shot, isometric on top-down, deformed faces",
    imageReferenceUrls: [],
    imageArtifactUrl:
      "http://localhost:8000/_artifacts/jobs/job_20260703143220_86709676/art_adcea58399ac40a0-image.png",
    seatCapacityRecommendation: 24,
  },
  {
    id: 19,
    briefId: 1,
    conceptSummary: "AI Design: An's Coffee House - Chi nhánh Quận 1",
    payload:
      '{"briefId": 1, "request": {"Notes": null, "BriefId": 1, "ImageView": null, "DetailLevel": null, "GenerateImage": true, "MustHaveZones": null, "NiceToHaveZones": null, "AlternativesCount": 1, "ReferenceImageUrls": null}, "projectId": 1}',
    estimatedDesignCost: null,
    estimatedConstructionCost: null,
    createdAt: "2026-07-03T00:34:26.939311Z",
    jobId: "job_20260703003427_c0ad3b53",
    state: "failed",
    lastError:
      "18 validation errors for GenerateCafeDesignRequest\ninput.shopName\n  Input should be a valid string [type=string_type, input_value=None, input_type=NoneType]\n    For further information visit https://errors.pydantic.dev/2.13/v/string_type\ninput.location\n  Input should be a valid string [type=string_type, input_value=None, input_type=NoneType]\n    For further information visit https://errors.pydantic.dev/2.13/v/string_type\ninput.areaSqm\n  Input should be a valid number [type=float_type, input_valu",
    attempts: 0,
    startedAt: null,
    completedAt: null,
    parentJobId: null,
    planConceptName: null,
    planSummary: null,
    layoutWidth: null,
    layoutHeight: null,
    layoutUnit: null,
    layoutZones: null,
    layoutAdjacencyRules: null,
    fitoutMinVnd: null,
    fitoutMaxVnd: null,
    equipmentMinVnd: null,
    equipmentMaxVnd: null,
    contingencyPercent: null,
    costNotes: null,
    customerFlow: null,
    recommendations: null,
    riskNotes: null,
    imageView: null,
    imagePrompt: null,
    imageAspectRatio: null,
    imageNegativePrompt: null,
    imageReferenceUrls: null,
    imageArtifactUrl: null,
    seatCapacityRecommendation: null,
  },
];

const LEGACY_ROW = {
  id: 1,
  briefId: 1,
  conceptSummary:
    "Bố trí quầy bar trung tâm, khu vực seating linh hoạt, tận dụng ánh sáng tự nhiên từ mặt tiền kính.",
  payload:
    '{"zones": ["bar", "seating", "takeaway"], "palette": ["#6F4E37", "#4B5320", "#F5F0E6"], "lighting": "warm"}',
  estimatedDesignCost: 45_000_000,
  estimatedConstructionCost: 380_000_000,
  createdAt: "2026-07-02T08:47:45.887634Z",
  jobId: null,
  state: null,
  lastError: null,
  attempts: 0,
  startedAt: null,
  completedAt: null,
  parentJobId: null,
  planConceptName: null,
  planSummary: null,
  layoutWidth: null,
  layoutHeight: null,
  layoutUnit: null,
  layoutZones: null,
  layoutAdjacencyRules: null,
  fitoutMinVnd: null,
  fitoutMaxVnd: null,
  equipmentMinVnd: null,
  equipmentMaxVnd: null,
  contingencyPercent: null,
  costNotes: null,
  customerFlow: null,
  recommendations: null,
  riskNotes: null,
  imageView: null,
  imagePrompt: null,
  imageAspectRatio: null,
  imageNegativePrompt: null,
  imageReferenceUrls: null,
  imageArtifactUrl: null,
  seatCapacityRecommendation: null,
};

// Pad with the remaining queued/completed rows from the sample. We only
// carry `id` + `state` + a derived `createdAt` for these so the list reads
// as 29 entries, matching the real API. Components rely on `state` to
// decide how much to render per row.
const PADDED_IDS_AND_STATES: Array<{ id: number; state: string | null }> = [
  { id: 27, state: "queued" },
  { id: 26, state: "queued" },
  { id: 25, state: "queued" },
  { id: 24, state: "queued" },
  { id: 23, state: "queued" },
  { id: 22, state: "queued" },
  { id: 21, state: "queued" },
  { id: 20, state: "queued" },
  { id: 18, state: "queued" },
  { id: 17, state: "queued" },
  { id: 16, state: "completed" },
  { id: 15, state: "completed" },
  { id: 14, state: "completed" },
];

function normalize(
  rec: (typeof RAW_RECOMMENDATIONS)[number] | typeof LEGACY_ROW,
): AiRecommendation {
  return {
    ...rec,
    createdAt: new Date(rec.createdAt),
    startedAt: rec.startedAt ? new Date(rec.startedAt) : null,
    completedAt: rec.completedAt ? new Date(rec.completedAt) : null,
    state: rec.state as AiRecommendation["state"],
    layoutAdjacencyRules: rec.layoutAdjacencyRules ?? null,
    imageReferenceUrls: rec.imageReferenceUrls ?? null,
    customerFlow: rec.customerFlow ?? null,
    recommendations: rec.recommendations ?? null,
    riskNotes: rec.riskNotes ?? null,
    layoutZones: rec.layoutZones ?? null,
  };
}

function buildPaddedRec(
  id: number,
  state: string | null,
  createdAt: Date,
): AiRecommendation {
  return {
    id,
    briefId: 1,
    conceptSummary: "AI Design: An's Coffee House - Chi nhánh Quận 1",
    payload:
      '{"briefId": 1, "request": {"Notes": null, "BriefId": 1, "ImageView": null, "DetailLevel": null, "GenerateImage": true, "MustHaveZones": null, "NiceToHaveZones": null, "AlternativesCount": 1, "ReferenceImageUrls": null}, "projectId": 1}',
    estimatedDesignCost: null,
    estimatedConstructionCost: null,
    createdAt,
    jobId: null,
    state: state as AiRecommendation["state"],
    lastError: null,
    attempts: 0,
    startedAt: null,
    completedAt: null,
    parentJobId: null,
    planConceptName: null,
    planSummary: null,
    layoutWidth: null,
    layoutHeight: null,
    layoutUnit: null,
    layoutZones: null,
    layoutAdjacencyRules: null,
    fitoutMinVnd: null,
    fitoutMaxVnd: null,
    equipmentMinVnd: null,
    equipmentMaxVnd: null,
    contingencyPercent: null,
    costNotes: null,
    customerFlow: null,
    recommendations: null,
    riskNotes: null,
    imageView: null,
    imagePrompt: null,
    imageAspectRatio: null,
    imageNegativePrompt: null,
    imageReferenceUrls: null,
    imageArtifactUrl: null,
    seatCapacityRecommendation: null,
  };
}

const baseTime = Date.parse("2026-07-02T15:00:00Z");
const MOCK_RECS: AiRecommendation[] = [
  ...RAW_RECOMMENDATIONS.map(normalize),
  ...PADDED_IDS_AND_STATES.map((row, i) =>
    buildPaddedRec(row.id, row.state, new Date(baseTime - i * 30 * 60_000)),
  ),
  normalize(LEGACY_ROW),
].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

const MOCK_BRIEF: DesignBrief = {
  id: 1,
  projectId: 1042,
  targetCustomer:
    "Office workers and tourists in District 1 seeking a quiet third-wave coffee experience between meetings.",
  style: "Industrial pha Scandinavian",
  mood: "Warm and inviting morning atmosphere",
  seatCount: 60,
  timeline: "Target opening Q4 2026, fit-out 12 weeks",
  brandNote:
    "Single-origin focus, slow service, considered food pairing with Vietnamese roasters.",
  businessModel:
    "Specialty espresso bar with light bites and a small retail shelf for beans/merch.",
  businessGoals:
    "Build a recognisable local brand in 12 months and reach break-even by month 18.",
  operationNote:
    "Single-shift opening, two-shift from month 6. Owner-operator plus two baristas on peak.",
  createdAt: new Date("2026-04-12T09:30:00Z"),
  updatedAt: new Date("2026-07-03T14:41:08.000Z"),
  aiRecommendations: MOCK_RECS,
};

export function useDesignBrief(projectId: string): DesignBrief {
  return React.useMemo(() => {
    const loader = OVERRIDE ?? (() => MOCK_BRIEF);
    return loader(projectId);
  }, [projectId]);
}
