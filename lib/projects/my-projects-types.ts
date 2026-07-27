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
 * What this provider is hired to do on this engagement. Backend sends
 * "design" / "construction" today; other values land in the `unknown`
 * bucket so the UI degrades gracefully.
 */
export type MyProjectContractType = "design" | "construction";

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

// ─── App-facing record ──────────────────────────────────────────────────────

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

/** Query string accepted by the endpoint (mirrors `MarketplaceQueryParams`). */
export interface MyProjectsQueryParams {
  pageNumber: number;
  pageSize: number;
  /** Required — the authenticated provider's `serviceProvider.id`. */
  serviceProviderProfileId: number;
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

function normalizeStatus(raw: string): MyProjectStatus {
  if (raw === "accepted" || raw === "completed") return raw;
  return "requested";
}

function normalizeContractType(raw: string): MyProjectContractType {
  return raw === "construction" ? "construction" : "design";
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

function normalizeMyProjectWorking(raw: RawMyProjectWorking): MyProjectWorking {
  return {
    id: raw.id,
    projectShopOwnerId: raw.projectShopOwnerId,
    projectName: raw.projectName ?? "",
    contractType: normalizeContractType(raw.contractType),
    status: normalizeStatus(raw.status),
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
  return {
    items: raw.items.map(normalizeMyProjectWorking),
    pageNumber: raw.pageNumber,
    pageSize: raw.pageSize,
    totalItems: raw.totalItems,
    totalPages: raw.totalPages,
    hasPrevious: raw.hasPrevious,
    hasNext: raw.hasNext,
  };
}

export function normalizeRawMyProjectWorking(
  raw: RawMyProjectWorking,
): MyProjectWorking {
  return normalizeMyProjectWorking(raw);
}
