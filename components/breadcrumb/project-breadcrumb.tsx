"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { PROJECT_SEGMENT_TITLE_KEY } from "@/lib/sidebar-config";

interface ProjectBreadcrumbProps {
  /** Optional locale prefix when not derivable from params. */
  localePrefix?: string;
}

/**
 * Renders a breadcrumb for project-scoped routes:
 *
 *     My Projects > {ProjectName} > {SubPage}
 *
 * - `My Projects` is a static root crumb back to `/my-projects` — the only
 *   in-page way out of a project page besides the sidebar's own brand
 *   header link.
 * - `ProjectName` falls back to the current `[id]` segment. The component is
 *   intentionally agnostic about the real project API so it works without
 *   one wired up; swap the fallback for a fetched name later.
 * - The trailing sub-page label is resolved from `PROJECT_SEGMENT_TITLE_KEY`
 *   (derived from the sidebar config) and translated via next-intl.
 *
 * On the project root (`/projects/{id}`) the project name is the last
 * (bold, non-muted) crumb, with no trailing chevron.
 */
export function ProjectBreadcrumb({ localePrefix }: ProjectBreadcrumbProps) {
  const t = useTranslations();
  const params = useParams<{ locale?: string; id?: string }>();
  const pathname = usePathname();

  const projectId = params?.id;
  const locale = localePrefix ?? params?.locale ?? "";

  if (!projectId) return null;

  const projectHref = `/${locale}/projects/${projectId}`;
  const projectName = t("Breadcrumb.projectFallback", { id: projectId });

  // `pathname` looks like "/vi/projects/123/survey" or "/vi/projects/123".
  // Compute the suffix relative to `/projects/{id}`.
  const marker = `/projects/${projectId}`;
  const afterMarker = pathname.startsWith(marker)
    ? pathname.slice(marker.length)
    : "";
  // `afterMarker` is "" or "/something". Normalize to a key.
  const segment = afterMarker === "" ? "" : afterMarker;

  const titleKey = PROJECT_SEGMENT_TITLE_KEY[segment];
  const subPageLabel = titleKey ? t(titleKey) : null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm"
    >
      {/* Root crumb — without it, a page deep under /projects/{id} had no
          in-page way back to the project list at all (the sidebar's own
          brand header is the only other way out, and it can be collapsed
          out of view). */}
      <Link
        href={`/${locale}/my-projects`}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        {t("Breadcrumb.myProjects")}
      </Link>
      <ChevronRight
        className="size-4 text-muted-foreground/60"
        aria-hidden="true"
      />
      <Link
        href={projectHref}
        className={
          subPageLabel
            ? "text-muted-foreground transition-colors hover:text-foreground"
            : "font-semibold text-foreground"
        }
      >
        {projectName}
      </Link>
      {subPageLabel && (
        <>
          <ChevronRight
            className="size-4 text-muted-foreground/60"
            aria-hidden="true"
          />
          <span className="font-semibold text-foreground">{subPageLabel}</span>
        </>
      )}
    </nav>
  );
}
