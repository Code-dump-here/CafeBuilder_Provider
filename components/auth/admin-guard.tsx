"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useCurrentUser } from "@/features/auth/user-context";

/**
 * Role gate for the `/admin` tree.
 *
 * The admin console previously rendered for anyone — including signed-out
 * visitors. The backend correctly rejects the underlying requests with 403, so
 * no data leaked, but the shell, its navigation, and the account-management UI
 * (with ban/delete affordances) were all reachable. Two of the admin pages run
 * entirely on mock data, so they rendered fully populated regardless of who
 * was looking.
 *
 * This is deliberately a *client* guard, matching `ProfileGuard`: auth state
 * lives in `localStorage`, so the server cannot know the role at render time.
 * It is a UI gate, not a security boundary — the backend remains the authority.
 *
 *   - Still loading         → render nothing (avoids flashing the console)
 *   - Not authenticated     → redirect to /login
 *   - Authenticated non-admin → redirect to /
 *   - Admin                 → render children
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { account, isLoading, isAuthenticated } = useCurrentUser();

  const redirectedRef = React.useRef(false);

  const isAdmin = isAuthenticated && account?.role === "admin";

  React.useEffect(() => {
    if (redirectedRef.current) return;
    if (isLoading) return;

    if (!isAuthenticated || !account) {
      redirectedRef.current = true;
      router.replace("/login");
      return;
    }

    if (account.role !== "admin") {
      redirectedRef.current = true;
      router.replace("/");
    }
  }, [account, isLoading, isAuthenticated, router]);

  // Render nothing until we positively know the user is an admin. Returning
  // `children` while loading would flash the full console to every visitor,
  // which is the bug this guard exists to fix.
  if (!isAdmin) return null;

  return <>{children}</>;
}
