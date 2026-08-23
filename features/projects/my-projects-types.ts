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

import { isVisibleEngagementStatus } from "./engagement-visibility";

// ─── Status / contract type ─────────────────────────────────────────────────

/**
 * Lifecycle of a single provider ↔ project engagement row, as returned
 * by the backend, narrowed to the states this list renders. Rows with any
 * other status — `rejected`, `terminated`, or anything added later — are
 * dropped by `normalizeStatus` rather than coerced into one of these.
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
 * Contract status. Mirrors the backend `ContractStatus` enum:
 * `drafted → pending_otp → confirmed`, or `cancelled`.
 *
 * This used to read `"draft" | "confirmed" | "signed" | string`. Two of those
 * three literals were wrong — the backend sends `drafted`, not `draft`, and
 * has never had a `signed` state (a contract is sealed by OTP, which lands it
 * on `confirmed`). The trailing `| string` widened the union back to `string`
 * and hid all of it from the compiler.
 */
export type MyProjectContractStatus =
  | "drafted"
  | "pending_otp"
  | "confirmed"
  | "cancelled";

/**
 * Slim contract denormalized onto each engagement row. `null` when no
 * contract exists; otherwise a brief summary that lets the card render
 * a "contract confirmed" badge without an extra round-trip.
 */
export interface MyProjectContract {
  id: string;
  title: string;
  /**
   * VND, as agreed at the time of contract creation. `null` when no value has
   * been agreed yet — the backend's `AgreedValue` is `decimal?`, and coercing
   * that to `0` rendered an unpriced contract as a confident "0 ₫".
   */
  agreedValue: number | null;
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
  id: string;
  /** Underlying project — use this for `/projects/{id}` navigation. */
  projectShopOwnerId: string;
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
  applyId: string | null;
}

// ─── Wire types ─────────────────────────────────────────────────────────────

/** Raw JSON shape returned by `GET /api/project-workings`. */
export interface RawMyProjectWorking {
  id: string;
  projectShopOwnerId: string;
  projectName: string;
  serviceProviderProfileId: string;
  providerDisplayName: string;
  applyId: string | null;
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
  id: string;
  title: string;
  /** `decimal?` server-side — absent until the two sides agree a figure. */
  agreedValue?: number | null;
  documentViewUrl?: string | null;
  /** `drafted` | `pending_otp` | `confirmed` | `cancelled` */
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
  serviceProviderProfileId: string;
  /**
   * Statuses to return, sent as the CSV `statuses` param. Always supply the
   * full visible set for the "All" tab rather than omitting it: the endpoint
   * reads an empty value as "no status filter" and would hand back declined
   * and terminated engagements for the client to throw away again.
   */
  statuses?: readonly MyProjectStatus[];
  /**
   * Restrict to one kind of work. Matched exactly by the backend
   * (`e.ContractType == kind`), so `design` does NOT subsume `both` — a
   * design-and-build engagement answers only to `both`. The filter UI lists
   * all three separately for exactly that reason.
   */
  contractType?: MyProjectContractType;
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
  // Same rule as the members card — see `engagement-visibility`. The two
  // lists disagreeing about who counts as engaged is exactly the drift that
  // shared constant exists to prevent.
  return isVisibleEngagementStatus(raw) ? raw : null;
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

function normalizeContractStatus(raw: string): MyProjectContractStatus {
  if (
    raw === "drafted" ||
    raw === "pending_otp" ||
    raw === "confirmed" ||
    raw === "cancelled"
  ) {
    return raw;
  }
  // `drafted` is the backend's initial state, so it's the safe assumption for
  // anything unfamiliar: it claims the least about where the contract has got
  // to. The old fallback was `"draft"`, a value the server never sends.
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[my-projects] unrecognised contract status "${raw}" from the API — ` +
        `falling back to "drafted". Add it to MyProjectContractStatus.`,
    );
  }
  return "drafted";
}

function normalizeContract(raw: RawMyProjectContract | null | undefined): MyProjectContract | null {
  if (raw == null || typeof raw !== "object") return null;
  return {
    id: raw.id,
    title: typeof raw.title === "string" ? raw.title : "",
    // `null`, not `0`: "no figure agreed yet" and "agreed to nothing" are
    // different claims, and the card must not make the second one.
    agreedValue: typeof raw.agreedValue === "number" ? raw.agreedValue : null,
    documentViewUrl:
      typeof raw.documentViewUrl === "string" ? raw.documentViewUrl : null,
    status: normalizeContractStatus(raw.status),
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
    applyId: typeof raw.applyId === "string" && raw.applyId ? raw.applyId : null,
  };
}

export function normalizeMyProjectsPage(
  raw: RawPagedResponse,
): import("./marketplace-types").PagedResponse<MyProjectWorking> {
  const items = raw.items
    .map(normalizeMyProjectWorking)
    .filter((item): item is MyProjectWorking => item !== null);

  // Nothing should be dropped any more: the request names the exact statuses
  // it wants via `statuses`, so the server pages over the visible rows only.
  // This stays as a guard against a status added to the backend later, and
  // `totalItems` is corrected by whatever it catches — approximate, since
  // rows dropped on *other* pages are still in the server's total, but the
  // correction is only ever exercised by a wire value we don't yet know.
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
