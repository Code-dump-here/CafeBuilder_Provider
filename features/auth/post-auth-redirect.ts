import { fetchMe } from "./auth-me-api";
import type { NormalizedAccount } from "./auth-me-types";
import type { UserRole } from "@/lib/http/auth";

/**
 * Post-auth landing page for a freshly-authenticated account.
 *
 * The backend's `/auth/me` is the source of truth for whether a
 * provider/owner has finished onboarding. If the matching profile is
 * still null we route to `/onboarding` so the user can finish the flow
 * before reaching the workspace.
 *
 * Admin accounts land on `/admin`. Provider accounts land on
 * `/my-projects` — that's the real "design / construction workspace"
 * (a designer/constructor/both-capability provider has no useful view
 * at `/`, which is the marketing homepage). Owners land on `/` since
 * they own the projects themselves and reach the workspace by clicking
 * "My Projects" in the navbar.
 */
export type PostAuthDestination =
  | { kind: "onboarding" }
  | { kind: "admin" }
  | { kind: "providerWorkspace" }
  | { kind: "home"; role: UserRole };

/**
 * The destination plus the account we fetched to decide it.
 *
 * The account is returned so callers can seed the `["auth", "me"]` query
 * instead of throwing away a perfectly good response. Previously this data
 * was discarded, `useMe` never repopulated after login, and every screen
 * deriving `account.serviceProvider.id` — My Projects, invitation cards, the
 * apply flow — silently rendered as empty until a manual page refresh.
 *
 * `account` is null only when the fetch failed.
 */
export interface PostAuthResolution {
  destination: PostAuthDestination;
  account: NormalizedAccount | null;
}

/**
 * Inspect the freshly-logged-in account and decide where the app
 * should send it. Async because we always need a fresh `/api/auth/me`
 * — register/login only return the bare `AuthSession`.
 *
 * Bypasses the React Query cache deliberately: we just set fresh tokens,
 * so anything cached from a previous session is by definition stale.
 * We fetch through axios directly to guarantee a network round-trip.
 */
export async function resolvePostAuthDestination(): Promise<PostAuthResolution> {
  let account: NormalizedAccount | null = null;
  try {
    account = await fetchMe();
  } catch (err) {
    // If the profile fetch fails for any reason (network, 401, etc.),
    // log loudly so the dev sees why we're sending them to the wrong place.
    // We still prefer landing somewhere over bouncing back to /login.
    console.error("[post-auth-redirect] /api/auth/me failed", err);
    return { destination: { kind: "home", role: "owner" }, account: null };
  }

  if (!account) {
    console.error("[post-auth-redirect] /api/auth/me returned empty account");
    return { destination: { kind: "home", role: "owner" }, account: null };
  }

  const destination = resolvePostAuthDestinationFromAccount(account);
  // Dev-only: console.error (not .log) so it survives browser "verbose"
  // log-level filtering. Gated on NODE_ENV so a routine, successful login
  // doesn't spam production error monitoring (Sentry, etc.) with this on
  // every request.
  if (process.env.NODE_ENV !== "production") {
    console.error("[post-auth-redirect] resolved", {
      role: account.role,
      capability: account.serviceProvider?.capability ?? null,
      hasShopOwner: account.shopOwner !== null,
      hasServiceProvider: account.serviceProvider !== null,
      destination,
      path: postAuthDestinationToPath(destination),
    });
  }
  return { destination, account };
}

/**
 * Pure helper — same decision but accepts a pre-loaded account so unit
 * tests / non-fetch flows can plug in their own data.
 *
 * Note: shop-owner accounts (role === "owner") no longer require an
 * onboarding detour. Their profile (`shopOwner`) is filled in lazily
 * during the project creation flow, so we send them straight to the
 * homepage instead of `/Workspace`.
 */
export function resolvePostAuthDestinationFromAccount(
  account: NormalizedAccount,
): PostAuthDestination {
  // A provider with no service-provider profile hasn't finished
  // onboarding — they need to fill it in before they can see their
  // workspace.
  if (account.role === "provider" && account.serviceProvider === null) {
    return { kind: "onboarding" };
  }
  // Admin skips both onboarding and the workspace routing.
  if (account.role === "admin") {
    return { kind: "admin" };
  }
  // Provider → real workspace. The capability filter (`?service=…`) is
  // not applied here: `MyProjectsServiceFilter` is only rendered when
  // the account has capability "both", and applying it elsewhere would
  // be a no-op for designer/constructor-only providers.
  if (account.role === "provider") {
    return { kind: "providerWorkspace" };
  }
  return { kind: "home", role: account.role as UserRole };
}

/**
 * Resolve a `PostAuthDestination` to a path the router can `replace()` to.
 */
export function postAuthDestinationToPath(
  destination: PostAuthDestination,
): string {
  if (destination.kind === "onboarding") return "/onboarding";
  if (destination.kind === "admin") return "/admin";
  if (destination.kind === "providerWorkspace") return "/my-projects";
  // Remaining variant is `{ kind: "home", role: UserRole }` — only owner
  // reaches here in practice (provider/admin take the explicit branches
  // above). Landing at `/` keeps the marketing homepage as the owner's
  // home, matching how the navbar's logo is wired.
  return "/";
}
