"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  ApprovedDrawingsView,
  type ApprovedDrawingsViewLabels,
} from "@/components/design-management/approved-drawings-view";
import {
  useEngagementOverview,
  useEngagements,
} from "@/features/projects/use-engagements";
import { useCurrentUser } from "@/features/auth/user-context";

/**
 * `/projects/[id]/technical-drawings` — read-only index of approved
 * drawings for everyone who is NOT a designer actively authoring work.
 *
 * Audience (after sidebar reshuffle that exposes this nav item to both
 * designer and constructor views):
 *   - Constructor (any capability / project member).
 *   - Project owner.
 *   - Admin.
 *   - Designer whose design engagement on this project isn't accepted
 *     yet — they fall back to the read-only feed instead of an empty
 *     editor surface.
 *
 * Data flow:
 *   1. `useEngagements({ status: "accepted", pageSize: 10 })` lists the
 *      viewer's accepted engagements on the project. The first row
 *      is forwarded as the working id.
 *   2. `useEngagementOverview({ engagementId })` calls
 *      `GET /api/project-workings/{id}/overview` and returns
 *      `approvedDesigns: EngagementDesignSummary[]`.
 *   3. `ApprovedDrawingsView` renders the approved list with a link to
 *      the per-design detail page — which is `/projects/{id}/design-management/{designId}`,
 *      shared with the designer's authoring surface so both audiences
 *      land on the same detail view when they click a row.
 *
 * The page is intentionally narrow: no tabs, no filters, no actions.
 * Tabs/filters belong in the designer's work surface; this is the
 * one-shot read-only index of approved sheets.
 */
export default function TechnicalDrawingsPage() {
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id ?? "";

  const t = useTranslations("TechnicalDrawings");
  const errorT = useTranslations("TechnicalDrawings.errorBanner");

  const { account } = useCurrentUser();
  const isProvider = account?.role === "provider";
  const viewerProfileId = account?.serviceProvider?.id ?? null;

  // Pick the viewer's first accepted engagement on the project.
  //
  // Providers are scoped to their OWN providerId: without it this query
  // returned every accepted engagement on the project and took the first
  // row, so a provider with no engagement here (or a rejected one) was
  // shown another provider's approved drawings. Owners and admins aren't
  // scoped — they're entitled to the project's drawings regardless of
  // which engagement produced them — but a provider who isn't engaged
  // gets no engagement id, so the overview query never fires and the
  // page renders its empty state.
  const { engagements, isLoading: isLoadingEngagements } = useEngagements({
    projectId: projectIdParam,
    providerId: isProvider ? (viewerProfileId ?? undefined) : undefined,
    status: "accepted",
    pageSize: 10,
    enabled: isProvider ? viewerProfileId != null : true,
  });
  const engagementId = engagements[0]?.id ?? null;

  const overviewQuery = useEngagementOverview({
    engagementId: engagementId == null ? "" : String(engagementId),
    enabled: engagementId != null && engagementId !== "",
  });

  const approvedDesigns = overviewQuery.overview?.approvedDesigns ?? [];

  const labels = React.useMemo<ApprovedDrawingsViewLabels>(
    () => ({
      empty: t("approved.empty"),
      open: t("approved.open"),
      versionPrefix: t("approved.version"),
      loading: t("approved.refreshing"),
      footer: t("approved.footer"),
      errorTitle: errorT("title"),
      errorSubtitle: errorT("subtitle"),
      retry: errorT("retry"),
    }),
    [t, errorT],
  );

  return (
    <ApprovedDrawingsView
      approvedDesigns={approvedDesigns}
      projectId={projectIdParam}
      isLoading={isLoadingEngagements || overviewQuery.isLoading}
      isFetching={overviewQuery.isFetching}
      isError={overviewQuery.isError}
      onRefetch={() => {
        void overviewQuery.refetch();
      }}
      title={t("pageTitle")}
      subtitle={t("pageSubtitle")}
      labels={labels}
    />
  );
}