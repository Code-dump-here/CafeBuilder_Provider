"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useCurrentUser } from "@/features/auth/user-context";

/**
 * Client-side guard for protected pages. Inspects the current account
 * via the UserContext (which hydrates from `/api/auth/me`) and decides:
 *
 *   - Not authenticated → render children as-is. Public pages stay
 *     accessible to guests; auth-only pages live in route groups with
 *     their own gating.
 *   - Authenticated AND `role === "provider"` but `serviceProvider` is
 *     null → force-redirect to `/onboarding`.
 *   - Otherwise → render children.
 *
 * Note: shop-owner accounts (role === "owner") are intentionally NOT
 * gated here. Their profile fields are captured during the project
 * creation flow, not a separate onboarding step, so a missing
 * `shopOwner` record is normal and doesn't warrant a detour.
 *
 * Why a guard at all (and not just a post-login redirect):
 *   - The user can log in once, close the tab, and come back later. The
 *     post-login redirect only fires once.
 *   - They can land on `/` from a `next/link` click deep inside the app
 *     before the onboarding redirect on the previous login took effect.
 *   - They can open `/` in a second tab and forget they're not done
 *     onboarding.
 *
 * Putting the check at the protected-routes layout level guarantees
 * provider users never see the marketing pages once auth + an
 * unfinished profile.
 */
export function ProfileGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { account, isLoading, isAuthenticated } = useCurrentUser();

  // Track if we've already kicked off a redirect so we don't loop when
  // the user lands on a page the guard is rendering while we're still
  // fetching /auth/me.
  const redirectedRef = React.useRef(false);

  React.useEffect(() => {
    if (redirectedRef.current) return;
    if (isLoading) return;

    if (!isAuthenticated || !account) return;

    const needsOnboarding =
      account.role === "provider" && account.serviceProvider === null;

    if (needsOnboarding) {
      redirectedRef.current = true;
      router.replace("/onboarding");
    }
  }, [account, isLoading, isAuthenticated, router]);

  return <>{children}</>;
}