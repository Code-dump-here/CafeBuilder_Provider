"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { VersionListTable } from "@/components/design-management/version-list-table";
import { useDesignVersions } from "@/lib/projects/use-design-versions";

/**
 * Design management landing page.
 *
 * Lists every version of the project. Each row links through to the
 * per-version detail page (tree / viewer / history). The right-hand
 * comments rail drives inline review without leaving the list.
 *
 * Why `VersionListTable` lives separately:
 *   - The same list surface is reused on the design-brief flow, so
 *     keeping it componentised avoids drift between the two views.
 */
export default function DesignManagementPage() {
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id ?? "";
  const versions = useDesignVersions(projectIdParam);

  return (
    <VersionListTable projectId={projectIdParam} versions={versions} />
  );
}