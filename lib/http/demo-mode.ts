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
import {
  BAR_ELEVATION,
  BAR_SECTION,
  GROUND_FLOOR_PLAN,
  LIGHTING_LAYOUT,
  SIGNAGE_SKETCH,
} from "@/lib/http/demo-drawings";

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
// Other projects: an invitation and a finished job on My Projects, and two
// marketplace briefs still collecting bids — one the demo provider has not
// bid on (to show applying) and one with its bid already in.
const INVITED_PROJECT_ID = "44444444-4444-4444-8444-444444444444";
const DONE_PROJECT_ID = "55555555-5555-4555-8555-555555555555";
const BAKERY_PROJECT_ID = "88888888-8888-4888-8888-888888888888";
const GOC_SAN_PROJECT_ID = "99999999-9999-4999-8999-999999999999";

/**
 * Who the demo is signed in as, from `localStorage["demo.persona"]`, read once
 * per page load. It exists so every role's screens can be shown — the user
 * manual needs a designer's sidebar, a contractor's and a design-and-build
 * provider's, a signed-out visitor and a brand-new account:
 *
 * - `both` (default) — design-and-build provider on a design + build job
 * - `designer` / `contractor` — single-capability provider and job
 * - `guest` — no session, so login and sign-up render as for a visitor
 * - `onboarding` — signed in, profile not created yet (sent to onboarding)
 * - `admin` — platform administrator, the only persona `AdminGuard` lets into
 *   the `/admin` console
 */
type DemoPersona = "both" | "designer" | "contractor" | "guest" | "onboarding" | "admin";

const PERSONA: DemoPersona = (() => {
  if (typeof window === "undefined") return "both";
  try {
    const value = window.localStorage.getItem("demo.persona");
    const known: DemoPersona[] = ["both", "designer", "contractor", "guest", "onboarding", "admin"];
    return known.includes(value as DemoPersona) ? (value as DemoPersona) : "both";
  } catch {
    return "both";
  }
})();

/**
 * How far the Nhà Nâu job has got, from `localStorage["demo.stage"]`:
 * `signed` (default) has a confirmed contract; `unsigned` is the moment after
 * the quotation was approved and before a contract exists, so creating a
 * contract can be shown.
 */
const STAGE: "signed" | "unsigned" = (() => {
  if (typeof window === "undefined") return "signed";
  try {
    return window.localStorage.getItem("demo.stage") === "unsigned" ? "unsigned" : "signed";
  } catch {
    return "signed";
  }
})();

const CAPABILITY =
  PERSONA === "designer" ? "designer" : PERSONA === "contractor" ? "constructor" : "both";
const CONTRACT_TYPE =
  PERSONA === "designer" ? "design" : PERSONA === "contractor" ? "construction" : "both";

const DEMO_ACCOUNT = {
  id: "00000000-0000-4000-8000-000000000001",
  email: PERSONA === "admin" ? "quantri@smartcafebuilder.vn" : "lienhe@xuongmocbinhminh.vn",
  phone: "0908 123 456",
  // `AdminGuard` reads this: anything but "admin" is bounced out of /admin.
  role: PERSONA === "admin" ? "admin" : "provider",
  status: "active",
  emailVerifiedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
  shopOwner: null,
  serviceProvider: PERSONA === "onboarding" || PERSONA === "admin" ? null : {
    id: "00000000-0000-4000-8000-000000000002",
    displayName: "Xưởng Mộc Bình Minh",
    capability: CAPABILITY,
    // Matches the review summary, so the profile header and the Brand tab
    // show the same rating.
    avgRating: 4,
    reviewCount: 3,
    isVerified: true,
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

// Shaped like the current Design type: `title`, a string `version`, `type`,
// `changeSummary` and `revisionCount`. The older fixture still used `name` and
// a numeric version, from before the API changed, so the detail page never
// resolved a design and sat on "Loading design…".
// Drawings per design, so the design detail viewer has something to show.
const DESIGN_IMAGES: Record<string, [string, string][]> = {
  d1: [["Ground floor plan", GROUND_FLOOR_PLAN]],
  d2: [["Bar elevation — front", BAR_ELEVATION], ["Bar counter — section A–A", BAR_SECTION]],
  d3: [["Lighting layout", LIGHTING_LAYOUT]],
  d4: [["Signage — concept B", SIGNAGE_SKETCH]],
};

const DESIGN_ROWS = [
  { id: "d1", title: "Ground floor plan", version: "3.0", type: "layout_2d", status: "approved",
    reason: null, changeSummary: "Moved the bar run to the north wall.", revisionCount: 2 },
  { id: "d2", title: "Bar elevation", version: "2.0", type: "technical_drawing", status: "revision",
    reason: "Move the till point away from the service door.", changeSummary: null, revisionCount: 1 },
  { id: "d3", title: "Lighting layout", version: "1.0", type: "technical_drawing", status: "submitted",
    reason: null, changeSummary: "First issue for review.", revisionCount: 0 },
  { id: "d4", title: "Signage concepts", version: "0.2", type: "concept", status: "in_progress",
    reason: null, changeSummary: null, revisionCount: 0 },
].map((d) => ({
  ...d, projectWorkingId: WORKING_ID, createdBy: "00000000-0000-4000-8000-000000000001",
  createdAt: NOW, updatedAt: NOW,
  images: (DESIGN_IMAGES[d.id] ?? []).map(([caption, viewUrl], i) => ({
    id: `${d.id}-img${i + 1}`, designId: d.id, imageUrl: `demo/${d.id}/${i + 1}.svg`,
    viewUrl, caption, uploadedBy: "00000000-0000-4000-8000-000000000001", createdAt: NOW,
  })),
}));

const DESIGNS = page(DESIGN_ROWS);

// `/api/designs/{id}` answers with that design, `/api/designs/{id}/versions`
// with an empty snapshot history, and the list URL with the page.
const designs = (url: string) => {
  const match = url.match(/\/api\/designs\/([^/?]+)(\/versions)?/);
  if (!match) return DESIGNS;
  if (match[2]) return page([]);
  return DESIGN_ROWS.find((d) => d.id === match[1]) ?? null;
};

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
    contractType: CONTRACT_TYPE,
    status: "accepted",
    requestMessage: null,
    startedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    hasConfirmedContract: STAGE === "signed",
    completionRequestedAt: null,
    completionRequestNote: null,
    isAwaitingAcceptance: false,
    terminationRequestedAt: null,
    terminationRequestedBy: null,
    terminationRequestNote: null,
    providerType: "constructor",
    capability: CAPABILITY,
    isVerified: true,
    avgRating: 4.6,
  },
]);

// A plain array: GET /api/issue-types is not paged, and the report-issue
// dialog maps over it — a page envelope crashed the dialog.
const ISSUE_TYPES = ([
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
  owner: { id: "owner-1", fullName: "Trần Minh Anh", shopName: "Nhà Nâu Coffee", phone: null },
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
      capability: CAPABILITY,
      isVerified: true,
      avgRating: 4.6,
      contractType: CONTRACT_TYPE,
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

// ─── Provider directory ────────────────────────────────────────────────────
// Three providers that differ on the axes the directory renders: capability,
// individual vs company, verified or not, rated or not yet rated. A directory
// of identical cards would only prove the grid lays out.
const PROVIDER_ROWS = [
  {
    id: "00000000-0000-4000-8000-000000000002",
    accountId: "00000000-0000-4000-8000-000000000001",
    displayName: "Xưởng Mộc Bình Minh",
    providerType: "company",
    capability: "both",
    bio: "Design-and-build studio working on cafés across Ho Chi Minh City.",
    companyTaxCode: "0312345678",
    yearsExperience: 8,
    portfolioHeadline: "Timber-forward cafés, from brief to handover",
    isVerified: true,
    avgRating: 4,
    reviewCount: 3,
    serviceAreas: [
      { province: "Hồ Chí Minh", district: "Quận 1" },
      { province: "Hồ Chí Minh", district: "Quận 3" },
    ],
    website: "https://binhminh.example",
    companyAddress: "123 Nguyễn Huệ, Quận 1, Hồ Chí Minh",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    accountId: "00000000-0000-4000-8000-000000000011",
    displayName: "Studio Lá Xanh",
    providerType: "individual",
    capability: "designer",
    bio: "Small-footprint interiors: kiosks, takeaway counters and 20-seat rooms.",
    companyTaxCode: null,
    yearsExperience: 3,
    portfolioHeadline: null,
    isVerified: false,
    avgRating: 0,
    reviewCount: 0,
    serviceAreas: [{ province: "Đà Nẵng", district: null }],
    website: null,
    companyAddress: null,
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    accountId: "00000000-0000-4000-8000-000000000012",
    displayName: "Công ty Xây dựng Nam Phát",
    providerType: "company",
    capability: "constructor",
    bio: "Fit-out contractor. Shopfronts, MEP and joinery with our own crews.",
    companyTaxCode: "0398765432",
    yearsExperience: 14,
    portfolioHeadline: "Fixed-price fit-outs, 6-10 week programmes",
    isVerified: true,
    avgRating: 4.6,
    reviewCount: 12,
    serviceAreas: [
      { province: "Hồ Chí Minh", district: null },
      { province: "Bình Dương", district: null },
    ],
    website: "https://namphat.example",
    companyAddress: "45 Lê Văn Việt, Thủ Đức, Hồ Chí Minh",
  },
];

const PROVIDERS = page(
  PROVIDER_ROWS.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    providerType: p.providerType,
    capability: p.capability,
    bio: p.bio,
    yearsExperience: p.yearsExperience,
    portfolioHeadline: p.portfolioHeadline,
    isVerified: p.isVerified,
    avgRating: p.avgRating,
    reviewCount: p.reviewCount,
    createdAt: NOW,
    coverImageViewUrl: null,
    serviceAreas: p.serviceAreas,
  })),
);

const providerFor = (url: string) =>
  PROVIDER_ROWS.find((p) => url.includes(p.id)) ?? PROVIDER_ROWS[0];

const providerDetail = (url: string) => {
  const p = providerFor(url);
  return {
    id: p.id,
    accountId: p.accountId,
    displayName: p.displayName,
    providerType: p.providerType,
    capability: p.capability,
    bio: p.bio,
    companyTaxCode: p.companyTaxCode,
    yearsExperience: p.yearsExperience,
    portfolioHeadline: p.portfolioHeadline,
    isVerified: p.isVerified,
    avgRating: p.reviewCount ? p.avgRating : null,
    createdAt: NOW,
    updatedAt: NOW,
    logoUrl: null,
    logoViewUrl: null,
    coverImageUrl: null,
    coverImageViewUrl: null,
    introVideoUrl: null,
    introVideoViewUrl: null,
  };
};

const providerBrand = (url: string) => {
  const p = providerFor(url);
  const company = p.providerType === "company";
  return {
    serviceProviderProfileId: p.id,
    displayName: p.displayName,
    logoUrl: null,
    logoViewUrl: null,
    coverImageUrl: null,
    coverImageViewUrl: null,
    introVideoUrl: null,
    introVideoViewUrl: null,
    website: p.website,
    brandStory: p.bio,
    companyAddress: p.companyAddress,
    companyLatitude: null,
    companyLongitude: null,
    foundedYear: company ? 2026 - p.yearsExperience : null,
    employeeCount: company ? 24 : null,
    yearsExperience: p.yearsExperience,
    isVerified: p.isVerified,
    avgRating: p.avgRating,
    reviewCount: p.reviewCount,
    socialLinks: p.website
      ? [{ id: "sl1", serviceProviderProfileId: p.id, platform: "facebook",
           url: "https://facebook.com/example", label: null, sortOrder: 0 }]
      : [],
    serviceAreas: p.serviceAreas.map((a, i) => ({
      id: "sa" + i,
      serviceProviderProfileId: p.id,
      province: a.province,
      district: a.district,
      note: null,
      sortOrder: i,
    })),
    // Verified, awaiting an admin, and expired: the three states a
    // certificate row has to render.
    certificates: company
      ? [
          { id: "ce1", serviceProviderProfileId: p.id, kind: "license",
            name: "Construction business licence", issuer: "Sở Xây dựng",
            certificateNo: "XD-2019-0412", issuedAt: "2019-04-12", expiresAt: "2029-04-12",
            fileUrl: null, fileViewUrl: null, isVerified: true, isExpired: false, sortOrder: 0 },
          { id: "ce2", serviceProviderProfileId: p.id, kind: "certificate",
            name: "Fire safety installation", issuer: "Cảnh sát PCCC",
            certificateNo: null, issuedAt: "2024-01-08", expiresAt: null,
            fileUrl: null, fileViewUrl: null, isVerified: false, isExpired: null, sortOrder: 1 },
          { id: "ce3", serviceProviderProfileId: p.id, kind: "award",
            name: "Best small commercial interior", issuer: "Vietnam Design Week",
            certificateNo: null, issuedAt: "2021-11-20", expiresAt: "2023-11-20",
            fileUrl: null, fileViewUrl: null, isVerified: true, isExpired: true, sortOrder: 2 },
        ]
      : [],
  };
};

const portfolios = (url: string) => {
  const p = providerFor(url);
  const item = (id: string, title: string, featured: boolean, extra: object) => ({
    id,
    serviceProviderProfileId: p.id,
    title,
    description: null,
    role: "both",
    style: null,
    location: null,
    areaM2: null,
    contractValue: null,
    completedAt: null,
    durationDays: null,
    videoUrl: null,
    videoViewUrl: null,
    coverImageUrl: null,
    coverImageViewUrl: null,
    isFeatured: featured,
    sortOrder: 0,
    createdAt: NOW,
    updatedAt: NOW,
    images: [],
    ...extra,
  });
  // The unrated individual has no portfolio yet, so the empty state shows too.
  if (p.id === PROVIDER_ROWS[1].id) return page([]);
  return page([
    item("pf1", "Nhà Nâu Coffee — Quận 1", true, {
      description: "Timber bar, terrazzo floor and a mezzanine for 18 seats.",
      style: "Warm industrial",
      location: "Quận 1, Hồ Chí Minh",
      areaM2: 86.5,
      contractValue: 420_000_000,
      completedAt: "2026-03-28",
      durationDays: 54,
    }),
    item("pf2", "Takeaway kiosk, Landmark 81", false, {
      role: "construction",
      location: "Bình Thạnh, Hồ Chí Minh",
      areaM2: 12,
      completedAt: "2025-10-02",
      durationDays: 19,
    }),
  ]);
};

// ─── Status-bearing records ───────────────────────────────────────────────
// One record per status, so every stamp tone on these screens can be seen
// without a backend: quotations run draft → superseded, payment batches due →
// confirmed, change orders pending / accepted / rejected.
// A believable breakdown for any total: the shares a café fit-out quote
// usually splits into, with the last line absorbing rounding so the items
// always add up to the quotation's total.
const QUOTE_LINES: [string, string, number, number][] = [
  ["Design development & drawings", "lot", 1, 0.12],
  ["Demolition & site preparation", "m²", 86.5, 0.08],
  ["Bar counter — carcass, oak veneer, stone top", "m", 6.4, 0.26],
  ["Plumbing & drainage to bar and WC", "lot", 1, 0.11],
  ["Electrical & lighting", "lot", 1, 0.15],
  ["Wall, floor & ceiling finishes", "m²", 86.5, 0.18],
  ["Loose furniture & signage allowance", "lot", 1, 0.10],
];

function quotationItems(total: number) {
  let used = 0;
  return QUOTE_LINES.map(([name, unit, quantity, share], i) => {
    const amount = i === QUOTE_LINES.length - 1
      ? total - used
      : Math.round((total * share) / 100_000) * 100_000;
    used += amount;
    return {
      id: `qi${i + 1}`, name, description: null, unit, quantity,
      unitPrice: Math.round(amount / quantity), amount, note: null, sortOrder: i + 1,
    };
  });
}

function quotationTerms(total: number) {
  return ([
    ["Deposit on signing", 30, "On contract signature"],
    ["Bar carcass & plumbing complete", 30, "After plumbing sign-off"],
    ["Electrical first fix signed off", 25, "After inspection"],
    ["Handover", 15, "On handover and snag list closed"],
  ] as const).map(([name, pct, condition], i) => ({
    id: `qt${i + 1}`, sortOrder: i + 1, name, percentage: pct,
    amount: Math.round((total * pct) / 100), condition,
  }));
}

const QUOTATION_ROWS = [
  ["q1", 4, "Design & build — revised after site survey", "accepted", 289_000_000],
  ["q2", 3, "Design & build — mezzanine option", "revision_requested", 312_500_000],
  ["q3", 2, "Design & build — first pricing", "superseded", 276_000_000],
  ["q4", 1, "Joinery package only", "rejected", 94_000_000],
  ["q5", 5, "Signage and exterior lighting", "sent", 38_400_000],
  ["q6", 6, "Terrace extension (draft)", "draft", 61_000_000],
].map(([id, version, title, status, total]) => ({
  id, applyId: null, projectWorkingId: WORKING_ID, version, title,
  note: null, totalAmount: total, estimatedDurationDays: 54,
  freeRevisionCount: 2, extraRevisionFee: 1_500_000, status,
  revisionReason: status === "revision_requested" ? "Split the mezzanine into its own instalment." : null,
  rejectReason: status === "rejected" ? "Going with a single design-and-build contract instead." : null,
  sentAt: status === "draft" ? null : NOW, respondedAt: null,
  lockedAt: status === "accepted" ? NOW : null, isLocked: status === "accepted",
  providerName: "Xưởng Mộc Bình Minh",
  serviceProviderProfileId: "00000000-0000-4000-8000-000000000002",
  providerAvgRating: 4, providerYearsExperience: 8, providerIsVerified: true,
  items: quotationItems(total as number), paymentTerms: quotationTerms(total as number),
  attachments: [], createdAt: NOW, updatedAt: NOW,
}));

// Scoped to what was asked for: the Nhà Nâu engagement has the quotation
// history, a bid (applyId) has none yet — so "create quotation" is open there.
const quotations = (url: string) => {
  const one = QUOTATION_ROWS.find((q) => url.includes("/api/quotations/" + q.id));
  if (one) return one;
  if (/applyId=/.test(url)) return page([]);
  return page(QUOTATION_ROWS);
};

const PAYMENT_BATCH_ROWS = [
  ["pb1", 1, "Deposit on signing", 30, 86_700_000, "confirmed"],
  ["pb2", 2, "Bar carcass & plumbing complete", 30, 86_700_000, "proof_submitted"],
  ["pb3", 3, "Electrical first fix signed off", 25, 72_250_000, "pending"],
  ["pb4", 4, "Handover", 15, 43_350_000, "rejected"],
].map(([id, order, name, pct, amount, status]) => ({
  id, contractId: "c1", constructionItemId: null, constructionItemName: null,
  changeOrderId: null, sortOrder: order, name, percentage: pct, amount,
  dueAt: "2026-10-01", status,
  proofSubmittedAt: status === "pending" ? null : NOW,
  confirmedAt: status === "confirmed" ? NOW : null, confirmedBy: null,
  rejectReason: status === "rejected" ? "Transfer reference doesn't match the amount." : null,
  note: null, paidAmount: status === "confirmed" ? amount : 0,
  // The confirmed and the submitted instalments carry the owner's transfer
  // record, so the proof trail and its reconciliation are visible.
  proofs: status === "confirmed" || status === "proof_submitted"
    ? [{
        id: `${id}-proof`, imageUrl: null, imageViewUrl: null, amount: null,
        transferredAt: status === "confirmed" ? "2026-09-02T10:15:00Z" : "2026-09-11T15:40:00Z",
        note: status === "confirmed" ? "Vietcombank · ref NNC-DEP-0902" : "Techcombank · ref NNC-BAR-0911",
        uploadedBy: null, createdAt: NOW,
      }]
    : [],
  createdAt: NOW, updatedAt: NOW,
}));

const paymentBatches = (url: string) =>
  PAYMENT_BATCH_ROWS.find((b) => url.includes("/api/payment-batches/" + b.id)) ?? page(PAYMENT_BATCH_ROWS);

const CHANGE_ORDER_ROWS = [
  ["co1", "scope_change", "Add a service hatch to the kitchen wall", 12_800_000, "accepted"],
  ["co2", "material_change", "Oak veneer instead of laminate on the bar front", 9_600_000, "pending"],
  ["co3", "extra_revision", "Third revision of the signage concept", 1_500_000, "rejected"],
].map(([id, kind, title, amount, status]) => ({
  id, projectWorkingId: WORKING_ID, designId: null, constructionItemId: null,
  constructionItemName: null, kind, title,
  reason: "Requested on site after the first-fix walkthrough.", amount,
  revisionNo: kind === "extra_revision" ? 3 : null, status,
  requestedByParty: "provider", createdBy: null, respondedBy: null,
  respondedAt: status === "pending" ? null : NOW,
  rejectReason: status === "rejected" ? "Covered by the free revisions in the quotation." : null,
  createdAt: NOW, updatedAt: NOW, paymentBatchId: null, paymentBatchStatus: null,
  needsPricing: false,
}));

const CHANGE_ORDER_SUMMARY = {
  projectWorkingId: WORKING_ID, contractValue: 289_000_000,
  acceptedAmount: 12_800_000, pendingAmount: 9_600_000, totalCommitted: 301_800_000,
  acceptedCount: 1, pendingCount: 1, rejectedCount: 1,
};

const changeOrders = (url: string) =>
  CHANGE_ORDER_ROWS.find((c) => url.includes("/api/change-orders/" + c.id)) ?? page(CHANGE_ORDER_ROWS);

// ─── Cost summaries ────────────────────────────────────────────────────────
// The construction-items route used to answer these too, so the overview's
// cost card got a page of milestones where it expected summaries, reached for
// `item.children` and took the whole screen down. Built from the same four
// milestones, with actuals only where work has happened.
const COST_ROWS = CONSTRUCTION_ITEMS.items.map((m, i) => {
  const estimated = [44_850_000, 89_700_000, 29_900_000, 134_550_000][i] ?? 0;
  const actual = m.status === "completed" ? estimated * 1.04 : m.status === "in_progress" ? estimated * 0.55 : null;
  return {
    constructionItemId: m.id, name: m.name, category: m.category, status: m.status,
    estimatedLaborCost: estimated * 0.4, actualLaborCost: actual === null ? null : actual * 0.4,
    estimatedMaterialCost: estimated * 0.6, actualMaterialCost: actual === null ? null : actual * 0.6,
    estimatedCost: estimated, actualCost: actual,
    childrenEstimatedCost: 0, childrenActualCost: null,
    totalEstimatedCost: estimated, totalActualCost: actual,
    variance: actual === null ? null : actual - estimated,
    missingActualMaterialLines: m.status === "in_progress" ? 2 : 0,
    missingActualLaborLines: m.status === "in_progress" ? 1 : 0,
    startAt: m.startAt, estimateAt: m.estimateAt,
    plannedDurationDays: 10, actualDurationDays: m.status === "completed" ? 11 : null,
    children: [],
  };
});

const ENGAGEMENT_COST_SUMMARY = (() => {
  const sum = (k: "totalEstimatedCost" | "estimatedLaborCost" | "estimatedMaterialCost") =>
    COST_ROWS.reduce((a, r) => a + (r[k] ?? 0), 0);
  const actual = COST_ROWS.reduce((a, r) => a + (r.totalActualCost ?? 0), 0);
  return {
    projectWorkingId: WORKING_ID,
    estimatedLaborCost: sum("estimatedLaborCost"), actualLaborCost: actual * 0.4,
    estimatedMaterialCost: sum("estimatedMaterialCost"), actualMaterialCost: actual * 0.6,
    totalEstimatedCost: sum("totalEstimatedCost"), totalActualCost: actual,
    variance: null, missingActualMaterialLines: 2, missingActualLaborLines: 1,
    rootItemCount: COST_ROWS.length,
    acceptedChangeOrderAmount: 12_800_000, pendingChangeOrderAmount: 9_600_000,
    totalEstimatedCostWithChangeOrders: sum("totalEstimatedCost") + 12_800_000,
    items: COST_ROWS,
  };
})();

const itemCostSummary = (url: string) =>
  COST_ROWS.find((r) => url.includes("/api/construction-items/" + r.constructionItemId + "/")) ?? COST_ROWS[0];

// ─── Marketplace briefs ───────────────────────────────────────────────────
// One per post status. Demo mode ignores the status filter, so the grid shows
// all three and the OPEN / CLOSED / CANCELLED stamps can be compared side by
// side.
const POSTS = page([
  ["p1", BAKERY_PROJECT_ID, "Bếp Mây Bakery & Coffee — Thủ Đức", "15 Võ Văn Ngân, Thủ Đức, Hồ Chí Minh",
   520_000_000, 110, "both", "Design and build a bakery-café with an open kitchen", "open", "2026-10-20",
   "Two-storey shophouse. Bakery counter and open kitchen downstairs, 30 seats upstairs. We want warm lighting and a lot of plants."],
  ["p2", GOC_SAN_PROJECT_ID, "Góc Sân Café — Đà Nẵng", "56 Bạch Đằng, Hải Châu, Đà Nẵng",
   650_000_000, 140, "construction", "Build-out of a two-floor café from approved drawings", "open", "2026-10-05",
   "Drawings are approved. We need a contractor to fit out both floors, including the terrace, within 10 weeks."],
  ["p3", INVITED_PROJECT_ID, "Trạm Trà — Hai Bà Trưng", "8 Lò Đúc, Hai Bà Trưng, Hà Nội",
   180_000_000, 42, "design", "Concept and layout for a tea counter with takeaway window", "closed", "2026-08-30",
   "A tea counter with a takeaway window. Pale wood and ceramic, very quiet."],
  ["p4", PROJECT_ID, "Nhà Nâu Coffee — Quận 1", "123 Nguyễn Huệ, Quận 1, Hồ Chí Minh",
   420_000_000, 86.5, "both", "Design and fit-out for an 18-seat espresso bar", "closed", "2026-08-15",
   "Espresso bar for office workers. Timber bar, terrazzo floor, 18 seats."],
].map(([id, projectShopOwnerId, projectName, projectAddress, projectBudget, projectAreaM2, serviceKind, title, status, deadline, description]) => ({
  id, projectShopOwnerId, projectName, projectAddress,
  projectBudget, projectAreaM2, serviceKind, title, description,
  status, submissionDeadline: deadline + "T00:00:00Z", createdAt: NOW, updatedAt: NOW,
})));

// Tasks per phase — their own endpoint, not child construction items. Without
// them every phase read "0/0 done · No tasks yet", which made the board look
// empty rather than showing what a real schedule carries.
const TASK_DATES = [
  ["2026-03-02", "2026-03-04"], ["2026-03-05", "2026-03-08"], ["2026-03-09", "2026-03-12"],
  ["2026-03-13", "2026-03-14"], ["2026-03-15", "2026-03-18"], ["2026-03-19", "2026-03-23"], ["2026-03-24", "2026-03-26"],
  ["2026-03-27", "2026-03-28"], ["2026-03-29", "2026-04-01"], ["2026-04-02", "2026-04-02"],
  ["2026-04-03", "2026-04-11"], ["2026-04-12", "2026-04-18"],
];

const CONSTRUCTION_TASK_ROWS = ([
  ["m1", "Strip out old counter and shelving", "completed", 2_400_000],
  ["m1", "Cap redundant water and waste", "completed", 1_800_000],
  ["m1", "Make good floor screed", "completed", 3_200_000],
  ["m2", "Set out bar run to drawing A-101", "completed", 900_000],
  ["m2", "Build bar carcass frame", "completed", 6_500_000],
  ["m2", "Run water and waste to bar sink", "in_progress", 4_200_000],
  ["m2", "Pressure test and sign off plumbing", "pending", 1_100_000],
  ["m3", "Chase walls for new circuits", "pending", 2_000_000],
  ["m3", "First fix lighting and sockets", "pending", 5_400_000],
  ["m3", "Inspection before plastering", "pending", 600_000],
  ["m4", "Oak veneer bar front", "pending", 7_800_000],
  ["m4", "Paint and feature wall", "pending", 4_900_000],
] as const).map(([constructionItemId, name, status, labor], i) => ({
  id: `t${i + 1}`, constructionItemId, name, description: null,
  imageUrl: null, imageViewUrl: null,
  // Spread through each phase's window, so tasks show real dates.
  startAt: TASK_DATES[i][0], estimateAt: TASK_DATES[i][1],
  actualStartAt: status === "pending" ? null : NOW,
  actualAt: status === "completed" ? NOW : null,
  plannedDurationDays: null, actualDurationDays: null,
  estimatedLaborCost: labor, actualLaborCost: status === "completed" ? labor : null,
  reason: null, status, createdBy: "demo", createdAt: NOW, updatedAt: NOW,
}));

const constructionTasks = (url: string) => {
  const item = /constructionItemId=([^&]+)/.exec(url)?.[1];
  return page(item ? CONSTRUCTION_TASK_ROWS.filter((task) => task.constructionItemId === item) : CONSTRUCTION_TASK_ROWS);
};

// The owner's brief, so the project overview shows what was asked for
// instead of "No brief yet".
const DESIGN_BRIEFS = page([{
  id: "b1", projectId: PROJECT_ID,
  targetCustomer: "Office workers from the surrounding towers, 25–40, weekday mornings and lunch",
  style: "Warm timber, exposed concrete, low pendant lighting",
  mood: "Calm and focused in the morning, social at lunch",
  seatCount: 18,
  timeline: "Open before the Tết season — handover by mid-December",
  brandNote: "Nhà Nâu: brown roast, hand-lettered signage, nothing glossy",
  businessModel: "Specialty espresso bar with takeaway window",
  businessGoals: "300 cups a day within six months; takeaway at least 40% of sales",
  operationNote: "Two baristas at peak; the bar must be reachable from the takeaway window",
  createdAt: NOW, updatedAt: NOW, aiRecommendations: [],
}]);


// ─── My Projects ───────────────────────────────────────────────────────────
// Three jobs in the three states the page shows — active, invited, finished —
// each on its own project with its own owner and brief, so a card can be
// judged on whether it tells one job from another.

const OTHER_PROJECTS: Record<string, typeof PROJECT> = {
  [INVITED_PROJECT_ID]: {
    ...PROJECT, id: INVITED_PROJECT_ID, name: "Trạm Trà — Hai Bà Trưng",
    address: "8 Lò Đúc, Hai Bà Trưng, Hà Nội", areaM2: 42, budget: 180_000_000,
    status: "open", providers: [],
    owner: { id: "owner-2", fullName: "Nguyễn Thu Hà", shopName: "Trạm Trà", phone: null },
  },
  [DONE_PROJECT_ID]: {
    ...PROJECT, id: DONE_PROJECT_ID, name: "Takeaway kiosk — Landmark 81",
    address: "720A Điện Biên Phủ, Bình Thạnh, Hồ Chí Minh", areaM2: 12, budget: 95_000_000,
    status: "completed", providers: [],
    owner: { id: "owner-3", fullName: "Lê Quốc Bảo", shopName: "Kiosk 81", phone: null },
  },
};

OTHER_PROJECTS[BAKERY_PROJECT_ID] = {
  ...PROJECT, id: BAKERY_PROJECT_ID, name: "Bếp Mây Bakery & Coffee — Thủ Đức",
  address: "15 Võ Văn Ngân, Thủ Đức, Hồ Chí Minh", areaM2: 110, budget: 520_000_000,
  status: "open", providers: [],
  owner: { id: "owner-4", fullName: "Phạm Gia Hân", shopName: "Bếp Mây", phone: null },
  openPosts: [{ id: "p1", serviceKind: "both", title: "Design and build a bakery-café with an open kitchen",
    status: "open", submissionDeadline: "2026-10-20T00:00:00Z" }],
} as typeof PROJECT;
OTHER_PROJECTS[GOC_SAN_PROJECT_ID] = {
  ...PROJECT, id: GOC_SAN_PROJECT_ID, name: "Góc Sân Café — Đà Nẵng",
  address: "56 Bạch Đằng, Hải Châu, Đà Nẵng", areaM2: 140, budget: 650_000_000,
  status: "open", providers: [],
  owner: { id: "owner-5", fullName: "Võ Thành Nam", shopName: "Góc Sân", phone: null },
  openPosts: [{ id: "p2", serviceKind: "construction", title: "Build-out of a two-floor café from approved drawings",
    status: "open", submissionDeadline: "2026-10-05T00:00:00Z" }],
} as typeof PROJECT;

const projectDetail = (url: string) =>
  OTHER_PROJECTS[/project-shop-owners\/([^/?]+)/.exec(url)?.[1] ?? ""] ?? PROJECT;

const MY_PROJECT_ROWS = [
  { ...ENGAGEMENTS.items[0], requestMessage: "We loved the timber bar you did in Quận 3 — can you take on design and the fit-out?",
    contract: { id: "c1", title: "Design & build — Ground floor fit-out", agreedValue: 289_000_000,
      documentViewUrl: null, status: "confirmed", confirmedAt: NOW, createdAt: NOW } },
  { ...ENGAGEMENTS.items[0], id: "66666666-6666-4666-8666-666666666666",
    projectShopOwnerId: INVITED_PROJECT_ID, projectName: "Trạm Trà — Hai Bà Trưng",
    contractType: "design", status: "requested", startedAt: null, hasConfirmedContract: false,
    contract: null, createdAt: "2026-09-10T08:30:00Z",
    requestMessage: "A tea counter with a takeaway window. We need the concept before the lease starts in October." },
  { ...ENGAGEMENTS.items[0], id: "77777777-7777-4777-8777-777777777777",
    projectShopOwnerId: DONE_PROJECT_ID, projectName: "Takeaway kiosk — Landmark 81",
    contractType: "construction", status: "completed", startedAt: "2025-09-01T08:00:00Z",
    hasConfirmedContract: true, requestMessage: "",
    contract: { id: "c9", title: "Kiosk build", agreedValue: 92_500_000, documentViewUrl: null,
      status: "confirmed", confirmedAt: "2025-08-28T08:00:00Z", createdAt: "2025-08-20T08:00:00Z" } },
];

const myProjects = (url: string) => {
  const statuses = /statuses=([^&]+)/.exec(url)?.[1];
  const wanted = statuses ? decodeURIComponent(statuses).split(",") : null;
  const kind = /contractType=([^&]+)/.exec(url)?.[1];
  return page(MY_PROJECT_ROWS.filter((row) =>
    (!wanted || wanted.includes(row.status)) && (!kind || row.contractType === kind)));
};

const ENGAGEMENT_BRIEFS: Record<string, object> = {
  "66666666-6666-4666-8666-666666666666": {
    style: "Pale wood and ceramic, very quiet", seatCount: 14,
    timeline: "Concept by 1 Oct, opening before Tết",
  },
  "77777777-7777-4777-8777-777777777777": {
    style: "Compact stainless kiosk with a lightbox menu", seatCount: 0,
    timeline: "Build in the mall's night window",
  },
};

const engagementBrief = (url: string) => {
  const id = /project-workings\/([^/?]+)\/brief/.exec(url)?.[1] ?? "";
  const base = DESIGN_BRIEFS.items[0];
  return id in ENGAGEMENT_BRIEFS ? { ...base, ...ENGAGEMENT_BRIEFS[id] } : base;
};


// ─── Manual fixtures ───────────────────────────────────────────────────────
// Everything the remaining provider screens read, so each can be shown with
// realistic content. Before these, site profile and pricing crashed and
// survey, daily log, messages, notifications and comments were empty.

// Engagements scoped to the project asked for. Answering every project with
// the Nhà Nâu engagement made the provider look engaged everywhere, so a
// marketplace brief never offered its Apply card.
const engagementsFor = (url: string) => {
  const project = /projectShopOwnerId=([^&]+)/.exec(url)?.[1];
  if (!project || project === PROJECT_ID) return ENGAGEMENTS;
  return page(MY_PROJECT_ROWS.filter((row) => row.projectShopOwnerId === project));
};

// Survey, bid on Góc Sân: pending, with a site survey booked.
const APPLY_ROWS = [{
  id: "a1", postId: "p2", postTitle: "Build-out of a two-floor café from approved drawings",
  projectShopOwnerId: GOC_SAN_PROJECT_ID,
  serviceProviderProfileId: "00000000-0000-4000-8000-000000000002",
  providerDisplayName: "Xưởng Mộc Bình Minh",
  proposal: "We have built three two-floor cafés on Bạch Đằng. Our crew can start the week after signing and finish both floors and the terrace in 9 weeks.",
  estimatedDurationDays: 63, status: "pending", submittedAt: "2026-09-12T08:00:00Z",
  createdAt: "2026-09-12T08:00:00Z", updatedAt: "2026-09-12T08:00:00Z",
  surveyCount: 1, latestSurveyId: "s3", latestSurveyScheduledAt: "2026-09-20T02:00:00Z",
  latestSurveyedAt: null, hasCompletedSurvey: false,
}];

const applies = (url: string) => {
  const project = /projectShopOwnerId=([^&]+)/.exec(url)?.[1];
  return page(project ? APPLY_ROWS.filter((row) => row.projectShopOwnerId === project) : APPLY_ROWS);
};

const SITE_PROFILE = {
  id: "sp1", projectShopOwnerId: PROJECT_ID,
  lengthM: 12.4, widthM: 7, frontageWidthM: 6.8, ceilingHeightM: 3.6, roadWidthM: 18,
  orientation: "southeast", floorCount: 2, hasMezzanine: true,
  structureNote: "Reinforced concrete frame; the rear wall is shared with the neighbour.",
  existingConditionNote: "Previous tenant's counter and shelving still in place. Floor screed cracked near the entrance.",
  derivedFootprintM2: 86.8, totalFloorAreaM2: 131.5, projectAreaM2: 86.5, isAreaSyncedToProject: true,
  createdBy: "owner-1", createdAt: NOW, updatedAt: NOW,
  floors: [
    { id: "f1", siteProfileId: "sp1", floorNo: 1, name: "Ground floor", areaM2: 86.5, ceilingHeightM: 3.6,
      purpose: "Bar, seating and takeaway", note: null },
    { id: "f2", siteProfileId: "sp1", floorNo: 2, name: "Mezzanine", areaM2: 45, ceilingHeightM: 2.6,
      purpose: "Extra seating and storage", note: "Stair at the rear" },
  ],
  openings: [
    { id: "o1", siteProfileId: "sp1", siteFloorId: "f1", type: "main_door", orientation: "southeast",
      widthM: 2.4, heightM: 2.8, quantity: 1, note: "Glass shopfront", sortOrder: 1 },
    { id: "o2", siteProfileId: "sp1", siteFloorId: "f1", type: "window", orientation: "southeast",
      widthM: 1.8, heightM: 2.2, quantity: 2, note: null, sortOrder: 2 },
    { id: "o3", siteProfileId: "sp1", siteFloorId: "f1", type: "service_door", orientation: "northwest",
      widthM: 0.9, heightM: 2.1, quantity: 1, note: "Deliveries from the back lane", sortOrder: 3 },
  ],
};

const SURVEY_ROWS = [
  { id: "s1", projectWorkingId: WORKING_ID, applyId: null, scheduledAt: "2026-02-20T02:00:00Z",
    surveyedAt: "2026-02-20T03:30:00Z", version: 1,
    conditionNote: "Measured 12.4 × 7.0 m, ceiling 3.6 m. Existing counter to be removed; waste outlet 40 cm from the rear wall. Rear wall shared with the neighbour — no chasing.",
    reportUrl: "demo/survey-1.pdf", reportViewUrl: null, createdBy: "demo", createdAt: NOW, updatedAt: NOW },
  { id: "s2", projectWorkingId: WORKING_ID, applyId: null, scheduledAt: "2026-03-01T02:00:00Z",
    surveyedAt: null, version: 2,
    conditionNote: "Follow-up visit to check the mezzanine slab before the stair is designed.",
    reportUrl: null, reportViewUrl: null, createdBy: "demo", createdAt: NOW, updatedAt: NOW },
];

const surveys = (url: string) =>
  SURVEY_ROWS.find((row) => url.includes("/api/surveys/" + row.id)) ?? page(SURVEY_ROWS);

const COMMENT_ROWS: Record<string, [string, string, string][]> = {
  d1: [["Trần Minh Anh", "Love the bar on the north wall. Can we keep the window seats?", "2026-02-25T09:10:00Z"],
       ["Xưởng Mộc Bình Minh", "Yes — the window counter stays, 6 stools.", "2026-02-25T10:02:00Z"]],
  d2: [["Trần Minh Anh", "The till is too close to the service door, staff will bump into deliveries.", "2026-03-04T07:40:00Z"],
       ["Xưởng Mộc Bình Minh", "Agreed, moving it 900 mm west in the next version.", "2026-03-04T08:15:00Z"]],
  m2: [["Xưởng Mộc Bình Minh", "Plumber on site Thursday; pressure test Friday morning.", "2026-03-18T06:00:00Z"]],
};

const comments = (url: string) => {
  const target = /targetId=([^&]+)/.exec(url)?.[1] ?? "";
  return page((COMMENT_ROWS[target] ?? []).map(([name, body, at], i) => ({
    id: `${target}-c${i + 1}`, targetType: url.includes("construction_item") ? "construction_item" : "design",
    targetId: target, body, createdBy: name === "Xưởng Mộc Bình Minh" ? DEMO_ACCOUNT.id : "owner-1",
    createdByName: name, createdAt: at, updatedAt: at,
  })));
};

const DAILY_LOG_ROWS = [
  ["dl4", "2026-03-19", "m2", "Bar carcass & plumbing", "t6", "Run water and waste to bar sink",
   "Ran the hot and cold feeds to the bar sink and fixed the waste to the floor gully. Carcass doors hung.",
   "Waste pipe clashes with the carcass return — raised as an issue.", "Sunny, 33°C", 5],
  ["dl3", "2026-03-18", "m2", "Bar carcass & plumbing", "t5", "Build bar carcass frame",
   "Finished the carcass frame and fixed it to the floor. Oak veneer panels delivered.", null, "Sunny, 32°C", 4],
  ["dl2", "2026-03-14", "m2", "Bar carcass & plumbing", "t4", "Set out bar run to drawing A-101",
   "Set out the bar run from drawing A-101 and checked it against the site — 6.4 m confirmed.", null, "Cloudy, 30°C", 3],
  ["dl1", "2026-03-10", "m1", "Demolition & site prep", "t3", "Make good floor screed",
   "Patched the cracked screed near the entrance and left it to cure.", null, "Rain in the afternoon", 3],
].map(([id, logDate, itemId, itemName, taskId, taskName, workDone, issueNote, weatherNote, workerCount]) => ({
  id, projectWorkingId: WORKING_ID, constructionItemId: itemId, constructionItemName: itemName,
  constructionTaskId: taskId, constructionTaskName: taskName, logDate, workDone, issueNote,
  weatherNote, workerCount, createdBy: DEMO_ACCOUNT.id, createdByName: "Xưởng Mộc Bình Minh",
  createdAt: logDate + "T10:00:00Z", updatedAt: logDate + "T10:00:00Z", media: [],
}));

const dailyLogs = (url: string) =>
  DAILY_LOG_ROWS.find((row) => url.includes("/api/daily-logs/" + row.id)) ?? page(DAILY_LOG_ROWS);

const OWNER_SENDER = { accountId: "owner-1", displayName: "Trần Minh Anh", role: "owner", avatarUrl: null };
const ME_SENDER = { accountId: DEMO_ACCOUNT.id, displayName: "Xưởng Mộc Bình Minh", role: "provider", avatarUrl: null };

const CHAT_THREADS: [string, string | null, [typeof OWNER_SENDER, string, string][]][] = [
  ["cv1", "Site visit — Thursday", [
    [OWNER_SENDER, "Hi, can we move the site visit to Thursday morning?", "2026-03-17T01:05:00Z"],
    [ME_SENDER, "Thursday 9am works. I'll bring the bar elevation to go through on site.", "2026-03-17T01:20:00Z"],
    [OWNER_SENDER, "Great, see you then.", "2026-03-17T01:22:00Z"],
  ]],
  ["cv2", "Bar carcass & plumbing", [
    [ME_SENDER, "Carcass frame is up. Plumbing goes in tomorrow.", "2026-03-18T09:00:00Z"],
    [OWNER_SENDER, "Looks solid. Is the sink position final?", "2026-03-18T09:30:00Z"],
    [ME_SENDER, "Yes, as on drawing A-201. Pressure test on Friday.", "2026-03-18T09:41:00Z"],
  ]],
  ["cv3", "Payment — instalment 2", [
    [OWNER_SENDER, "I've transferred instalment 2 and uploaded the receipt.", "2026-09-11T08:40:00Z"],
  ]],
];

const chatMessages = (id: string, rows: [typeof OWNER_SENDER, string, string][]) =>
  rows.map(([sender, body, sentAt], i) => ({
    id: `${id}-m${i + 1}`, conversationId: id, senderId: sender.accountId, sender, body,
    attachments: [], sentAt,
  }));

const CONVERSATIONS = CHAT_THREADS.map(([id, topic, rows]) => {
  const messages = chatMessages(id, rows);
  return {
    id, projectWorkingId: WORKING_ID, topic, createdBy: rows[0][0], createdAt: rows[0][2],
    updatedAt: rows[rows.length - 1][2], messages,
    lastMessage: messages[messages.length - 1], unreadCount: id === "cv3" ? 1 : 0,
  };
});

const conversations = (url: string) => {
  const one = CONVERSATIONS.find((c) => url.includes("/api/chat/conversations/" + c.id));
  if (one) return one;
  const items = CONVERSATIONS.map(({ messages: _messages, ...summary }) => summary);
  return { items, pageNumber: 1, pageSize: 100, totalCount: items.length, totalPages: 1 };
};

const NOTIFICATION_ROWS = [
  ["n1", "Payment proof submitted", "Trần Minh Anh uploaded proof for “Bar carcass & plumbing complete”. Check your bank and confirm.", "payment", false, "2026-09-11T08:41:00Z", `/projects/${PROJECT_ID}/payments`],
  ["n2", "New invitation", "Nguyễn Thu Hà invited you to design “Trạm Trà — Hai Bà Trưng”.", "invitation", false, "2026-09-10T08:30:00Z", "/my-projects?status=requested"],
  ["n3", "Revision requested", "The owner asked for changes to “Bar elevation”: move the till point away from the service door.", "design", true, "2026-03-04T07:41:00Z", `/projects/${PROJECT_ID}/design-management/d2`],
  ["n4", "Quotation accepted", "“Design & build — revised after site survey” was accepted.", "quotation", true, "2026-02-28T03:00:00Z", `/projects/${PROJECT_ID}/quotations`],
  ["n5", "Contract confirmed", "“Design & build — Ground floor fit-out” is signed.", "contract", true, "2026-03-01T02:00:00Z", `/projects/${PROJECT_ID}/contracts`],
  ["n6", "New issue reported", "“Waste pipe runs through the bar carcass return” on Bar carcass & plumbing.", "issue", true, "2026-03-19T09:00:00Z", `/projects/${PROJECT_ID}/issues`],
].map(([id, title, message, type, isRead, createdAt, actionUrl]) => ({
  id, title, message, type, isRead, actionUrl, referenceType: null, referenceId: null,
  meta: null, createdAt, readAt: isRead ? createdAt : null,
}));

const notifications = (url: string) => {
  const read = /isRead=(true|false)/.exec(url)?.[1];
  const rows = read === undefined ? NOTIFICATION_ROWS : NOTIFICATION_ROWS.filter((n) => String(n.isRead) === read);
  return { ...page(rows), hasPrevious: false, hasNext: false };
};

// Provider plans are targetRole 1; one owner plan so the filter has work to do.
const PAYMENT_PLANS = [
  { id: "plan-studio-month", name: "Studio — Monthly", description: "Unlimited bids and quotations, priority in owner search, and design version history.", targetRole: 1, price: 199_000, durationInDays: 30 },
  { id: "plan-studio-year", name: "Studio — Yearly", description: "Everything in Monthly, two months free.", targetRole: 1, price: 1_990_000, durationInDays: 365 },
  { id: "plan-owner-ai", name: "Owner — AI design report", description: "AI layout and 3D report for one project.", targetRole: 0, price: 199_000, durationInDays: 30 },
];

const PAYMENT_STATUS = {
  success: true, isFinal: true, status: 1, purpose: 0, orderCode: 260914001, paymentLinkId: "demo-link",
  subscriptionId: "sub-1", subscriptionStatus: 1, postId: null, postBoostedUntil: null,
  amount: 199_000, message: "Payment received",
};

// Technical drawings lists the approved designs from the engagement overview.
const engagementOverview = {
  projectWorkingId: WORKING_ID, contractType: CONTRACT_TYPE, status: "accepted",
  projectShopOwner: { id: PROJECT_ID, name: PROJECT.name, address: PROJECT.address,
    areaM2: PROJECT.areaM2, budget: PROJECT.budget, status: PROJECT.status },
  brief: null, aiRecommendations: [],
  approvedDesigns: [{ id: "d1", title: "Ground floor plan", version: 3 }],
};

// Briefs for the marketplace projects, so a brief page shows its own café.
const PROJECT_BRIEFS: Record<string, object> = {
  [BAKERY_PROJECT_ID]: {
    targetCustomer: "Families and students from the university, weekends and afternoons",
    style: "Bright, lots of plants, pale wood and white tiles", mood: "Relaxed, a place to stay for hours",
    seatCount: 30, timeline: "Open by March, before the dry season",
    brandNote: "Bếp Mây: home baking, soft colours, hand-drawn menu",
    businessModel: "Bakery counter with an open kitchen, seating upstairs",
    businessGoals: "Sell out the morning bake by 11am; 40% of sales from cakes to go",
    operationNote: "Ovens need a separate extraction line to the roof",
  },
  [GOC_SAN_PROJECT_ID]: {
    targetCustomer: "Tourists and locals along the river, evenings",
    style: "Terrazzo, rattan and warm lighting on the terrace", mood: "Lively in the evening",
    seatCount: 60, timeline: "Handover within 10 weeks of signing",
    brandNote: "Góc Sân: courtyard café, green and terracotta",
    businessModel: "Two-floor café with a riverside terrace",
    businessGoals: "Full terrace every evening in the dry season",
    operationNote: "Drawings are approved; build strictly to them",
  },
};


// Materials: the price list for the job, what the bar phase uses, and its cost.
const MATERIAL_ROWS = ([
  ["mat1", "Oak veneer panel 18 mm", "m2", 780_000],
  ["mat2", "Quartz worktop 20 mm", "md", 4_200_000],
  ["mat3", "PPR pipe Ø25", "md", 38_000],
  ["mat4", "Ceramic tile 60×60", "m2", 265_000],
] as const).map(([id, name, unit, unitPrice], i) => ({
  id, projectWorkingId: WORKING_ID, name, description: null, unit, unitPrice,
  sortOrder: i + 1, createdBy: DEMO_ACCOUNT.id, createdAt: NOW, updatedAt: NOW,
}));

const materialUsages = (item: string) =>
  item !== "m2" ? [] : ([
    ["u1", "mat1", 14, 13.5, "Bar front and sides"],
    ["u2", "mat2", 6.4, 6.4, null],
    ["u3", "mat3", 22, null, "Feeds and waste to the bar sink"],
  ] as const).map(([id, materialId, estimatedQuantity, actualQuantity, note]) => {
    const material = MATERIAL_ROWS.find((m) => m.id === materialId)!;
    return {
      id, constructionItemId: "m2", constructionTaskId: null, materialId,
      materialName: material.name, unit: material.unit, unitPrice: material.unitPrice,
      estimatedQuantity, actualQuantity, estimatedCost: estimatedQuantity * material.unitPrice,
      actualCost: actualQuantity === null ? null : actualQuantity * material.unitPrice,
      note, createdAt: NOW, updatedAt: NOW,
    };
  });

const materialCost = (url: string) => {
  const item = /construction-items\/([^/?]+)/.exec(url)?.[1] ?? "";
  const lines = materialUsages(item);
  const estimated = lines.reduce((sum, l) => sum + l.estimatedCost, 0);
  return {
    constructionItemId: item, ownEstimatedCost: estimated, ownActualCost: lines.length ? 42_039_000 : null,
    tasksEstimatedCost: 0, tasksActualCost: null, totalEstimatedCost: estimated,
    totalActualCost: lines.length ? 42_039_000 : null,
    missingActualCount: lines.filter((l) => l.actualQuantity === null).length, lines,
  };
};

// The owner's sign-off list for the bar phase.
const CHECKLIST_ROWS = ([
  ["ck1", "Bar run matches drawing A-201 (6.4 m)", true, "passed"],
  ["ck2", "Sink and waste pressure-tested, no leaks", true, "pending"],
  ["ck3", "Oak veneer edges sealed", false, "pending"],
] as const).map(([id, name, isRequired, status], i) => ({
  id, designId: null, constructionItemId: "m2", name, description: null, sortOrder: i + 1,
  isRequired, status, evidenceUrl: null, evidenceViewUrl: null, note: null,
  checkedBy: status === "passed" ? "owner-1" : null,
  checkedAt: status === "passed" ? "2026-03-18T09:30:00Z" : null, createdAt: NOW, updatedAt: NOW,
}));


// Two process templates for "apply template": a small café fit-out and a
// kiosk. Each phase carries its tasks, so the dialog's detail view has content.
const TEMPLATE_PHASES: [string, string, number, string[]][] = [
  ["Site survey & set-out", "site-prep", 3, ["Measure and photograph the site", "Set out the layout on the floor"]],
  ["Demolition & making good", "site-prep", 5, ["Strip out existing fit-out", "Repair floor and walls"]],
  ["MEP first fix", "mep", 7, ["Electrical first fix", "Water and waste runs", "Inspection"]],
  ["Joinery & bar", "joinery", 10, ["Build bar carcass", "Fit worktop and veneer"]],
  ["Finishes & handover", "finishing", 8, ["Paint and tiling", "Snag list and handover"]],
];

const CONSTRUCTION_TEMPLATES = page(([
  ["tpl1", "Café fit-out — 60 to 120 m²", "The standard sequence for a ground-floor café with a bar.", TEMPLATE_PHASES],
  ["tpl2", "Kiosk build", "Compact kiosk in a mall unit, built in night shifts.", TEMPLATE_PHASES.slice(2)],
] as [string, string, string, typeof TEMPLATE_PHASES][]).map(([id, name, description, phases]) => ({
  id, name, description, serviceKind: "construction", isPublic: true, createdBy: null,
  totalEstimateDays: phases.reduce((sum, [, , days]) => sum + days, 0),
  items: phases.map(([phase, category, days, tasks], i) => ({
    id: `${id}-i${i + 1}`, name: phase, description: null, category, estimateDays: days, sortOrder: i + 1,
    tasks: tasks.map((task, j) => ({ id: `${id}-i${i + 1}-t${j + 1}`, name: task, description: null, estimateDays: null, sortOrder: j + 1 })),
  })),
  createdAt: NOW,
})));

// ─── Admin console ──────────────────────────────────────────────────────────
//
// The `/admin` tree runs on its own endpoints (`features/admin/api.ts`) and is
// only reachable with the `admin` persona. Numbers are a plausible platform at
// the end of its first year, and they are consistent with each other: the
// status buckets add up to their totals, the revenue series sums to the report
// total, and the monthly figure matches the overview card.

const ADMIN_OVERVIEW = {
  accounts: {
    total: 128, owners: 74, providers: 51, admins: 3,
    active: 112, inactive: 6, banned: 4, pending: 6,
    emailVerified: 118, newThisMonth: 14,
  },
  projects: { total: 86, byStatus: { draft: 9, briefed: 12, in_progress: 41, completed: 21, cancelled: 3 } },
  posts: { total: 63, byStatus: { open: 18, closed: 39, expired: 6 } },
  applications: { total: 214, byStatus: { pending: 27, accepted: 88, rejected: 99 } },
  engagements: { total: 94, byStatus: { accepted: 46, completed: 41, terminated: 7 } },
  contracts: { total: 77, byStatus: { confirmed: 58, pending_otp: 6, cancelled: 13 } },
  activeSubscriptions: 37,
  revenue: { currency: "VND", total: 235_100_000, thisMonth: 24_500_000, paidTransactions: 156 },
};

// Owners, providers and one administrator, in every status the table can show:
// active, pending (waiting on email verification), inactive and banned.
const ADMIN_ACCOUNT_ROWS = ([
  ["a1", "chi@nhanaucafe.vn", "0903 118 227", "owner", "active", "2026-02-11", "Trần Minh Anh", "Nhà Nâu Coffee"],
  ["a2", "lienhe@xuongmocbinhminh.vn", "0908 123 456", "provider", "active", "2026-01-28", "Xưởng Mộc Bình Minh", "both"],
  ["a3", "hello@gocsan.vn", "0977 540 118", "owner", "active", "2026-04-02", "Lê Quốc Huy", "Góc Sân"],
  ["a4", "studio@antien.vn", "0913 662 084", "provider", "pending", "2026-09-12", "Thiết kế An Tiên", "designer"],
  ["a5", "thicong@namviet.com.vn", "0918 447 903", "provider", "active", "2025-11-19", "Xây dựng Nam Việt", "constructor"],
  ["a6", "bepnhalua@gmail.com", "0905 231 776", "owner", "inactive", "2026-03-06", "Phạm Thu Hà", "Bếp Nhà Lúa"],
  ["a7", "contact@aurorainterior.vn", "0932 880 145", "provider", "banned", "2025-12-08", "Nội thất Aurora", "designer"],
  ["a8", "vuonxua.cafe@gmail.com", "0987 019 553", "owner", "pending", "2026-09-16", "Đỗ Gia Bảo", "Vườn Xưa"],
  ["a9", "quantri@smartcafebuilder.vn", "0900 000 001", "admin", "active", "2025-10-01", "", ""],
] as const).map(([id, email, phone, role, status, joined, displayName, extra]) => ({
  id, email, phone, role, status,
  // The pending accounts are pending precisely because the e-mail is unverified.
  emailVerifiedAt: status === "pending" ? null : `${joined}T04:12:00Z`,
  createdAt: `${joined}T04:05:00Z`,
  updatedAt: NOW,
  deletedAt: null,
  shopOwner: role === "owner" ? { id: `so-${id}`, displayName, businessName: extra } : null,
  serviceProvider: role === "provider"
    ? {
        id: `sp-${id}`, displayName,
        providerType: extra === "designer" ? "individual" : "company",
        capability: extra,
        isVerified: status === "active",
        avgRating: status === "active" ? 4.6 : null,
      }
    : null,
}));

const adminAccounts = (url: string) => {
  const value = (key: string) => {
    const raw = new RegExp(`[?&]${key}=([^&]*)`).exec(url)?.[1];
    return raw ? decodeURIComponent(raw) : null;
  };
  const role = value("role");
  const status = value("status");
  const search = value("search")?.toLowerCase();
  return page(ADMIN_ACCOUNT_ROWS.filter((account) =>
    (!role || account.role === role) &&
    (!status || account.status === status) &&
    (!search || account.email.toLowerCase().includes(search) || (account.phone ?? "").includes(search))));
};

// Platform fees only — subscriptions and post boosting. Owner-to-provider money
// never runs through the platform, so it is absent here by design.
const REVENUE_MONTHS: [string, number, number][] = [
  ["2026-01", 18_900_000, 12], ["2026-02", 21_450_000, 14], ["2026-03", 24_300_000, 16],
  ["2026-04", 22_800_000, 15], ["2026-05", 27_600_000, 18], ["2026-06", 31_200_000, 21],
  ["2026-07", 29_700_000, 20], ["2026-08", 34_650_000, 23], ["2026-09", 24_500_000, 17],
];

// September day by day, for the "Theo ngày" (Daily) toggle. Weekends are
// quieter, which is what the real series looks like.
const REVENUE_DAYS: [string, number, number][] = Array.from({ length: 18 }, (_, i) => {
  const day = i + 1;
  const weekend = [5, 6, 12, 13].includes(day);
  return [`2026-09-${String(day).padStart(2, "0")}`, weekend ? 598_000 : 1_496_000 + (day % 4) * 299_000, weekend ? 1 : 2 + (day % 3)];
});

const revenueReport = (url: string) => {
  const daily = /groupBy=day/.test(url);
  const series = (daily ? REVENUE_DAYS : REVENUE_MONTHS).map(([period, amount, count]) => ({ period, amount, count }));
  return {
    from: daily ? "2026-09-01" : "2026-01-01",
    to: "2026-09-18",
    groupBy: daily ? "day" : "month",
    currency: "VND",
    totalRevenue: 235_100_000,
    transactionCount: 156,
    byPurpose: [
      { purpose: "subscription", amount: 181_400_000, count: 102 },
      { purpose: "post_boost", amount: 53_700_000, count: 54 },
    ],
    series,
  };
};

const ADMIN_TRANSACTIONS = page(([
  ["t1", "a2", "subscription", "paid", "web", 260918041, 599_000, "Gói Chuyên nghiệp — 12 tháng", "2026-09-18T02:41:00Z"],
  ["t2", "a1", "post_boost", "paid", "mobile", 260918022, 150_000, "Đẩy bài — Nhà Nâu Coffee", "2026-09-18T01:15:00Z"],
  ["t3", "a5", "subscription", "paid", "web", 260917113, 299_000, "Gói Cơ bản — 3 tháng", "2026-09-17T07:02:00Z"],
  ["t4", "a3", "post_boost", "pending", "mobile", 260917064, 150_000, "Đẩy bài — Góc Sân", "2026-09-17T04:38:00Z"],
  ["t5", "a4", "subscription", "cancelled", "web", 260916095, 599_000, "Gói Chuyên nghiệp — 12 tháng", "2026-09-16T08:20:00Z"],
  ["t6", "a6", "subscription", "paid", "mobile", 260915077, 299_000, "Gói Cơ bản — 3 tháng", "2026-09-15T03:49:00Z"],
  ["t7", "a1", "subscription", "paid", "mobile", 260914028, 599_000, "Gói Chuyên nghiệp — 12 tháng", "2026-09-14T09:11:00Z"],
  ["t8", "a7", "post_boost", "failed", "web", 260913019, 150_000, "Đẩy bài — Nội thất Aurora", "2026-09-13T06:27:00Z"],
] as const).map(([id, accountId, purpose, status, platform, orderCode, amount, description, createdAt]) => ({
  id, accountId, purpose, status, platform, orderCode, amount, description, createdAt,
})));

const ROUTES: Array<[RegExp, unknown]> = [
  [/\/api\/auth\/me$/, DEMO_ACCOUNT],
  // Admin console. The transactions path sits before the revenue report, which
  // its regex would otherwise match first.
  [/\/api\/admin\/overview/, ADMIN_OVERVIEW],
  [/\/api\/admin\/revenue\/transactions/, ADMIN_TRANSACTIONS],
  [/\/api\/admin\/revenue/, revenueReport],
  [/\/api\/admin\/accounts\/[^/?]+$/, (url: string) =>
    ADMIN_ACCOUNT_ROWS.find((a) => url.endsWith(a.id)) ?? ADMIN_ACCOUNT_ROWS[0]],
  [/\/api\/admin\/accounts/, adminAccounts],
  [/\/api\/project-workings\/filter/, myProjects],
  [/\/api\/project-workings\/[^/?]+\/brief/, engagementBrief],
  [/\/api\/project-workings\/[^/?]+\/overview/, engagementOverview],
  [/\/api\/project-workings/, engagementsFor],
  [/\/api\/applies/, applies],
  [/\/api\/site-profiles\/by-project\/[^/?]+/, (url: string) => ({
    ...SITE_PROFILE, projectShopOwnerId: /by-project\/([^/?]+)/.exec(url)?.[1] ?? PROJECT_ID,
  })],
  [/\/api\/surveys/, surveys],
  [/\/api\/comments/, comments],
  [/\/api\/daily-logs/, dailyLogs],
  [/\/api\/chat\/conversations/, conversations],
  [/\/api\/chat\/messages/, []],
  [/\/api\/notifications\?/, notifications],
  [/\/api\/payments\/plans/, PAYMENT_PLANS],
  [/\/api\/payments\/status/, PAYMENT_STATUS],
  [/\/api\/contracts/, () =>
    STAGE === "signed" ? CONTRACTS : page(CONTRACTS.items.filter((c) => c.status === "cancelled"))],
  [/\/api\/designs/, designs],
  // Both cost-summary shapes before the items collection, which matches them too.
  [/\/api\/construction-tasks(\/|\?|$)/, constructionTasks],
  [/\/api\/construction-items\/cost-summary/, ENGAGEMENT_COST_SUMMARY],
  [/\/api\/construction-items\/[^/?]+\/cost-summary/, itemCostSummary],
  // Scoped to the engagement asked for: the My Projects cards read each job's
  // schedule, and the other demo jobs have none.
  [/\/api\/construction-items/, (url: string) => {
    const working = /projectWorkingId=([^&]+)/.exec(url)?.[1];
    return !working || working === WORKING_ID ? CONSTRUCTION_ITEMS : page([]);
  }],
  [/\/api\/issue-types/, ISSUE_TYPES],
  [/\/api\/construction-templates\/[^/?]+/, (url: string) =>
    CONSTRUCTION_TEMPLATES.items.find((t) => url.includes(t.id)) ?? CONSTRUCTION_TEMPLATES.items[0]],
  [/\/api\/construction-templates/, CONSTRUCTION_TEMPLATES],
  [/\/api\/materials\/usages/, (url: string) => materialUsages(/constructionItemId=([^&]+)/.exec(url)?.[1] ?? "")],
  [/\/api\/materials\/cost\//, materialCost],
  [/\/api\/materials/, page(MATERIAL_ROWS)],
  [/\/api\/checklist-items/, (url: string) => {
    const item = /constructionItemId=([^&]+)/.exec(url)?.[1];
    return page(item === "m2" ? CHECKLIST_ROWS : []);
  }],
  [/\/api\/issues/, ISSUES],
  [/\/api\/project-shop-owners\/[^/?]+/, projectDetail],
  [/\/api\/design-briefs/, (url: string) => {
    const project = /projectId=([^&]+)/.exec(url)?.[1];
    return page(project && project in PROJECT_BRIEFS
      ? [{ ...DESIGN_BRIEFS.items[0], id: "b-" + project, projectId: project, ...PROJECT_BRIEFS[project] }]
      : DESIGN_BRIEFS.items);
  }],
  // Per provider, from the directory rows: one shared summary made a firm
  // read 4.6 from 12 reviews on its card and 4.0 from 3 on its profile.
  [/\/api\/reviews\/providers\/[^/?]+\/summary/, (url: string) => {
    const row = PROVIDER_ROWS.find((p) => url.includes(p.id));
    return {
      ...REVIEW_SUMMARY,
      serviceProviderProfileId: row?.id ?? REVIEW_SUMMARY.serviceProviderProfileId,
      reviewCount: row?.reviewCount ?? 0,
      averageRating: row?.avgRating ?? 0,
    };
  }],
  [/\/api\/reviews/, REVIEWS],
  // Filtered the way the marketplace asks: its "Open" tab and the open-brief
  // count both pass status=open.
  [/\/api\/posts(\/|\?|$)/, (url: string) => {
    const status = /[?&]status=([^&]+)/.exec(url)?.[1];
    const kind = /serviceKind=([^&]+)/.exec(url)?.[1];
    const items = POSTS.items.filter((post) =>
      (!status || post.status === status) && (!kind || post.serviceKind === kind));
    return page(items);
  }],
  [/\/api\/quotations(\/|\?|$)/, quotations],
  [/\/api\/payment-batches(\/|\?|$)/, paymentBatches],
  [/\/api\/change-orders\/summary/, CHANGE_ORDER_SUMMARY],
  // Before the change-orders collection, which would otherwise answer this
  // with a paged list in a shape the design page does not expect. Two of two
  // free revisions used, so the quota meter shows its over-the-limit state.
  [/\/api\/change-orders\/revision-quota\//, {
    designId: "d2", projectWorkingId: WORKING_ID, quotationId: "q1",
    freeRevisionCount: 2, usedRevisionCount: 2, engagementUsedRevisionCount: 3,
    remainingFreeRevisions: 0, nextRevisionCharged: true, extraRevisionFee: 1_500_000,
  }],
  [/\/api\/change-orders(\/|\?|$)/, changeOrders],
  // Specific paths before their collections: brand sub-resources before the
  // brand itself, a profile id before the paged list.
  [/\/api\/provider-brands\/[^/?]+\/(certificates|service-areas|social-links)/, []],
  [/\/api\/provider-brands\/[^/?]+/, providerBrand],
  [/\/api\/provider-portfolios\?/, portfolios],
  [/\/api\/service-provider-profiles\/[^/?]+/, providerDetail],
  [/\/api\/service-provider-profiles/, PROVIDERS],
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

  // The `guest` persona is a signed-out visitor: drop the demo session (never
  // a real one) and leave requests alone, so login and sign-up render as
  // they do for someone who has not logged in.
  if (PERSONA === "guest") {
    if (tokenStore.getAccessToken() === DEMO_TOKEN) tokenStore.clear();
    return;
  }

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

    // `params` joined onto the URL: callers that pass filters as axios params
    // (My Projects' `statuses`, for one) were otherwise invisible to the
    // fixtures, so every tab got the unfiltered list.
    const query = config.params
      ? new URLSearchParams(
          Object.entries(config.params as Record<string, unknown>)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)]),
        ).toString()
      : "";
    const base = `${config.baseURL ?? ""}${config.url ?? ""}`;
    const url = query ? `${base}${base.includes("?") ? "&" : "?"}${query}` : base;
    const method = (config.method ?? "get").toLowerCase();

    let data: unknown;
    if (method === "get") {
      const route = ROUTES.find(([pattern]) => pattern.test(url));
      const hit = route?.[1];
      // Requests with no fixture are recorded, so a screen that renders
      // empty or crashes in demo mode can be traced to the missing route:
      // read `window.__demoMisses` in the console.
      if (!route) {
        const misses = ((window as unknown as { __demoMisses?: string[] }).__demoMisses ??= []);
        if (!misses.includes(url)) misses.push(url);
      }
      data =
        typeof hit === "function"
          ? (hit as (u: string) => unknown)(url)
          : (hit ?? emptyFor(url));
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
