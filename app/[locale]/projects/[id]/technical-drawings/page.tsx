"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";

import {
  ApprovedDrawingsView,
  type ApprovedDrawingsViewLabels,
} from "@/components/design-management/approved-drawings-view";
import {
  useEngagementOverview,
  useEngagements,
} from "@/features/projects/use-engagements";
import { useDesigns } from "@/features/projects/use-designs";
import { useCurrentUser } from "@/features/auth/user-context";
import type { DesignType } from "@/features/projects/design-types";
import type {
  Engagement,
  EngagementDesignSummary,
} from "@/features/projects/engagement-types";

/**
 * `/projects/[id]/technical-drawings` — read-only view of the designs the
 * owner has approved on this project, for everyone on it. Lives under
 * "Project Info": the signed-off set is a fact about the project, not a
 * tool of either trade.
 *
 * Only the final, approved version of each design is shown, images inline.
 * No version history and no link to the designer's detail page: the
 * constructor builds from what was signed off, not from the drafts.
 *
 * Data flow — two sources, because no single endpoint serves every viewer:
 *   1. `useEngagements` lists the viewer's engagements on the project
 *      (scoped to their own providerId), and `pickEngagement` chooses one.
 *   2a. Construction-only engagement → `useEngagementOverview` calls
 *      `GET /api/project-workings/{id}/overview`, whose `approvedDesigns`
 *      holds every approved design on the project, with images. It is the
 *      only endpoint that hands the designer's work to the constructor:
 *      `GET /api/designs` is scoped to the parties of the designer's own
 *      engagement.
 *   2b. Any other engagement (`design` / `both` — the overview gives those
 *      `null`) → `GET /api/designs?projectWorkingId=…&status=approved`.
 *      That engagement is the one the designs belong to, and the designer
 *      and the owner are both parties to it.
 *   3. `ApprovedDrawingsView` renders them, with a lightbox per image.
 */

// What the overview still answers at. It refuses `rejected` and `terminated`;
// `completed` stays readable so the drawings remain a reference after
// handover. `accepted` first — it is the engagement the work runs under.
const STATUS_PRIORITY: ReadonlyArray<Engagement["status"]> = [
  "accepted",
  "completed",
  "requested",
];

/**
 * The engagement to read the approved designs through.
 *
 * Construction-only first: through it the overview returns the whole
 * project's approved set. Otherwise the design-side engagement, whose own
 * designs are that set. An owner sees both kinds and lands on the
 * construction one when there is one — same set either way.
 */
function pickEngagement(engagements: Engagement[]): Engagement | null {
  const byStatus = (list: Engagement[]) => {
    for (const status of STATUS_PRIORITY) {
      const hit = list.find((e) => e.status === status);
      if (hit) return hit;
    }
    return null;
  };
  return (
    byStatus(engagements.filter((e) => e.contractType === "construction")) ??
    byStatus(engagements)
  );
}

export default function TechnicalDrawingsPage() {
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id ?? "";

  const t = useTranslations("TechnicalDrawings");
  const errorT = useTranslations("TechnicalDrawings.errorBanner");
  const typeT = useTranslations("DesignManagement.tabs");
  const viewerT = useTranslations("DesignManagement.viewer");
  const format = useFormatter();

  const { account } = useCurrentUser();
  const isProvider = account?.role === "provider";
  const viewerProfileId = account?.serviceProvider?.id ?? null;

  // Providers are scoped to their OWN providerId: without it this query
  // returned every engagement on the project, so a provider with no
  // engagement here (or a rejected one) was shown another provider's
  // drawings. Owners and admins aren't scoped — they're entitled to the
  // project's drawings regardless of which engagement produced them — but a
  // provider who isn't engaged gets no engagement id, so the overview query
  // never fires and the page renders its empty state.
  const { engagements, isLoading: isLoadingEngagements } = useEngagements({
    projectId: projectIdParam,
    providerId: isProvider ? (viewerProfileId ?? undefined) : undefined,
    pageSize: 10,
    enabled: isProvider ? viewerProfileId != null : true,
  });
  const engagement = pickEngagement(engagements);
  const engagementId = engagement?.id ?? null;
  const viaOverview = engagement?.contractType === "construction";

  // 2a — construction-only engagement.
  const overviewQuery = useEngagementOverview({
    engagementId: engagementId == null ? "" : String(engagementId),
    enabled: viaOverview && engagementId != null && engagementId !== "",
  });

  // 2b — design / both engagement.
  const designsQuery = useDesigns({
    projectWorkingId: engagementId,
    status: "approved",
    enabled: !viaOverview && engagementId != null,
  });

  const source = viaOverview
    ? {
        designs: overviewQuery.overview?.approvedDesigns ?? [],
        isLoading: overviewQuery.isLoading,
        isFetching: overviewQuery.isFetching,
        isError: overviewQuery.isError,
        refetch: overviewQuery.refetch,
      }
    : {
        designs: designsQuery.designs,
        isLoading: designsQuery.isLoading,
        isFetching: designsQuery.isFetching,
        isError: designsQuery.isError,
        refetch: designsQuery.refetch,
      };

  // Images in upload order. Neither endpoint orders them (no ORDER BY), so
  // Postgres hands them back in whatever order it likes and a set uploaded
  // as sheet 1, 2, 3, 4 rendered as 4, 1, 2, 3. Sorted here, once, so the
  // grid and the lightbox's prev/next agree on what "next" is.
  const approvedDesigns = React.useMemo<EngagementDesignSummary[]>(
    () =>
      source.designs.map((design) => ({
        id: design.id,
        title: design.title,
        version: Number(design.version),
        type: design.type,
        updatedAt: design.updatedAt,
        images: [...(design.images ?? [])].sort(
          (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
        ),
      })),
    [source.designs],
  );

  const labels = React.useMemo<ApprovedDrawingsViewLabels>(
    () => ({
      empty: t("approved.empty"),
      versionPrefix: t("approved.version"),
      loading: t("approved.refreshing"),
      footer: t("approved.footer"),
      noImages: t("approved.noImages"),
      typeLabel: (type: DesignType) => typeT(TYPE_LABEL_KEY[type] ?? "all"),
      approvedOn: (updatedAt: string) =>
        t("approved.approvedOn", {
          date: format.dateTime(new Date(updatedAt), { dateStyle: "medium" }),
        }),
      imageCount: (count: number) => t("approved.imageCount", { count }),
      viewer: {
        prev: viewerT("prev"),
        next: viewerT("next"),
        openOriginal: t("actions.openInNewTab"),
        unavailable: viewerT("unavailable"),
      },
      errorTitle: errorT("title"),
      errorSubtitle: errorT("subtitle"),
      retry: errorT("retry"),
    }),
    [t, errorT, typeT, viewerT, format],
  );

  return (
    <ApprovedDrawingsView
      approvedDesigns={approvedDesigns}
      isLoading={isLoadingEngagements || source.isLoading}
      isFetching={source.isFetching}
      isError={source.isError}
      onRefetch={() => {
        void source.refetch();
      }}
      title={t("pageTitle")}
      subtitle={t("pageSubtitle")}
      labels={labels}
    />
  );
}

// `DesignType` → key under `DesignManagement.tabs.*`, the labels the
// designer's own tabs already use for the same four types.
const TYPE_LABEL_KEY: Record<DesignType, string> = {
  concept: "concept",
  layout_2d: "layout2d",
  render_3d: "render3d",
  technical_drawing: "technicalDrawing",
};
