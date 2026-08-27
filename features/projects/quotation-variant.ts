import type { ProviderCapability } from "@/features/auth/auth-me-types";
import type { EngagementContractType } from "./engagement-types";
import type { ServiceKind } from "./marketplace-types";

/**
 * Which of the two quotation editors a provider gets.
 *
 * Design and construction are priced against different promises, so these are
 * not cosmetic variants of one form:
 *
 *  - A **design** quotation sells a number of revision rounds, and the server
 *    reads that promise. `DesignService.RequestRevisionAsync` counts revision
 *    rounds across the whole engagement, refuses the round that exceeds
 *    `freeRevisionCount` until the owner explicitly accepts the fee, and opens
 *    an `extra_revision` change order for `extraRevisionFee`. The two fields
 *    are load-bearing.
 *
 *  - A **construction** quotation sells built work. No construction path ever
 *    reads those fields: a construction-only engagement has no `Design` rows,
 *    so `RevisionPolicy` is never consulted for it. Showing the inputs anyway
 *    lets a contractor publish a revision fee that can never be charged and
 *    promise the owner a free-revision quota nothing enforces — a term that
 *    reads as binding on the quotation the contract is built from. Scope
 *    changes on site travel as change orders instead.
 */
export type QuotationVariant = "design" | "construction";

/**
 * Pick the editor for the job being priced.
 *
 * The scope of the work decides, not what the provider is capable of in
 * general: a studio with capability `both` bidding on a construction-only post
 * is selling construction, and must not be offered revision terms for it.
 * `capability` is only the last resort for when neither anchor is loaded yet.
 *
 * `both` resolves to `design` because a turnkey engagement does carry a design
 * phase — the revision quota applies to it and the server will enforce it.
 */
export function resolveQuotationVariant({
  contractType,
  serviceKind,
  capability,
}: {
  /** Scope of the engagement, once the provider has been hired. */
  contractType?: EngagementContractType | null;
  /** Scope of the post being bid on, while the application is still pending. */
  serviceKind?: ServiceKind | null;
  /** Fallback only — what this provider does in general. */
  capability?: ProviderCapability | null;
}): QuotationVariant {
  const scope = contractType ?? serviceKind ?? null;

  if (scope === "construction") return "construction";
  if (scope === "design" || scope === "both") return "design";

  return capability === "constructor" ? "construction" : "design";
}
