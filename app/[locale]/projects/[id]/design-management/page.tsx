"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { VersionListTable } from "@/components/design-management/version-list-table";
import { useCurrentUser } from "@/features/auth/user-context";
import { useEngagements } from "@/features/projects/use-engagements";
import { useDesigns } from "@/features/projects/use-designs";

/**
 * Design management landing page.
 *
 * Wires three calls:
 *   1. `useEngagements({ projectId, status: "accepted" })` → picks the
 *      engagement id for this provider on the current project.
 *      (Designs are scoped to a `projectWorkingId`, not the legacy
 *      `projectShopOwnerId`.)
 *   2. `useDesigns({ projectWorkingId })` → `GET /api/designs?…` — the
 *      real list, replacing the mock array used during scaffolding.
 *   3. `useCurrentUser` → `account.id` is forwarded as `createdBy` when
 *      posting a new design via `NewVersionDialog`.
 *
 * The `VersionListTable` consumes the legacy `DesignVersion[]` shape; we
 * convert the `Design[]` API records into that shape inside `useDesigns`
 * so the rest of the page (tabs, table, comments rail) keeps working
 * without churn.
 *
 * Read-only mode for construction-only providers:
 *   - When the viewer is a provider whose `capability` is `construction`
 *     (i.e. a pure constructor), we ask `useDesigns` for `status:
 *     "approved"` only and hide the action buttons (`showActions: false`)
 *     so the page doubles as their approved-drawings index.
 *   - Designers and `both`-capability providers get the full set and
 *     keep the action buttons so they can author / publish new versions.
 *   - Owners and admins are unaffected; they get the full set.
 *
 * Note: viewers who want a clean read-only index of approved drawings
 * (no designer shell) should go to `/projects/{id}/technical-drawings`
 * — that route exists alongside this one for constructor/owner/admin
 * navigation.
 */
export default function DesignManagementPage() {
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id ?? "";

  const { account } = useCurrentUser();

  // Capability gate — providers with construction-only capability see
  // a filtered, read-only index of approved drawings. Everything else
  // gets the full list + authoring actions.
  const isReadOnlyViewer =
    account?.role === "provider" &&
    account.serviceProvider?.capability === "construction";

  // Find the engagement this provider is on for the project.  Today the
  // list endpoint is filtered by `projectShopOwnerId`, so we map the
  // URL segment straight through.  When multiple accepted engagements
  // exist (rare — usually one provider per project) we take the first.
  const { engagements, isLoading: isLoadingEngagements } = useEngagements({
    projectId: projectIdParam,
    status: "accepted",
    pageSize: 1,
  });
  const engagementId = engagements[0]?.id ?? null;

  const {
    versions,
    isLoading: isLoadingDesigns,
    isFetching: isFetchingDesigns,
    isError: isDesignsError,
    refetch,
  } = useDesigns({
    projectWorkingId: engagementId,
    // Server-side filter so the constructor doesn't pay for in-progress
    // / submitted / revision drafts they shouldn't see in the first place.
    status: isReadOnlyViewer ? "approved" : undefined,
  });

  return (
    <VersionListTable
      projectId={projectIdParam}
      projectWorkingId={engagementId}
      createdBy={account?.id ?? null}
      versions={versions}
      isLoading={isLoadingEngagements || isLoadingDesigns}
      isFetching={isFetchingDesigns}
      isError={isDesignsError}
      onRefetch={() => {
        void refetch();
      }}
      showActions={!isReadOnlyViewer}
      titleKey={isReadOnlyViewer ? "readOnlyTitle" : "pageTitle"}
      subtitleKey={isReadOnlyViewer ? "readOnlySubtitle" : "pageSubtitle"}
    />
  );
}