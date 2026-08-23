// ─── Raw wire types ──────────────────────────────────────────────────────────
//
// Only this file knows about the raw `GET /api/project-shop-owners/{id}` shape. The
// rest of the app talks in normalized types (`ProjectDetail`).

// ─── App-facing types ───────────────────────────────────────────────────────

/**
 * Project status as observed from the API. We keep the raw backend string
 * so the UI can switch on it without prematurely narrowing.
 */
export type ProjectStatus = string;

/**
 * The provider's legal structure. Mirrors the backend `ProviderType`
 * enum (`individual` | `company`) — NOT a service kind. This describes
 * who the provider is, not what they were hired to do.
 */
export type ProjectProviderType = "individual" | "company";

/**
 * What the provider is *able* to do in general, carried over from their
 * `ServiceProviderProfile`. Mirrors the backend `Capability` enum, whose
 * members are role-oriented (`designer` / `constructor`), not phase-oriented.
 *
 * This is broader than the engagement: a `both` provider can be hired for
 * design alone. Use `ProjectContractType` to gate on what they were
 * actually hired for here.
 */
export type ProjectProviderCapability = "designer" | "constructor" | "both";

/**
 * The scope the provider was hired for on *this* project. Mirrors the
 * backend `ServiceKind` enum, shared by `project_provider.contract_type`
 * and `project_post.service_kind`.
 *
 * Distinct from `ProjectProviderCapability` on purpose — these are two
 * different backend enums with two different vocabularies, and collapsing
 * them loses the `both` case in each.
 */
export type ProjectContractType = "design" | "construction" | "both";

/**
 * Lifecycle of a project's relationship with a provider. Mirrors the
 * backend `ProviderStatus` enum exactly:
 *   - `requested`  — owner invited the provider, no response yet.
 *   - `accepted`   — provider accepted; the engagement is live.
 *   - `completed`  — owner signed off on the finished work.
 *   - `rejected`   — provider turned down the invitation.
 *   - `terminated` — both sides agreed to end it early.
 *
 * "In progress", "awaiting handover" and "awaiting termination approval"
 * are *derived* server-side (see `Engagement.isAwaitingAcceptance` /
 * `isAwaitingTerminationApproval`), not stored statuses — don't add them
 * to this union.
 */
export type ProjectProviderStatus =
  | "requested"
  | "accepted"
  | "completed"
  | "rejected"
  | "terminated";

/**
 * Marketplace status of an "open post" (a public listing the owner put up
 * to attract design / construction bids). Free-form string so the UI can
 * render whatever the backend sends without prematurely narrowing.
 */
export type ProjectOpenPostStatus = string;

/**
 * What kind of service an open post / open-for slot is requesting. Mirrors
 * `ServiceKind` but kept local because the marketplace may evolve
 * independently of the auth registration form.
 */
export type ProjectOpenPostServiceKind = "design" | "construction" | "both";

/**
 * The project's owner (the account that created it). Denormalised onto
 * the project detail response so the right-column "Owner" card can
 * render without a second round-trip.
 *
 * `shopName` and `phone` may be null on older accounts where the owner
 * hasn't completed their profile. UI should treat null as "not provided"
 * and hide the corresponding line rather than render "—".
 */
export interface ProjectOwner {
  id: string;
  fullName: string;
  shopName: string | null;
  phone: string | null;
}

/**
 * A marketplace listing an owner has open for this project — drives the
 * "open posts" surface elsewhere in the app (not currently rendered on
 * the overview page itself).
 */
export interface ProjectOpenPost {
  id: string;
  serviceKind: ProjectOpenPostServiceKind;
  title: string;
  status: ProjectOpenPostStatus;
  /**
   * ISO string on the wire; normalized to `Date`. `null` when the owner
   * left the post open-ended — the backend's `SubmissionDeadline` is
   * nullable, and coercing that to `new Date(undefined)` rendered
   * "Invalid Date".
   */
  submissionDeadline: Date | null;
}

/**
 * Shape of an "open-for" entry — a single `serviceKind` the owner is still
 * collecting bids on. The backend returns `openFor` as a JSON array of these
 * strings, e.g. `["both"]` to signal the project is still open to anyone
 * willing to do design + construction.
 *
 * Kept as a string-narrowed union so consumers can switch on it
 * safely without re-validating per element.
 */
export type ProjectOpenForEntry = ProjectOpenPostServiceKind;

/**
 * Provider attached to a project (e.g. a design studio or a construction
 * firm). This is the join-row view: a provider can be attached to many
 * projects, a project can have many providers.
 *
 * Two ids are present:
 *   - `projectWorkingId`: the engagement (join-row) id — use it for every
 *     `/api/project-workings/{id}` call and as the row's stable key.
 *   - `providerId`: the `ServiceProviderProfile` id (use for "go to
 *     provider profile").
 *
 * There is no separate join-table id on the wire: the backend's
 * `ProjectWorkingSummary` exposes the engagement id as `projectWorkingId`
 * and nothing else. A `projectProviderId` field used to be declared here
 * and was always `undefined`.
 *
 * `displayName`, `avgRating`, `isVerified` are denormalised onto the
 * row by the backend so the UI can render a card without an extra fetch.
 */
export interface ProjectProvider {
  /** The engagement/projectWorking id for API calls. */
  projectWorkingId: string;
  providerId: string;
  displayName: string;
  providerType: ProjectProviderType;
  capability: ProjectProviderCapability;
  isVerified: boolean;
  avgRating: number | null;
  /** What this provider was hired for here — gate features on this, not `capability`. */
  contractType: ProjectContractType;
  status: ProjectProviderStatus;
  createdAt: Date;
}

/**
 * App-facing project record — what the page renders. Dates are normalized
 * to `Date` so consumers don't have to think about ISO parsing.
 *
 * Slim by design: every field here is supplied by `GET /api/project-shop-owners/{id}`.
 * No mock-only fields.
 */
export interface ProjectDetail {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  areaM2: number | null;
  budget: number | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  /** The owner — full profile (id, name, shop name, phone). */
  owner: ProjectOwner | null;
  /** Providers engaged on this project (design studios, contractors, …). */
  providers: ProjectProvider[];
  /** Marketplace listings the owner has open for this project. */
  openPosts: ProjectOpenPost[];
  /** Other open-for slots the owner is collecting bids on. */
  openFor: ProjectOpenForEntry[];
}

/**
 * Raw response from `GET /api/project-shop-owners/{id}`. All date fields are ISO
 * strings on the wire; we normalize to `Date` in `normalizeProjectDetail`.
 *
 * `providers`, `openPosts`, `openFor`, and `owner` are all optional on
 * the wire to stay forward-compatible with older backend versions —
 * missing fields default to `[]` / `null` after normalization.
 */
export interface RawProjectDetail {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  areaM2: number;
  budget: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  owner?: RawProjectOwner | null;
  providers?: RawProjectProvider[];
  openPosts?: RawProjectOpenPost[];
  openFor?: RawProjectOpenForEntry[];
}

/**
 * Raw wire shape of a single provider row. Mirrors the JSON the backend
 * returns in the `providers[]` array of the project detail response.
 */
export interface RawProjectProvider {
  projectWorkingId: string;
  /** API field: `serviceProviderProfileId` */
  serviceProviderProfileId: string;
  /** Fallback alias for compatibility */
  providerId?: string;
  displayName: string;
  /** `individual` | `company` */
  providerType: string;
  /** `designer` | `constructor` | `both` */
  capability: string;
  isVerified: boolean;
  avgRating: number | null;
  /** `design` | `construction` | `both` */
  contractType: string;
  /** `requested` | `accepted` | `completed` | `rejected` | `terminated` */
  status: string;
  createdAt: string;
}

/** Raw wire shape for the nested `owner` object. */
export interface RawProjectOwner {
  id: string;
  fullName: string;
  shopName?: string | null;
  phone?: string | null;
}

/** Raw wire shape for a single entry in `openPosts[]`. */
export interface RawProjectOpenPost {
  id: string;
  serviceKind: string;
  title: string;
  status: string;
  /** Nullable on the wire — an open-ended post carries no deadline. */
  submissionDeadline: string | null;
}

/** Raw wire shape for a single entry in `openFor[]` — a `serviceKind`
 *  string. Backend may also send numeric/loose values during a
 *  migration; we coerce in normalization. */
export type RawProjectOpenForEntry = string | number | null | undefined;

// ─── Normalization ──────────────────────────────────────────────────────────

/**
 * Surface a wire value we don't recognise. An unknown enum member means the
 * backend gained one and this file hasn't caught up — the previous version of
 * these normalizers swallowed that silently, which is how `both` engagements
 * and `terminated` engagements ended up misreported for months.
 */
function warnUnknown(field: string, raw: string, fallback: string): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[project-detail] unrecognised ${field} "${raw}" from the API — ` +
        `falling back to "${fallback}". Add it to the union in ` +
        `features/projects/project-detail-types.ts.`,
    );
  }
}

/**
 * Parse an optional ISO timestamp. Returns `null` for absent values *and*
 * for strings the `Date` constructor can't read, so callers never have to
 * guard against an `Invalid Date` leaking into a formatter.
 */
function parseNullableDate(raw: string | null | undefined): Date | null {
  if (raw == null || raw === "") return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeProviderType(raw: string): ProjectProviderType {
  if (raw === "individual" || raw === "company") return raw;
  warnUnknown("providerType", raw, "individual");
  return "individual";
}

function normalizeCapability(raw: string): ProjectProviderCapability {
  if (raw === "designer" || raw === "constructor" || raw === "both") {
    return raw;
  }
  warnUnknown("capability", raw, "both");
  // `both` is the permissive fallback: it never hides a badge or a section
  // the provider is entitled to. Gating reads `contractType`, so an
  // over-broad capability can't grant access on its own.
  return "both";
}

function normalizeContractType(raw: string): ProjectContractType {
  if (raw === "design" || raw === "construction" || raw === "both") {
    return raw;
  }
  warnUnknown("contractType", raw, "both");
  return "both";
}

function normalizeProviderStatus(raw: string): ProjectProviderStatus {
  switch (raw) {
    case "requested":
    case "accepted":
    case "completed":
    case "rejected":
    case "terminated":
      return raw;
    default:
      // Only reachable if the backend adds a sixth `ProviderStatus`. Treating
      // it as `requested` keeps the row visible and inert rather than letting
      // an unknown state read as an active engagement.
      warnUnknown("status", raw, "requested");
      return "requested";
  }
}

function normalizeServiceKind(raw: string): ProjectOpenPostServiceKind {
  return raw === "design" || raw === "construction" || raw === "both"
    ? raw
    : "both";
}

function normalizeProjectProvider(raw: RawProjectProvider): ProjectProvider {
  return {
    projectWorkingId: raw.projectWorkingId,
    // API uses `serviceProviderProfileId`, with `providerId` as fallback alias
    providerId: raw.serviceProviderProfileId ?? (raw.providerId ?? ""),
    displayName: raw.displayName,
    providerType: normalizeProviderType(raw.providerType),
    capability: normalizeCapability(raw.capability),
    isVerified: !!raw.isVerified,
    avgRating: typeof raw.avgRating === "number" ? raw.avgRating : null,
    contractType: normalizeContractType(raw.contractType),
    status: normalizeProviderStatus(raw.status),
    createdAt: new Date(raw.createdAt),
  };
}

function normalizeOwner(raw: RawProjectOwner | null | undefined): ProjectOwner | null {
  if (raw == null || typeof raw !== "object") return null;
  return {
    id: raw.id,
    fullName: raw.fullName,
    shopName: typeof raw.shopName === "string" ? raw.shopName : null,
    phone: typeof raw.phone === "string" ? raw.phone : null,
  };
}

function normalizeOpenPost(raw: RawProjectOpenPost): ProjectOpenPost {
  return {
    id: raw.id,
    serviceKind: normalizeServiceKind(raw.serviceKind),
    title: raw.title,
    status: raw.status,
    submissionDeadline: parseNullableDate(raw.submissionDeadline),
  };
}

function normalizeOpenFor(raw: RawProjectOpenForEntry): ProjectOpenForEntry | null {
  // The backend may send the kind as a string ("design", "construction",
  // "both") or as a numeric id (0=owner, 1=provider, …). We accept only
  // the string form here — numeric entries are filtered out so the UI
  // doesn't accidentally render "0" / "1" as service labels.
  if (typeof raw !== "string") return null;
  const normalized = normalizeServiceKind(raw);
  // `normalizeServiceKind` always returns a valid value; collapse "both"
  // / "design" / "construction" to themselves.
  return normalized;
}

export function normalizeProjectDetail(raw: RawProjectDetail): ProjectDetail {
  return {
    id: raw.id,
    ownerId: raw.ownerId,
    name: raw.name,
    address: raw.address,
    areaM2: typeof raw.areaM2 === "number" ? raw.areaM2 : null,
    budget: typeof raw.budget === "number" ? raw.budget : null,
    status: raw.status,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    owner: normalizeOwner(raw.owner),
    providers: (raw.providers ?? []).map(normalizeProjectProvider),
    openPosts: (raw.openPosts ?? []).map(normalizeOpenPost),
    openFor: (raw.openFor ?? [])
      .map(normalizeOpenFor)
      .filter((entry): entry is ProjectOpenForEntry => entry !== null),
  };
}

// ─── Empty / placeholder shell ──────────────────────────────────────────────
//
// Used by `useProjectDetail` while loading or on error so consumers never
// see `undefined`. Fields are empty by default — the page renders a
// loading skeleton or error state in those cases; this exists only so
// card components can be passed `project` unconditionally.

export function createEmptyProjectDetail(): ProjectDetail {
  return {
    id: "0",
    ownerId: "0",
    name: "",
    address: "",
    areaM2: null,
    budget: null,
    status: "",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    owner: null,
    providers: [],
    openPosts: [],
    openFor: [],
  };
}
