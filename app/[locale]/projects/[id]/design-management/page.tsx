"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { VersionListTable } from "@/components/design-management/version-list-table";
import { useCurrentUser } from "@/lib/auth/user-context";
import { useEngagements } from "@/lib/projects/use-engagements";
import { useDesigns } from "@/lib/projects/use-designs";

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
 */
export default function DesignManagementPage() {
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id ?? "";

  const { account } = useCurrentUser();

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
    />
  );
}