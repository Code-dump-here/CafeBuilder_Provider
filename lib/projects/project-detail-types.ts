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
 * Provider type — what kind of service the provider is registered for.
 * Mirrors `ServiceKind` in `lib/http/auth.ts` but kept local to project
 * types so this file remains self-contained for the project-detail page.
 */
export type ProjectProviderType = "design" | "construction" | "both";

/**
 * Capability the provider is hired for on this specific project. May be
 * narrower than their registration type (a "both" provider hired only
 * for "design" on this project).
 */
export type ProjectProviderCapability = "design" | "construction";

/**
 * Lifecycle of a project's relationship with a provider:
 *   - `requested` — owner invited the provider, no response yet.
 *   - `active`    — provider is engaged and working.
 *   - `paused`    — work is temporarily on hold.
 *   - `completed` — engagement is finished (e.g. construction done).
 *   - `declined`  — provider turned down the invitation.
 */
export type ProjectProviderStatus =
  | "requested"
  | "active"
  | "paused"
  | "completed"
  | "declined";

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
  id: number;
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
  id: number;
  serviceKind: ProjectOpenPostServiceKind;
  title: string;
  status: ProjectOpenPostStatus;
  /** ISO string on the wire; normalized to `Date`. */
  submissionDeadline: Date;
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
 *   - `projectProviderId`: the join-table primary key (use for mutations
 *     like "remove provider from project").
 *   - `providerId`: the underlying provider account id (use for "go to
 *     provider profile").
 *
 * `displayName`, `avgRating`, `isVerified` are denormalised onto the
 * row by the backend so the UI can render a card without an extra fetch.
 */
export interface ProjectProvider {
  projectProviderId: number;
  /** The engagement/projectWorking id for API calls */
  projectWorkingId: number;
  providerId: number;
  displayName: string;
  providerType: ProjectProviderType;
  capability: ProjectProviderCapability;
  isVerified: boolean;
  avgRating: number | null;
  contractType: ProjectProviderCapability;
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
  id: number;
  ownerId: number;
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
  id: number;
  ownerId: number;
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
  projectProviderId: number;
  projectWorkingId: number;
  providerId: number;
  displayName: string;
  providerType: string;
  capability: string;
  isVerified: boolean;
  avgRating: number | null;
  contractType: string;
  status: string;
  createdAt: string;
}

/** Raw wire shape for the nested `owner` object. */
export interface RawProjectOwner {
  id: number;
  fullName: string;
  shopName?: string | null;
  phone?: string | null;
}

/** Raw wire shape for a single entry in `openPosts[]`. */
export interface RawProjectOpenPost {
  id: number;
  serviceKind: string;
  title: string;
  status: string;
  submissionDeadline: string;
}

/** Raw wire shape for a single entry in `openFor[]` — a `serviceKind`
 *  string. Backend may also send numeric/loose values during a
 *  migration; we coerce in normalization. */
export type RawProjectOpenForEntry = string | number | null | undefined;

// ─── Normalization ──────────────────────────────────────────────────────────

function normalizeProviderType(raw: string): ProjectProviderType {
  return raw === "design" || raw === "construction" || raw === "both"
    ? raw
    : "design";
}

function normalizeCapability(
  raw: string,
): ProjectProviderCapability {
  // Backend may send "designer" / "constructor" or "design" / "construction".
  // Normalise to the canonical values.
  if (raw === "designer" || raw === "design") return "design";
  if (raw === "constructor" || raw === "construction") return "construction";
  return "design";
}

function normalizeProviderStatus(raw: string): ProjectProviderStatus {
  switch (raw) {
    case "requested":
    case "active":
    case "paused":
    case "completed":
    case "declined":
      return raw;
    default:
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
    projectProviderId: raw.projectProviderId,
    projectWorkingId: raw.projectWorkingId,
    providerId: raw.providerId,
    displayName: raw.displayName,
    providerType: normalizeProviderType(raw.providerType),
    capability: normalizeCapability(raw.capability),
    isVerified: !!raw.isVerified,
    avgRating: typeof raw.avgRating === "number" ? raw.avgRating : null,
    contractType: normalizeCapability(raw.contractType),
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
    submissionDeadline: new Date(raw.submissionDeadline),
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
    id: 0,
    ownerId: 0,
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
