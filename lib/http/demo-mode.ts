/**
 * Demo mode — the app rendered with plausible data and no backend.
 *
 * Most screens in this app are behind a session *and* a project, and the data
 * is gated server-side too. That makes "just look at the contracts page" cost
 * a login, a seeded project, and an engagement in exactly the right state —
 * and if any of that is missing you get an error card, which tells you nothing
 * about the design.
 *
 * So in development, when nobody is signed in, requests are answered from
 * fixtures instead of the network. Every screen renders something. Nothing is
 * mocked away in a real session: the moment a genuine token exists, this stops
 * intercepting entirely.
 *
 * ── How it decides ─────────────────────────────────────────────────────────
 * A sentinel token (`DEMO_TOKEN`) rather than "is the token empty". Emptiness
 * cannot work as the switch: the first thing demo mode has to do is *give* the
 * app a token, because most queries are gated on `hasAccessToken` and would
 * otherwise never fire at all. With a sentinel, signing in for real overwrites
 * it and demo mode is off by construction.
 *
 * ── What it answers ────────────────────────────────────────────────────────
 * Named fixtures for the endpoints the design-heavy screens read, and a valid
 * *empty* response for everything else. That second half is the point: an
 * unmatched endpoint yields a well-formed empty list, so the screen shows its
 * empty state — a designed state worth looking at — instead of an error.
 *
 * Writes (POST/PUT/PATCH/DELETE) are accepted and do nothing. A dialog can be
 * submitted to see its success path without a server.
 *
 * Development only, twice over: `DEMO_ENABLED` is false in a production build,
 * and the module is only installed from the client entry.
 */
import type {
  AxiosAdapter,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

import { tokenStore } from "@/features/auth/token-store";

/** Obviously not a JWT, so it can never be mistaken for one in a log. */
export const DEMO_TOKEN = "demo-mode-no-backend";

export const DEMO_ENABLED = process.env.NODE_ENV !== "production";

/** True when this page load is being served from fixtures. */
export function isDemoActive(): boolean {
  return DEMO_ENABLED && tokenStore.getAccessToken() === DEMO_TOKEN;
}

// ─── Fixture data ───────────────────────────────────────────────────────────
//
// Figures are realistic rather than round: a café fit-out is tens to hundreds
// of millions of dong, and a design that only ever renders 1,000,000 hides the
// column-width problems that real numbers cause.

const NOW = "2026-09-01T09:00:00Z";
const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKING_ID = "22222222-2222-4222-8222-222222222222";

const DEMO_ACCOUNT = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo@provider.test",
  phone: "0900 000 000",
  role: "provider",
  status: "active",
  emailVerifiedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
  shopOwner: null,
  serviceProvider: {
    id: "00000000-0000-4000-8000-000000000002",
    displayName: "Xưởng Mộc Bình Minh",
    capability: "both",
    bio: "Design-and-build studio working on cafés across Ho Chi Minh City.",
    yearsExperience: 8,
    createdAt: NOW,
    updatedAt: NOW,
  },
};

function page<T>(items: T[]) {
  return {
    items,
    totalItems: items.length,
    pageNumber: 1,
    pageSize: 20,
    totalPages: 1,
  };
}

const CONTRACTS = page([
  {
    id: "c1", projectWorkingId: WORKING_ID, title: "Design & build — Ground floor fit-out",
    status: "confirmed", agreedValue: 289_000_000, terms: "Payment in four instalments against milestones.",
    confirmedAt: NOW, createdAt: NOW, updatedAt: NOW, documentUrl: null,
  },
  {
    id: "c2", projectWorkingId: WORKING_ID, title: "Variation — mezzanine seating",
    status: "pending_otp", agreedValue: 46_500_000, terms: null,
    confirmedAt: null, otpExpiresAt: "2026-09-02T09:00:00Z", createdAt: NOW, updatedAt: NOW, documentUrl: null,
  },
  {
    id: "c3", projectWorkingId: WORKING_ID, title: "Superseded draft",
    status: "cancelled", agreedValue: null, terms: null,
    confirmedAt: null, createdAt: NOW, updatedAt: NOW, documentUrl: null,
  },
]);

const DESIGNS = page([
  { id: "d1", projectWorkingId: WORKING_ID, name: "Ground floor plan", version: 3.0,
    status: "approved", reason: null, createdAt: NOW, updatedAt: NOW, images: [], attachments: [] },
  { id: "d2", projectWorkingId: WORKING_ID, name: "Bar elevation", version: 2.0,
    status: "revision", reason: "Move the till point away from the service door.",
    createdAt: NOW, updatedAt: NOW, images: [], attachments: [] },
  { id: "d3", projectWorkingId: WORKING_ID, name: "Lighting layout", version: 1.0,
    status: "submitted", reason: null, createdAt: NOW, updatedAt: NOW, images: [], attachments: [] },
  { id: "d4", projectWorkingId: WORKING_ID, name: "Signage concepts", version: 0.2,
    status: "in_progress", reason: null, createdAt: NOW, updatedAt: NOW, images: [], attachments: [] },
]);

const CONSTRUCTION_ITEMS = page([
  // `parentId: null` marks a top-level phase. The milestones board filters on
  // it, so omitting the field entirely leaves the board empty — `undefined`
  // does not equal `null`.
  { id: "m1", projectWorkingId: WORKING_ID, parentId: null, name: "Demolition & site prep",
    description: "Strip out the previous tenant's fit-out and make good.",
    category: "site-prep", sortOrder: 1, status: "completed",
    startAt: "2026-03-02", estimateAt: "2026-03-12", isPaid: true,
    createdAt: NOW, updatedAt: NOW },
  { id: "m2", projectWorkingId: WORKING_ID, parentId: null, name: "Bar carcass & plumbing",
    description: "Build the bar run and take services to it.",
    category: "joinery", sortOrder: 2, status: "in_progress",
    startAt: "2026-03-13", estimateAt: "2026-03-26", isPaid: false,
    createdAt: NOW, updatedAt: NOW },
  { id: "m3", projectWorkingId: WORKING_ID, parentId: null, name: "Electrical first fix",
    description: null, category: "mep", sortOrder: 3, status: "pending",
    startAt: "2026-03-27", estimateAt: "2026-04-02", isPaid: false,
    createdAt: NOW, updatedAt: NOW },
  { id: "m4", projectWorkingId: WORKING_ID, parentId: null, name: "Joinery & finishes",
    description: null, category: "finishing", sortOrder: 4, status: "pending",
    startAt: "2026-04-03", estimateAt: "2026-04-18", isPaid: false,
    createdAt: NOW, updatedAt: NOW },
]);

/**
 * The engagement — the record that unlocks most of the app.
 *
 * Contracts, designs and milestones all hang off an accepted engagement, so
 * without this every one of those screens correctly shows "no engagement
 * found". It is the single most load-bearing fixture here.
 */
const ENGAGEMENTS = page([
  {
    id: WORKING_ID,
    projectShopOwnerId: PROJECT_ID,
    projectName: "Nhà Nâu Coffee — Quận 1",
    serviceProviderProfileId: "00000000-0000-4000-8000-000000000002",
    providerDisplayName: "Xưởng Mộc Bình Minh",
    applyId: null,
    contractType: "both",
    status: "accepted",
    requestMessage: null,
    startedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    hasConfirmedContract: true,
    completionRequestedAt: null,
    completionRequestNote: null,
    isAwaitingAcceptance: false,
    terminationRequestedAt: null,
    terminationRequestedBy: null,
    terminationRequestNote: null,
    providerType: "constructor",
    capability: "both",
    isVerified: true,
    avgRating: 4.6,
  },
]);

const ISSUE_TYPES = page([
  { id: "t1", code: "finish", name: "Finish defect" },
  { id: "t2", code: "mep", name: "MEP clash" },
  { id: "t3", code: "dimension", name: "Dimension mismatch" },
]);

/** One issue per lifecycle state, so all four status tones are on screen. */
const ISSUES = page([
  {
    id: "i1", projectWorkingId: WORKING_ID, constructionItemId: "m2",
    issueTypeId: "t2", issueTypeName: "MEP clash",
    cause: "Waste pipe runs through the bar carcass return.",
    reason: null, solution: null,
    issueImage: null, confirmImage: null,
    estimateAt: "2026-04-04", actualAt: null,
    status: "open", createdBy: "Site lead", createdAt: NOW, updatedAt: NOW,
  },
  {
    id: "i2", projectWorkingId: WORKING_ID, constructionItemId: "m2",
    issueTypeId: "t3", issueTypeName: "Dimension mismatch",
    cause: "Counter is 40mm over the drawn length; end panel will not seat.",
    reason: null, solution: "Trim the end panel on site.",
    issueImage: null, confirmImage: null,
    estimateAt: "2026-03-30", actualAt: null,
    status: "in_progress", createdBy: "Site lead", createdAt: NOW, updatedAt: NOW,
  },
  {
    id: "i3", projectWorkingId: WORKING_ID, constructionItemId: "m1",
    issueTypeId: "t1", issueTypeName: "Finish defect",
    cause: "Skim coat blown on the north wall.",
    reason: null, solution: "Cut out and re-skim.",
    issueImage: null, confirmImage: null,
    estimateAt: "2026-03-18", actualAt: "2026-03-19",
    status: "resolved", createdBy: "Site lead", createdAt: NOW, updatedAt: NOW,
  },
  {
    id: "i4", projectWorkingId: WORKING_ID, constructionItemId: "m1",
    issueTypeId: "t1", issueTypeName: "Finish defect",
    cause: "Threshold strip missing at the entrance.",
    reason: null, solution: "Fitted and signed off.",
    issueImage: null, confirmImage: null,
    estimateAt: "2026-03-14", actualAt: "2026-03-14",
    status: "closed", createdBy: "Site lead", createdAt: NOW, updatedAt: NOW,
  },
]);

const PROJECT = {
  id: PROJECT_ID,
  name: "Nhà Nâu Coffee — Quận 1",
  address: "123 Nguyễn Huệ, Quận 1, Hồ Chí Minh",
  areaM2: 86.5,
  budget: 420_000_000,
  status: "in_progress",
  latitude: null,
  longitude: null,
  createdAt: NOW,
  updatedAt: NOW,
  /**
   * The second load-bearing field, alongside the engagement list.
   *
   * Several screens gate on `project.providers` rather than on
   * /api/project-workings — the issues page, for one, looks here for an
   * accepted `construction` or `both` engagement belonging to the viewer, and
   * shows "no construction engagement" without it. `providerId` therefore has
   * to match the demo account's serviceProvider id exactly.
   */
  providers: [
    {
      projectWorkingId: WORKING_ID,
      serviceProviderProfileId: "00000000-0000-4000-8000-000000000002",
      displayName: "Xưởng Mộc Bình Minh",
      providerType: "constructor",
      capability: "both",
      isVerified: true,
      avgRating: 4.6,
      contractType: "both",
      status: "accepted",
      createdAt: NOW,
    },
    {
      projectWorkingId: "33333333-3333-4333-8333-333333333333",
      serviceProviderProfileId: "00000000-0000-4000-8000-000000000003",
      displayName: "Studio Lá",
      providerType: "designer",
      capability: "design",
      isVerified: false,
      avgRating: 4.2,
      contractType: "design",
      status: "requested",
      createdAt: NOW,
    },
  ],
};

/** Endpoint → fixture. Matched in order; the first hit wins. */
/**
 * Ratings on the demo provider.
 *
 * Deliberately uneven: one review carries a reply and a full set of scores,
 * one has a comment but no reply, one is a bare rating with no comment at all.
 * A card is mostly conditional blocks, so fixtures where every field is
 * populated prove only that the happy path renders.
 */
const REVIEWS = {
  items: [
    {
      id: "00000000-0000-4000-8000-00000000ra01",
      projectWorkingId: "00000000-0000-4000-8000-000000000010",
      projectShopOwnerId: "11111111-1111-4111-8111-111111111111",
      serviceProviderProfileId: "00000000-0000-4000-8000-000000000002",
      overallRating: 5,
      comment:
        "Bar run came out exactly as drawn and the site was clean every evening. Handover pack arrived the same week.",
      scores: [
        { id: "s1", dimension: "progress", score: 5 },
        { id: "s2", dimension: "quality", score: 5 },
        { id: "s3", dimension: "communication", score: 4 },
        { id: "s4", dimension: "cost", score: 5 },
      ],
      providerReply:
        "Thank you — it was a straightforward brief and the deposit cleared on time, which kept the joinery slot.",
      repliedAt: "2026-08-02T09:15:00Z",
      images: [],
      createdAt: "2026-07-28T11:00:00Z",
      updatedAt: "2026-08-02T09:15:00Z",
    },
    {
      id: "00000000-0000-4000-8000-00000000ra02",
      projectWorkingId: "00000000-0000-4000-8000-000000000010",
      projectShopOwnerId: "11111111-1111-4111-8111-111111111111",
      serviceProviderProfileId: "00000000-0000-4000-8000-000000000002",
      overallRating: 4,
      comment: "Good work overall. Electrical first fix slipped about a week.",
      scores: [
        { id: "s5", dimension: "progress", score: 3 },
        { id: "s6", dimension: "quality", score: 5 },
      ],
      providerReply: null,
      repliedAt: null,
      images: [],
      createdAt: "2026-06-14T08:30:00Z",
      updatedAt: "2026-06-14T08:30:00Z",
    },
    {
      id: "00000000-0000-4000-8000-00000000ra03",
      projectWorkingId: "00000000-0000-4000-8000-000000000010",
      projectShopOwnerId: "11111111-1111-4111-8111-111111111111",
      serviceProviderProfileId: "00000000-0000-4000-8000-000000000002",
      overallRating: 3,
      comment: null,
      scores: [],
      providerReply: null,
      repliedAt: null,
      images: [],
      createdAt: "2026-05-03T16:45:00Z",
      updatedAt: "2026-05-03T16:45:00Z",
    },
  ],
  pageNumber: 1,
  pageSize: 10,
  totalItems: 3,
  totalPages: 1,
  hasPrevious: false,
  hasNext: false,
};

/** Matches REVIEWS above — 5 + 4 + 3 over three reviews. */
const REVIEW_SUMMARY = {
  serviceProviderProfileId: "00000000-0000-4000-8000-000000000002",
  reviewCount: 3,
  averageRating: 4,
  dimensionAverages: {
    progress: 4,
    quality: 5,
    communication: 4,
    cost: 5,
  },
};

const ROUTES: Array<[RegExp, unknown]> = [
  [/\/api\/auth\/me$/, DEMO_ACCOUNT],
  [/\/api\/project-workings/, ENGAGEMENTS],
  [/\/api\/contracts/, CONTRACTS],
  [/\/api\/designs/, DESIGNS],
  [/\/api\/construction-items/, CONSTRUCTION_ITEMS],
  [/\/api\/issue-types/, ISSUE_TYPES],
  [/\/api\/issues/, ISSUES],
  [/\/api\/project-shop-owners\/[^/?]+/, PROJECT],
  [/\/api\/reviews\/providers\/[^/?]+\/summary/, REVIEW_SUMMARY],
  [/\/api\/reviews/, REVIEWS],
  [/\/api\/notifications\/unread-count/, { count: 2 }],
];

/**
 * A valid empty answer for anything not named above.
 *
 * Shape is guessed from the path: a plural collection gets a page envelope, a
 * single resource gets null. Being wrong here is cheap — the screen shows an
 * empty state — whereas throwing would put back the error card this exists to
 * remove.
 */
function emptyFor(url: string): unknown {
  if (/count$/.test(url)) return { count: 0 };
  return page([]);
}

// ─── Installation ───────────────────────────────────────────────────────────

/**
 * Wrap the axios adapter so fixture responses never reach the network.
 *
 * The adapter rather than an interceptor because a request interceptor cannot
 * *answer* a request — it can only reject, which every caller would then see
 * as a failure.
 */
export function installDemoMode(api: AxiosInstance): void {
  if (!DEMO_ENABLED || typeof window === "undefined") return;

  // Give the app a session so the `hasAccessToken` gates open. Only when
  // nothing is stored — a real token is never overwritten.
  if (!tokenStore.hasAccessToken()) {
    tokenStore.setAccessToken(DEMO_TOKEN);
  }

  const original = api.defaults.adapter;

  const demoAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    if (!isDemoActive()) {
      const fallback = original;
      if (typeof fallback === "function") return fallback(config);
      throw new Error("Demo mode: no underlying adapter to delegate to.");
    }

    const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
    const method = (config.method ?? "get").toLowerCase();

    let data: unknown;
    if (method === "get") {
      data = ROUTES.find(([pattern]) => pattern.test(url))?.[1] ?? emptyFor(url);
    } else {
      // Writes succeed and change nothing, so a dialog can be submitted and
      // its success path seen without a server behind it.
      data = { ok: true };
    }

    // A short delay on purpose: instant responses hide every loading state,
    // and those are exactly what needs looking at during a restyle.
    await new Promise((resolve) => setTimeout(resolve, 180));

    return {
      data,
      status: 200,
      statusText: "OK (demo)",
      headers: {},
      config,
    } as AxiosResponse;
  };

  api.defaults.adapter = demoAdapter;
}
