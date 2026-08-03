"use client";

import * as React from "react";

import { useCurrentUser } from "@/features/auth/user-context";
import { useEngagements } from "@/features/projects/use-engagements";
import { useProjectDetail } from "@/features/projects/use-project-detail";

import type { ProjectMembership } from "@/lib/sidebar-config";

/**
 * Resolved membership signal for the current user on the active project.
 *
 *   isLoading — true while any of the underlying queries are pending.
 *   membership — null when there is no project id (e.g. on `/workspace`
 *     or before `useParams` resolves), otherwise a `ProjectMembership`
 *     value computed from the user's role + engagement status.
 *
 * Membership rules:
 *   - Owner of the project → `isMember: true, isActive: project not
 *     completed, contractType: null`.
 *   - Provider with an engagement → `isMember: true` always; `isActive`
 *     toggles on by `Engagement.status` (`accepted` / `requested` are
 *     live; `completed` / `terminated` / `rejected` are not).
 *   - Admin viewing any project → `isMember: true, isActive: true` —
 *     admins always have read access.
 *   - Anyone else (e.g. a provider who isn't engaged here, or an owner
 *     viewing someone else's project) → `isMember: false`. The sidebar
 *     drops every project-scoped section.
 */
export interface UseActiveProjectMembershipResult {
  membership: ProjectMembership;
  isLoading: boolean;
}

const ACTIVE_ENGAGEMENT_STATUSES = new Set(["requested", "accepted"]);

const COMPLETED_PROJECT_STATUSES = new Set(["completed", "closed"]);

/**
 * Drive the project-scoped section filter in `AppSidebar`.
 *
 * The hook is intentionally tolerant: it returns a stable `membership`
 * shape even while queries are in flight (or when auth itself is still
 * hydrating), so the sidebar can render deterministically and avoid
 * flicker on every project navigation.
 */
export function useActiveProjectMembership(
  projectShopOwnerId: string | null,
): UseActiveProjectMembershipResult {
  const { account, isLoading: isUserLoading } = useCurrentUser();

  // Skip every dependent query until we know which side of the auth
  // boundary we're on. `enabled: false` keeps the React Query cache
  // cold for irrelevant keys.
  const ready =
    !isUserLoading &&
    projectShopOwnerId != null &&
    projectShopOwnerId.length > 0 &&
    account != null;

  const projectQuery = useProjectDetail(
    ready ? (projectShopOwnerId as string) : "",
  );

  const serviceProviderProfileId =
    account?.role === "provider" && account.serviceProvider
      ? account.serviceProvider.id
      : null;

  const engagementsQuery = useEngagements({
    projectId: ready ? projectShopOwnerId : undefined,
    providerId: serviceProviderProfileId ?? undefined,
    pageSize: 10,
    enabled: ready && serviceProviderProfileId != null,
  });

  const membership = React.useMemo<ProjectMembership>(() => {
    if (!ready) return null;

    // Admin path — they get read-only access to every project.
    if (account!.role === "admin") {
      return {
        isMember: true,
        isActive: true,
        isCompleted: false,
        contractType: null,
      };
    }

    // Owner path — `ownerId` is the current user's shop-owner profile id.
    if (account!.role === "owner" && account!.shopOwner != null) {
      const ownerId = account!.shopOwner.id;
      const projectDetail = projectQuery.project;
      const projectOwnerId =
        projectDetail.ownerId > 0 ? projectDetail.ownerId : projectDetail.id;
      const isOwner = ownerId === projectOwnerId;
      if (!isOwner) {
        return {
          isMember: false,
          isActive: false,
          isCompleted: false,
          contractType: null,
        };
      }
      // Owner is "active" until the project itself is marked
      // completed; the backend uses a free-form string for project
      // status, so we do a case-insensitive match on the common value.
      const projectStatus = String(projectDetail.status ?? "").toLowerCase();
      const isCompleted = COMPLETED_PROJECT_STATUSES.has(projectStatus);
      return {
        isMember: true,
        isActive: !isCompleted,
        isCompleted,
        contractType: null,
      };
    }

    // Provider path — must find at least one engagement on this project.
    const engagements = engagementsQuery.engagements;
    if (engagements.length === 0) {
      return {
        isMember: false,
        isActive: false,
        isCompleted: false,
        contractType: null,
      };
    }

    // Pick the most permissive contractType across all engagements so a
    // designer-who-also-builds sees both sections even if the data has
    // two split rows. Take the first "live" engagement if there are
    // multiple rows (some completed, some still active).
    const live = engagements.find((e) =>
      ACTIVE_ENGAGEMENT_STATUSES.has(e.status),
    );
    const representative = live ?? engagements[0];
    const isActive = ACTIVE_ENGAGEMENT_STATUSES.has(representative.status);
    // Provider-side "completed" mirrors the engagement status (not the
    // project status — owners and providers see completion through
    // different envelopes).
    const isCompleted = representative.status === "completed";

    // If a provider has both a `design` and a `construction`
    // engagement, surface `both` so the sidebar shows both sections.
    const contractTypes = new Set(engagements.map((e) => e.contractType));
    const contractType: "design" | "construction" | "both" | null =
      contractTypes.size === 0
        ? representative.contractType
        : contractTypes.size > 1
        ? "both"
        : representative.contractType;

    return { isMember: true, isActive, isCompleted, contractType };
  }, [
    ready,
    account,
    projectQuery.project,
    engagementsQuery.engagements,
  ]);

  const isLoading =
    isUserLoading ||
    (ready && (projectQuery.isLoading || engagementsQuery.isLoading));

  return { membership, isLoading };
}