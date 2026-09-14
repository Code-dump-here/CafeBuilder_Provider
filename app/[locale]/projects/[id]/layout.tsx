"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { PROJECT_SEGMENT_SHEET } from "@/components/drawing-set/sheet-title";
import { TitleBlock, TitleCell } from "@/components/drawing-set/title-block";
import { ProjectHeroBar } from "@/components/project-overview/project-hero-bar";
import { useCurrentUser } from "@/features/auth/user-context";
// next-intl's usePathname, as the breadcrumb uses: next/navigation's keeps the
// locale prefix (`/vi/projects/…`), so the `startsWith` below failed for
// Vietnamese and every sub-page was treated as the project root — hero shown,
// back link hidden, on payments, contracts and the rest.
import { usePathname } from "@/i18n/navigation";
import { useProjectDetail } from "@/features/projects/use-project-detail";

/**
 * This version of Next.js is not the one you know — APIs, conventions, and
 * file structure may differ from your training data. Read the relevant
 * guide in `node_modules/next/dist/docs/` before writing any code.
 *
 * Per-project shell. Wraps every page under `/projects/{id}` and renders
 * the `ProjectHeroBar` only for the project root (`/[locale]/projects/[id]`)
 * — pages under "Design Work" (design-management, technical-drawings) or
 * "Messages" don't show the hero.
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
  const params = useParams<{ locale?: string; id: string }>();
  const projectIdParam = params?.id ?? "";
  const locale = params?.locale ?? "";
  const pathname = usePathname();
  const t = useTranslations("Breadcrumb");

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

  // Anywhere below the project root, offer an explicit way back up. The
  // breadcrumb's project-name crumb already links here, but it reads as a
  // trail rather than an action — easy to miss when you're several
  // sub-pages deep and just want out.
  const isProjectRoot = firstSegment === "";

  return (
    <div className="flex flex-1 flex-col gap-6">
      {!isProjectRoot ? (
        <Link
          href={`/${locale}/projects/${projectIdParam}`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToOverview")}
        </Link>
      ) : null}
      {showHero && !isError && !isLoading ? (
        <ProjectHeroBar project={project} />
      ) : null}
      {children}
      {project && !isError ? (
        <SheetFooter
          projectName={project.name}
          address={project.address}
          sheet={PROJECT_SEGMENT_SHEET[firstSegment]}
          updatedAt={project.updatedAt}
        />
      ) : null}
    </div>
  );
}

/**
 * The title block along the foot of the sheet: which project, where, who
 * drew it, which sheet and when it last changed. Every fact is real; it sits
 * at the end of the page, where a short page otherwise just stopped.
 */
function SheetFooter({
  projectName,
  address,
  sheet,
  updatedAt,
}: {
  projectName: string;
  address: string;
  sheet: string | undefined;
  updatedAt: Date;
}) {
  const t = useTranslations("DrawingSet.footer");
  const format = useFormatter();
  const { account } = useCurrentUser();
  const drawnBy = account?.serviceProvider?.displayName;

  return (
    <footer className="mt-auto pt-4">
      <TitleBlock className="w-full bg-background/80">
        <TitleCell label={t("project")} grow>
          <span className="block truncate">{projectName}</span>
        </TitleCell>
        {address ? (
          <TitleCell label={t("address")} grow className="hidden md:flex">
            <span className="block truncate">{address}</span>
          </TitleCell>
        ) : null}
        {drawnBy ? (
          <TitleCell label={t("drawnBy")} className="hidden sm:flex">
            {drawnBy}
          </TitleCell>
        ) : null}
        {sheet ? (
          <TitleCell label={t("sheet")} emphasis>
            {sheet}
          </TitleCell>
        ) : null}
        <TitleCell label={t("updated")}>
          {format.dateTime(updatedAt, { day: "2-digit", month: "2-digit", year: "numeric" })}
        </TitleCell>
      </TitleBlock>
    </footer>
  );
}