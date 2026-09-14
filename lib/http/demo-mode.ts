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

// Shaped like the current Design type: `title`, a string `version`, `type`,
// `changeSummary` and `revisionCount`. The older fixture still used `name` and
// a numeric version, from before the API changed, so the detail page never
// resolved a design and sat on "Loading design…".
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
  createdAt: NOW, updatedAt: NOW, images: [],
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
  items: [], paymentTerms: [], attachments: [], createdAt: NOW, updatedAt: NOW,
}));

const quotations = (url: string) =>
  QUOTATION_ROWS.find((q) => url.includes("/api/quotations/" + q.id)) ?? page(QUOTATION_ROWS);

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
  proofs: [], createdAt: NOW, updatedAt: NOW,
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
  ["p1", "Nhà Nâu Coffee — Quận 1", "123 Nguyễn Huệ, Quận 1, Hồ Chí Minh", 420_000_000, 86.5, "both",
   "Design and fit-out for an 18-seat espresso bar", "open", "2026-10-15"],
  ["p2", "Trạm Trà — Hai Bà Trưng", "8 Lò Đúc, Hai Bà Trưng, Hà Nội", 180_000_000, 42, "design",
   "Concept and layout for a tea counter with takeaway window", "closed", "2026-08-30"],
  ["p3", "Góc Sân Café — Đà Nẵng", "56 Bạch Đằng, Hải Châu, Đà Nẵng", 650_000_000, 140, "construction",
   "Build-out of a two-floor café from approved drawings", "cancelled", "2026-09-05"],
].map(([id, projectName, projectAddress, projectBudget, projectAreaM2, serviceKind, title, status, deadline]) => ({
  id, projectShopOwnerId: "11111111-1111-4111-8111-111111111111", projectName, projectAddress,
  projectBudget, projectAreaM2, serviceKind, title,
  description: "Brief posted by the owner with floor area, budget and the service needed.",
  status, submissionDeadline: deadline + "T00:00:00Z", createdAt: NOW, updatedAt: NOW,
})));

const ROUTES: Array<[RegExp, unknown]> = [
  [/\/api\/auth\/me$/, DEMO_ACCOUNT],
  [/\/api\/project-workings/, ENGAGEMENTS],
  [/\/api\/contracts/, CONTRACTS],
  [/\/api\/designs/, designs],
  // Both cost-summary shapes before the items collection, which matches them too.
  [/\/api\/construction-items\/cost-summary/, ENGAGEMENT_COST_SUMMARY],
  [/\/api\/construction-items\/[^/?]+\/cost-summary/, itemCostSummary],
  [/\/api\/construction-items/, CONSTRUCTION_ITEMS],
  [/\/api\/issue-types/, ISSUE_TYPES],
  [/\/api\/issues/, ISSUES],
  [/\/api\/project-shop-owners\/[^/?]+/, PROJECT],
  [/\/api\/reviews\/providers\/[^/?]+\/summary/, REVIEW_SUMMARY],
  [/\/api\/reviews/, REVIEWS],
  [/\/api\/posts(\/|\?|$)/, POSTS],
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
      const hit = ROUTES.find(([pattern]) => pattern.test(url))?.[1];
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
