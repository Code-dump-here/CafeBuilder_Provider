/**
 * Mock data for the construction log tab.
 *
 * Each entry corresponds to a single day on-site and captures the
 * pieces the brief calls out: progress %, work status, on-site images,
 * manpower, weather, and the open issues filed that day.
 *
 * When the construction-log backend ships, replace `MOCK_CONSTRUCTION_LOG`
 * with a `useConstructionLog(projectId)` hook and keep the shape below.
 */

export type ConstructionLogStatus =
  | "onTrack"
  | "minorDelay"
  | "blocked"
  | "completed";

export interface ConstructionLogPhoto {
  id: string;
  /** Visual placeholder label rendered as a colored block. */
  caption: string;
  /** Tonal accent so the placeholder blocks read as different shots. */
  tone: "amber" | "blue" | "emerald" | "rose" | "violet" | "slate";
}

export interface ConstructionLogEntry {
  id: string;
  /** ISO date — the day this entry was logged. */
  date: string;
  /** Headline summary line shown at the top of the entry card. */
  title: string;
  /** Free-form work performed. Newline-separated bullet points. */
  workPerformed: string[];
  /** Site status at end of day. */
  status: ConstructionLogStatus;
  /** Progress delta in percentage points added on this day. */
  progressDelta: number;
  /** Cumulative progress percent (0..100) AFTER this day's update. */
  cumulativeProgress: number;
  /** Manpower headcount on-site for the day. */
  workersOnSite: number;
  /** Weather condition shorthand. */
  weather: "sunny" | "cloudy" | "rainy" | "stormy";
  /** Optional set of photos uploaded with the entry. */
  photos: ConstructionLogPhoto[];
  /** Issues filed on the same day (cross-link target). */
  issueIds: string[];
  /** Author of the log entry. */
  loggedBy: string;
}

export interface ConstructionLogStats {
  /** Project-wide progress percent (latest entry's cumulative value). */
  currentProgress: number;
  /** Number of days with at least one entry. */
  daysActive: number;
  /** Total photos uploaded across all entries. */
  totalPhotos: number;
  /** Count of days where status is `blocked` or `minorDelay`. */
  blockerDays: number;
}

export interface ConstructionLogData {
  projectId: string;
  stats: ConstructionLogStats;
  entries: ConstructionLogEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock project id is stable so the page can derive a default if needed.
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PROJECT_ID = "p-001";

const TONE_PALETTE = [
  "amber",
  "blue",
  "emerald",
  "rose",
  "violet",
  "slate",
] as const satisfies ReadonlyArray<ConstructionLogPhoto["tone"]>;

// Helper: ISO date `n` days before today.
function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8, 30, 0, 0);
  return d.toISOString();
}

// Build N mock photo placeholders, rotating through the tone palette.
function photos(...captions: string[]): ConstructionLogPhoto[] {
  return captions.map((caption, idx) => ({
    id: `${caption.toLowerCase().replace(/\s+/g, "-")}-${idx}`,
    caption,
    tone: TONE_PALETTE[idx % TONE_PALETTE.length],
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data — 7 entries across the past week, progressing from 56% → 68%.
// Designed to surface every status at least once and a "blocked" day.
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_CONSTRUCTION_LOG: ConstructionLogData = {
  projectId: MOCK_PROJECT_ID,
  stats: {
    currentProgress: 68,
    daysActive: 7,
    totalPhotos: 19,
    blockerDays: 2,
  },
  entries: [
    {
      id: "cl-7",
      date: daysAgoIso(0),
      title: "Conduit run complete on north ceiling",
      workPerformed: [
        "Finished conduit for ceiling fixtures — 14 runs total",
        "Cleared staging area for the interior team's bench delivery",
        "Final punch-walk scheduled with designer for Friday",
      ],
      status: "onTrack",
      progressDelta: 4,
      cumulativeProgress: 68,
      workersOnSite: 7,
      weather: "sunny",
      photos: photos("Conduit runs", "Staging cleared", "Punch list"),
      issueIds: [],
      loggedBy: "Hung",
    },
    {
      id: "cl-6",
      date: daysAgoIso(1),
      title: "Bar counter plumbing roughed in",
      workPerformed: [
        "Stub-out for sink + ice bin lines installed",
        "Pressure test passed at 80 psi for 30 min",
        "Awaiting designer sign-off on slope before closing wall",
      ],
      status: "minorDelay",
      progressDelta: 3,
      cumulativeProgress: 64,
      workersOnSite: 6,
      weather: "cloudy",
      photos: photos("Stub-out lines", "Pressure gauge"),
      issueIds: ["i-1"],
      loggedBy: "Dat",
    },
    {
      id: "cl-5",
      date: daysAgoIso(2),
      title: "Slab pour delayed — rebar delivery missing 4 pieces",
      workPerformed: [
        "Crew shifted to finishing work on the east wall while waiting",
        "Coordinate with supplier for rebar re-delivery tomorrow AM",
        "Documented delay with photo log",
      ],
      status: "blocked",
      progressDelta: 0,
      cumulativeProgress: 61,
      workersOnSite: 5,
      weather: "rainy",
      photos: photos("East wall progress", "Empty rebar staging"),
      issueIds: ["i-3"],
      loggedBy: "Hung",
    },
    {
      id: "cl-4",
      date: daysAgoIso(3),
      title: "Electrical panel upgraded to 200A",
      workPerformed: [
        "Old 100A panel decommissioned and removed",
        "New 200A panel mounted and bonded",
        "Inspector signed off on the new service",
      ],
      status: "onTrack",
      progressDelta: 5,
      cumulativeProgress: 61,
      workersOnSite: 6,
      weather: "cloudy",
      photos: photos("New panel mounted", "Bonding", "Inspector tag"),
      issueIds: [],
      loggedBy: "Khoi",
    },
    {
      id: "cl-3",
      date: daysAgoIso(4),
      title: "Drywall hung on north and east walls",
      workPerformed: [
        "Framing inspected before closing",
        "Drywall screwed + taped — mudding to follow",
        "Coordinated with electrician to leave access panels",
      ],
      status: "onTrack",
      progressDelta: 4,
      cumulativeProgress: 56,
      workersOnSite: 7,
      weather: "sunny",
      photos: photos("North wall", "East wall", "Access panel"),
      issueIds: [],
      loggedBy: "Khoi",
    },
    {
      id: "cl-2",
      date: daysAgoIso(5),
      title: "HVAC ductwork routed above ceiling",
      workPerformed: [
        "Primary trunk lines installed in 3 zones",
        "Branch drops marked for diffuser locations",
        "Will return after ceiling close for final connections",
      ],
      status: "onTrack",
      progressDelta: 3,
      cumulativeProgress: 52,
      workersOnSite: 5,
      weather: "sunny",
      photos: photos("Duct trunk", "Branch drops"),
      issueIds: [],
      loggedBy: "Dat",
    },
    {
      id: "cl-1",
      date: daysAgoIso(6),
      title: "Site mobilization + material staging",
      workPerformed: [
        "Site office + storage container placed",
        "Materials delivery accepted and counted",
        "Safety briefing completed with all workers",
      ],
      status: "onTrack",
      progressDelta: 2,
      cumulativeProgress: 49,
      workersOnSite: 8,
      weather: "sunny",
      photos: photos("Site office", "Material staging"),
      issueIds: [],
      loggedBy: "Hung",
    },
  ],
};