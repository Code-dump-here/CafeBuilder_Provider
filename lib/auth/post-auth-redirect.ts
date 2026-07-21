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
 * Admin accounts (and any role with both profiles null) always land on
 * the role's home page.
 */
export type PostAuthDestination =
  | { kind: "onboarding" }
  | { kind: "home"; role: UserRole };

/**
 * Inspect the freshly-logged-in account and decide where the app
 * should send it. Async because we always need a fresh `/api/auth/me`
 * — register/login only return the bare `AuthSession`.
 *
 * Bypasses the React Query cache deliberately: we just set fresh tokens,
 * so anything cached from a previous session is by definition stale.
 * We fetch through axios directly to guarantee a network round-trip.
 */
export async function resolvePostAuthDestination(): Promise<PostAuthDestination> {
  let account: NormalizedAccount | null = null;
  try {
    account = await fetchMe();
  } catch (err) {
    // If the profile fetch fails for any reason (network, 401, etc.),
    // log loudly so the dev sees why we're sending them to the wrong place.
    // We still prefer landing somewhere over bouncing back to /login.
    console.error("[post-auth-redirect] /api/auth/me failed", err);
    return { kind: "home", role: "owner" };
  }

  if (!account) {
    console.error("[post-auth-redirect] /api/auth/me returned empty account");
    return { kind: "home", role: "owner" };
  }

  const destination = resolvePostAuthDestinationFromAccount(account);
  // Promoted to console.error so it's not filtered out by browser
  // "verbose" log levels — we *always* want to see this in dev.
  console.error("[post-auth-redirect] resolved", {
    role: account.role,
    hasShopOwner: account.shopOwner !== null,
    hasServiceProvider: account.serviceProvider !== null,
    destination,
    path: postAuthDestinationToPath(destination),
  });
  return destination;
}

/**
 * Pure helper — same decision but accepts a pre-loaded account so unit
 * tests / non-fetch flows can plug in their own data.
 *
 * Note: shop-owner accounts (role === "owner") no longer require an
 * onboarding detour. Their profile (`shopOwner`) is filled in lazily
 * during the project creation flow, so we send them straight to the
 * workspace instead of `/onboarding`.
 */
export function resolvePostAuthDestinationFromAccount(
  account: NormalizedAccount,
): PostAuthDestination {
  if (account.role === "provider" && account.serviceProvider === null) {
    return { kind: "onboarding" };
  }
  return { kind: "home", role: account.role };
}

/**
 * Resolve a `PostAuthDestination` to a path the router can `replace()` to.
 */
export function postAuthDestinationToPath(
  destination: PostAuthDestination,
): string {
  if (destination.kind === "onboarding") return "/onboarding";
  switch (destination.role) {
    case "admin":
      return "/admin";
    case "owner":
    case "provider":
    default:
      return "/workspace";
  }
}