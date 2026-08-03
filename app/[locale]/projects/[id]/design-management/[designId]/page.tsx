"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { DesignDetailPage } from "@/components/design-management/design-detail-page";
import { useCurrentUser } from "@/features/auth/user-context";
import { useEngagements } from "@/features/projects/use-engagements";

/**
 * Design detail page — renders a single design's images + lifecycle actions.
 *
 * Route: `design-management/[designId]/`
 * URL param `[designId]` is the numeric design id from `api/designs`.
 *
 * Data: fetches the engagement to resolve `projectWorkingId` (needed by the
 * design API) and the caller's account to derive role-based action buttons
 * (submit / approve / request-revision / start-revision).
 */
export default function DesignDetailRoutePage() {
  const params = useParams<{ id: string; designId: string }>();
  const projectId = params?.id ?? "";
  const { account } = useCurrentUser();

  // Resolve projectWorkingId for the design API call.
  const { engagements } = useEngagements({
    projectId,
    status: "accepted",
    pageSize: 1,
  });
  const projectWorkingId = engagements[0]?.id ?? null;

  return (
    <DesignDetailPage
      projectId={projectId}
      projectWorkingId={projectWorkingId}
      currentUserId={account?.id ?? null}
    />
  );
}
