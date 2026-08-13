/**
 * "My Projects" types — mirror `GET /api/project-workings` for providers.
 *
 * Endpoint used by the authenticated provider:
 *   GET /api/project-workings?pageNumber=1&pageSize=10&serviceProviderProfileId={id}
 *
 * Each row is one engagement between a provider and one owner's project.
 * The `id` is the project-working row id; `projectShopOwnerId` is the
 * underlying project id (use this for `/projects/{projectShopOwnerId}`
 * navigation — it maps 1-1 to the existing `useProjectDetail({id})` hook).
 */

// ─── Status / contract type ─────────────────────────────────────────────────

/**
 * Lifecycle of a single provider ↔ project engagement row, as returned
 * by the backend. Narrows on the way in; unknown values fall back to
 * `requested` so the UI never has to render an unhandled label.
 *
 *   - `requested` — owner invited the provider, no decision yet
 *   - `accepted`  — provider accepted, work ongoing / pending contract
 *   - `completed` — engagement finished (contract may still be present)
 */
export type MyProjectStatus = "requested" | "accepted" | "completed";

/**
 * What this provider is hired to do on this engagement. Mirrors the backend
 * `ServiceKind` enum, which `project_provider.contract_type` uses — all three
 * members, including the turnkey `both`.
 *
 * `both` used to be missing here, and `normalizeContractType` funnelled
 * everything that wasn't `"construction"` into `"design"`. A design-and-build
 * engagement therefore rendered as "Design" with a pen icon, hiding the
 * construction half of the job from the provider's own dashboard.
 */
export type MyProjectContractType = "design" | "construction" | "both";

/**
 * Confirmed-contract status. `null` means no contract has been created
 * for this engagement yet. Other values match `contract.status`.
 */
export type MyProjectContractStatus = "draft" | "confirmed" | "signed" | string;

/**
 * Slim contract denormalized onto each engagement row. `null` when no
 * contract exists; otherwise a brief summary that lets the card render
 * a "contract confirmed" badge without an extra round-trip.
 */
export interface MyProjectContract {
  id: number;
  title: string;
  /** VND, as agreed at the time of contract creation. */
  agreedValue: number;
  /** Optional URL to the signed PDF — `null` if not yet uploaded. */
  documentViewUrl: string | null;
  status: MyProjectContractStatus;
  confirmedAt: Date | null;
  createdAt: Date;
}

// ─── App-facing record ─────────────────────────────────────────────────────

/**
 * One row rendered on the "My Projects" page.
 *
 * Slim by design — fields here are what the list endpoint returns in
 * its primary payload. Clicking a row deep-links into the existing
 * `/[locale]/projects/{projectShopOwnerId}` overview page.
 */
export interface MyProjectWorking {
  /** Primary key of the project-working row. */
  id: number;
  /** Underlying project — use this for `/projects/{id}` navigation. */
  projectShopOwnerId: number;
  /** Project name (denormalized for list rendering). */
  projectName: string;
  /** What this provider does on the engagement. */
  contractType: MyProjectContractType;
  /** Lifecycle status — see `MyProjectStatus`. */
  status: MyProjectStatus;
  /** Owner's invitation message (free text; can be empty). */
  requestMessage: string;
  /** Provider's own display name (echoed back by the backend). */
  providerDisplayName: string;
  /** When the engagement actually started; `null` until accepted. */
  startedAt: Date | null;
  /** Row creation timestamp — always parsed to a `Date`. */
  createdAt: Date;
  /** Last update timestamp — always parsed to a `Date`. */
  updatedAt: Date;
  /** Confirmed-contract summary; `null` when no contract exists yet. */
  contract: MyProjectContract | null;
  /** Convenience flag the backend denormalizes for the badge. */
  hasConfirmedContract: boolean;
  /** Original application id if this row came from a bid; otherwise null. */
  applyId: number | null;
}

// ─── Wire types ─────────────────────────────────────────────────────────────

/** Raw JSON shape returned by `GET /api/project-workings`. */
export interface RawMyProjectWorking {
  id: number;
  projectShopOwnerId: number;
  projectName: string;
  serviceProviderProfileId: number;
  providerDisplayName: string;
  applyId: number | null;
  contractType: string;
  status: string;
  requestMessage?: string | null;
  startedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  contract?: RawMyProjectContract | null;
  hasConfirmedContract?: boolean;
}

export interface RawMyProjectContract {
  id: number;
  title: string;
  agreedValue: number;
  documentViewUrl?: string | null;
  status: string;
  confirmedAt?: string | null;
  createdAt: string;
}

/**
 * Query string accepted by the endpoint (mirrors `MarketplaceQueryParams`).
 *
 * The `status` filter is optional — when omitted the backend returns
 * every engagement for the provider (all statuses). The values accepted
 * are the same strings the backend exposes on `ProjectWorkingResponse`,
 * optionally narrowed on the wire (e.g. suppliers querying just
 * `requested`).
 *
 * On the client side, `MyProjectStatus` is the narrower vocabulary — it
 * covers the three lifecycle states the UI actually renders. We expose
 * the wire value as `string` so future backend statuses ("rejected",
 * "terminated", …) don't force a type bump here; the normalizer narrows
 * the value down to something the UI can render.
 */
export interface MyProjectsQueryParams {
  pageNumber: number;
  pageSize: number;
  /** Required — the authenticated provider's `serviceProvider.id`. */
  serviceProviderProfileId: number;
  /** Optional `project-workings` status filter. */
  status?: MyProjectStatus;
}

interface RawPagedResponse {
  items: RawMyProjectWorking[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// ─── Normalization ──────────────────────────────────────────────────────────

/**
 * Narrows the wire status to what "My projects" renders, or `null` when the
 * row shouldn't be listed at all.
 *
 * `rejected` and `terminated` are real backend statuses that this list has no
 * place for: the provider has already declined the invitation, or the
 * engagement is over. They used to fall through a catch-all `return
 * "requested"`, which showed a *declined* project back to the provider as a
 * pending invitation — including under the "Requested" filter tab.
 *
 * Unknown values are dropped rather than guessed at, so a status added to the
 * backend later can't silently reappear as a fake invite.
 */
function normalizeStatus(raw: string): MyProjectStatus | null {
  if (raw === "requested" || raw === "accepted" || raw === "completed") {
    return raw;
  }
  return null;
}

function normalizeContractType(raw: string): MyProjectContractType {
  if (raw === "design" || raw === "construction" || raw === "both") {
    return raw;
  }
  // Unlike `normalizeStatus`, an unfamiliar contract type is no reason to hide
  // the engagement — it's a label, not a filter. Fall back to the most
  // inclusive value (so nothing the provider is entitled to gets hidden) and
  // say so, matching `features/projects/project-detail-types.ts`.
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[my-projects] unrecognised contractType "${raw}" from the API — ` +
        `falling back to "both". Add it to MyProjectContractType.`,
    );
  }
  return "both";
}

function normalizeContract(raw: RawMyProjectContract | null | undefined): MyProjectContract | null {
  if (raw == null || typeof raw !== "object") return null;
  return {
    id: raw.id,
    title: typeof raw.title === "string" ? raw.title : "",
    agreedValue: typeof raw.agreedValue === "number" ? raw.agreedValue : 0,
    documentViewUrl:
      typeof raw.documentViewUrl === "string" ? raw.documentViewUrl : null,
    status: typeof raw.status === "string" ? raw.status : "draft",
    confirmedAt:
      typeof raw.confirmedAt === "string" && raw.confirmedAt
        ? new Date(raw.confirmedAt)
        : null,
    createdAt: new Date(raw.createdAt),
  };
}

/** Returns `null` for rows this list shouldn't show — see `normalizeStatus`. */
function normalizeMyProjectWorking(
  raw: RawMyProjectWorking,
): MyProjectWorking | null {
  const status = normalizeStatus(raw.status);
  if (status == null) return null;

  return {
    id: raw.id,
    projectShopOwnerId: raw.projectShopOwnerId,
    projectName: raw.projectName ?? "",
    contractType: normalizeContractType(raw.contractType),
    status,
    requestMessage: typeof raw.requestMessage === "string" ? raw.requestMessage : "",
    providerDisplayName:
      typeof raw.providerDisplayName === "string" ? raw.providerDisplayName : "",
    startedAt:
      typeof raw.startedAt === "string" && raw.startedAt
        ? new Date(raw.startedAt)
        : null,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    contract: normalizeContract(raw.contract ?? null),
    hasConfirmedContract: !!raw.hasConfirmedContract,
    applyId: typeof raw.applyId === "number" ? raw.applyId : null,
  };
}

export function normalizeMyProjectsPage(
  raw: RawPagedResponse,
): import("./marketplace-types").PagedResponse<MyProjectWorking> {
  const items = raw.items
    .map(normalizeMyProjectWorking)
    .filter((item): item is MyProjectWorking => item !== null);

  // The "All" tab sends no `status`, and the backend's list query excludes
  // only soft-deleted rows — so declined and finished engagements arrive here
  // and get dropped above.
  //
  // `totalItems` still counts them, so it's corrected by however many this
  // page discarded. That's approximate: rows dropped on *other* pages are
  // still in the server's total. Filtering server-side would fix it properly,
  // but the endpoint takes a single `status` value, so "every live status"
  // isn't expressible without a backend change.
  const dropped = raw.items.length - items.length;

  return {
    items,
    pageNumber: raw.pageNumber,
    pageSize: raw.pageSize,
    totalItems: Math.max(0, raw.totalItems - dropped),
    totalPages: raw.totalPages,
    hasPrevious: raw.hasPrevious,
    hasNext: raw.hasNext,
  };
}

/**
 * Single-row variant. `null` when the row is a status this list doesn't show
 * (see `normalizeStatus`).
 */
export function normalizeRawMyProjectWorking(
  raw: RawMyProjectWorking,
): MyProjectWorking | null {
  return normalizeMyProjectWorking(raw);
}
