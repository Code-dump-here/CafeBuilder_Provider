"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

// next-intl's usePathname, not the one from next/navigation: the latter keeps
// the locale prefix ("/vi/projects/123/survey"), while the marker built below
// has none, so `startsWith` never matched and EVERY sub-page fell back to the
// project-overview label instead of its own.
import { usePathname } from "@/i18n/navigation";

import { PROJECT_SEGMENT_TITLE_KEY } from "@/lib/sidebar-config";
import { useProjectDetail } from "@/features/projects/use-project-detail";

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
 * - `ProjectName` is the project's real name, read through
 *   `useProjectDetail`. Every project page already loads that query, so this
 *   reads from the React Query cache rather than issuing its own request.
 *   Until it resolves the crumb is a placeholder rather than the raw uuid —
 *   printing an id the reader can do nothing with, then swapping it out, is
 *   worse than showing nothing for a moment.
 * - The trailing sub-page label is resolved from `PROJECT_SEGMENT_TITLE_KEY`
 *   (derived from the sidebar config) and translated via next-intl.
 *
 * On the project root (`/projects/{id}`) the project name is the last
 * (bold, non-muted) crumb, with no trailing chevron.
 */
/**
 * The project's name, or a stand-in while it loads.
 *
 * Split out so `useProjectDetail` is called unconditionally within a component
 * that only mounts once a project id exists — the parent returns early when
 * there is none, and a hook cannot sit behind that.
 */
function ProjectCrumbLabel({ projectId }: { projectId: string }) {
  const t = useTranslations();
  const { project, isLoading, isError } = useProjectDetail(projectId);

  const name = project.name?.trim();
  if (name) return <>{name}</>;

  if (isLoading) {
    return (
      <span
        className="inline-block h-4 w-24 animate-pulse rounded bg-muted align-middle"
        aria-label={t("Breadcrumb.projectLoading")}
      />
    );
  }

  // Unreachable name (404, no permission, blank): a short handle still tells
  // two projects apart, where a full uuid only adds noise.
  return (
    <>
      {isError || !name
        ? t("Breadcrumb.projectFallback", { id: projectId.slice(0, 8) })
        : projectId}
    </>
  );
}

export function ProjectBreadcrumb({ localePrefix }: ProjectBreadcrumbProps) {
  const t = useTranslations();
  const params = useParams<{ locale?: string; id?: string }>();
  const pathname = usePathname();

  const projectId = params?.id;
  const locale = localePrefix ?? params?.locale ?? "";

  if (!projectId) return null;

  const projectHref = `/${locale}/projects/${projectId}`;

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
        <ProjectCrumbLabel projectId={projectId} />
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
