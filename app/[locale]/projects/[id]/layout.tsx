"use client";

import * as React from "react";
import { useParams, usePathname } from "next/navigation";

import { ProjectHeroBar } from "@/components/project-overview/project-hero-bar";
import { useProjectDetail } from "@/lib/projects/use-project-detail";

/**
 * Per-project shell. Wraps every page under `/projects/{id}` and renders
 * the `ProjectHeroBar` only for the project root (`/[locale]/projects/[id]`)
 * — pages under "Design Work" (design-management, technical-drawings) or
 * "Collaboration" don't show the hero.
 *
 * Why a layout, not per-page:
 *   - Single source of truth for hero visibility — pages stay focused on
 *     their own content.
 *   - The check follows the same `PROJECT_SEGMENT_TITLE_KEY` map the
 *     sidebar uses, so the two stay in sync when nav items are added.
 */
export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id ?? "";
  const pathname = usePathname();

  const { project, isLoading, isError } = useProjectDetail(projectIdParam);

  // First URL segment under `/projects/{id}` — `""` for the root,
  // `"/briefs"` for briefs, etc. Co-located with the same map the sidebar
  // uses (see `PROJECT_SEGMENT_TITLE_KEY` in `lib/sidebar-config.ts`) so
  // a new "Project Info" nav item only needs to be added in two places:
  // here for hero visibility, in the sidebar for the link.
  const marker = `/projects/${projectIdParam}`;
  const afterMarker = pathname.startsWith(marker)
    ? pathname.slice(marker.length)
    : "";
  const firstSegment = afterMarker === "" ? "" : `/${afterMarker.split("/").filter(Boolean)[0] ?? ""}`;

  // Sub-routes of "Project Info" — keep in lock-step with the sidebar's
  // `DESIGNER_PROJECT_INFO` block (the top "Project Info" group).
  const PROJECT_INFO_SEGMENTS: ReadonlySet<string> = new Set([
    "", // overview / project root
    "/survey",
  ]);

  const showHero = PROJECT_INFO_SEGMENTS.has(firstSegment);

  return (
    <div className="flex flex-col gap-6">
      {showHero && !isError && !isLoading ? (
        <ProjectHeroBar project={project} />
      ) : null}
      {children}
    </div>
  );
}