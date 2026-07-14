"use client";

import { useAuthSession } from "@/features/auth/hooks";
import type { ProjectDetail } from "./project-detail-types";

/**
 * Returns `true` iff the currently signed-in account is the owner of the
 * supplied project.
 *
 * Behaviour:
 *   - `false` while the auth session is not yet hydrated (SSR / first
 *     client render). Components can render as "not the owner" on first
 *     paint and switch to "owner" once hydration completes — this matches
 *     the existing `useAuthSession` SSR-safe pattern.
 *   - `false` if either:
 *       - the project has no nested `owner` (older API responses), or
 *       - there is no signed-in account.
 *   - `true` only when `account.accountId === project.owner.id`. Strict
 *     equality — we never fall back to `project.ownerId` because the API
 *     exposes both fields and using `ownerId` would race against cases
 *     where the project record's `ownerId` was migrated but the nested
 *     `owner` view hasn't been rebuilt.
 *
 * Used by project-overview cards to gate owner-only actions like
 * "Invite provider" (members card) and to hide the "Send message"
 * affordance when the viewer IS the project owner (owner card).
 */
export function useIsProjectOwner(project: ProjectDetail): boolean {
  const { account, isHydrated } = useAuthSession();

  // Defer the "true" decision until we know the auth state is real. On
  // the server (and the very first client render before hydration) we
  // pretend the viewer is NOT the owner so the UI doesn't briefly
  // expose owner-only buttons before the token store is consulted.
  if (!isHydrated) return false;
  if (!account) return false;
  const owner = project.owner;
  if (!owner) return false;

  return account.accountId === owner.id;
}
