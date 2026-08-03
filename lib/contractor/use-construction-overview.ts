"use client";

import * as React from "react";

import {
  useConstructionItems,
} from "@/features/projects/use-construction";
import { useIssues } from "@/features/projects/use-issues";
import type {
  ConstructionItem,
  ConstructionStatus,
} from "@/features/projects/construction-types";
import type { Issue, IssueStatus } from "@/features/projects/issue-types";

import type {
  ConstructionOverviewData,
  MilestonePhase,
  MilestoneStatus,
} from "@/features/projects/contractor/construction-overview-data";

/**
 * Resolve the contractor's `MilestonePhase[]` (the shape the overview UI
 * was originally designed against) from real backend data.
 *
 * Sources:
 *   - `GET /api/project-workings/{id}/construction-items` →
 *     `ConstructionItem[]` (top-level + sub milestones, via
 *     `useConstructionItems`).
 *   - `GET /api/project-workings/{id}/issues` → `Issue[]` (open/in_progress
 *     ones drive the `blocked` decoration per milestone).
 *
 * Field-by-field mapping:
 *
 *   | UI field                | Source                                  | Notes
 *   |-------------------------|-----------------------------------------|------
 *   | `id`                    | `String(ConstructionItem.id)`           | UI uses string keys
 *   | `shortLabel`            | first 2 words of `name`                 | visual rail node
 *   | `label`                 | `name`                                  | full descriptive name
 *   | `status`                | derived (see `resolvePhaseStatus`)      | API has only 3 states
 *   | `progress`              | derived (see `resolvePhaseProgress`)    | API has no progress field
 *   | `targetDate`            | `estimateAt`                            | nullable — falls back to createdAt
 *   | `startDate`             | `createdAt`                             | placeholder until API adds startAt
 *   | `endDate`               | `actualAt || estimateAt || updatedAt`   | actual wins, then planned, then last touched
 *   | `lead`                  | `"—"`                                   | removed feature per design decision
 *   | `tasks`                 | `[]`                                    | tasks come from a different endpoint (per milestone)
 *   | `blockerCount`          | count of open issues tied to this item  | from `useIssues`
 *   | `photoCount`            | `0`                                     | removed feature
 *
 * Why this hook sits in `lib/contractor/`:
 *   - Adapter pattern: it's the only place that knows about both the
 *     contractor-style `MilestonePhase` and the API contracts.
 *   - Component callers (`ConstructionOverviewHeader`, `MilestoneTrack`,
 *     `MilestoneDetailCard`, `PhaseDetailDrawer`) keep their existing
 *     `MilestonePhase` prop type — they don't need to learn about
 *     `ConstructionItem` / `Issue`.
 *   - All derived KPIs (overallProgress, lastUpdated, projectName) are
 *     computed here so the page renders with one `useConstructionOverview`
 *     call and not 4+ queries at the page level.
 */
export interface UseConstructionOverviewOptions {
  /** Engagement id this overview is scoped to. Disable the hook when null. */
  projectWorkingId: number | string | null;
  /** Project display name (header chip). Pulled from the project page in
   *  practice — accepting it as an option keeps the hook independent of
   *  the engagement hook. */
  projectName?: string;
  /** Project id string for the data envelope (`ConstructionOverviewData.projectId`). */
  projectId?: string;
}

export interface UseConstructionOverviewResult {
  /** Shape the overview UI consumes. Always present (empty `phases: []`
   *  when the API returns nothing) so render code doesn't have to guard
   *  with extra null checks. */
  data: ConstructionOverviewData;
  /** Convenience access to the milestone list, kept in addition to
   *  `data.phases` so callers that want to filter / sort the list don't
   *  have to reach into `data`. */
  phases: MilestonePhase[];
  /** Raw items + issues, exposed for the page's auto-select logic and
   *  for the per-milestone detail drawer (which needs ids to fetch tasks
   *  and per-milestone issues). */
  items: ConstructionItem[];
  issues: Issue[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

export function useConstructionOverview(
  options: UseConstructionOverviewOptions,
): UseConstructionOverviewResult {
  const { projectWorkingId, projectName, projectId } = options;

  const itemsQuery = useConstructionItems({
    projectWorkingId: projectWorkingId ?? 0,
    // Don't pass `status` — we want every milestone so the track shows
    // completed + in-progress + upcoming in correct order.
    enabled: projectWorkingId != null && Number(projectWorkingId) > 0,
  });

  const issuesQuery = useIssues({
    projectWorkingId: projectWorkingId ?? 0,
    enabled: projectWorkingId != null && Number(projectWorkingId) > 0,
  });

  const phases = React.useMemo(
    () => toMilestonePhases(itemsQuery.topLevelItems, issuesQuery.items),
    [itemsQuery.topLevelItems, issuesQuery.items],
  );

  const data = React.useMemo<ConstructionOverviewData>(
    () => ({
      projectId: projectId ?? "",
      projectName: projectName ?? "Project",
      phases,
      overallProgress: computeOverallProgress(phases),
      lastUpdated: computeLastUpdated(itemsQuery.items, issuesQuery.items),
    }),
    [projectId, projectName, phases, itemsQuery.items, issuesQuery.items],
  );

  return {
    data,
    phases,
    items: itemsQuery.items,
    issues: issuesQuery.items,
    isLoading: itemsQuery.isLoading || issuesQuery.isLoading,
    isFetching: itemsQuery.isFetching || issuesQuery.isFetching,
    isError: itemsQuery.isError || issuesQuery.isError,
    refetch: async () => {
      await Promise.all([itemsQuery.refetch(), issuesQuery.refetch()]);
    },
  };
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

/**
 * Map a `ConstructionItem` (one row in `/construction-items`) to a
 * `MilestonePhase` (the contractor-overview UI shape).
 *
 * The UI uses 4 statuses (`completed | inProgress | blocked | upcoming`).
 * The API only has 3 (`pending | in_progress | completed`). We synthesize
 * `blocked` from the issue list at this layer — see `resolvePhaseStatus`.
 */
function toMilestonePhase(
  item: ConstructionItem,
  openIssuesByItem: Map<number, number>,
): MilestonePhase {
  const openIssues = openIssuesByItem.get(item.id) ?? 0;
  return {
    id: String(item.id),
    shortLabel: deriveShortLabel(item.name),
    label: item.name,
    status: resolvePhaseStatus(item.status, openIssues),
    progress: resolvePhaseProgress(item.status, openIssues),
    targetDate: item.estimateAt ?? item.createdAt,
    startDate: item.createdAt,
    endDate: item.actualAt ?? item.estimateAt ?? item.updatedAt,
    lead: "—",
    tasks: [],
    blockerCount: openIssues,
    photoCount: 0,
  };
}

function toMilestonePhases(
  items: ConstructionItem[],
  issues: Issue[],
): MilestonePhase[] {
  const openIssuesByItem = countOpenIssuesByItem(issues);
  // Filter out sub-milestones — they're rendered on the milestones
  // detail page, not on the overview track. The overview focuses on
  // top-level phase progression.
  const topLevel = items.filter((i) => i.parentId == null);
  // Sort by createdAt ascending so the track reads left → right as
  // "earliest planned → latest planned", matching the design intent.
  const ordered = [...topLevel].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  return ordered.map((item) => toMilestonePhase(item, openIssuesByItem));
}

/**
 * `blocked` is a derived state — the API doesn't model it. A milestone
 * is "blocked" when:
 *   - its own status is `pending` or `in_progress`, AND
 *   - there's at least one open or in-progress issue tied to it.
 * The order matters: a `completed` milestone with an unresolved issue
 * should still read as `completed` (the issue is post-completion noise,
 * not a blocker on the milestone itself).
 */
function resolvePhaseStatus(
  status: ConstructionStatus,
  openIssueCount: number,
): MilestoneStatus {
  if (status === "completed") return "completed";
  if (openIssueCount > 0) return "blocked";
  if (status === "in_progress") return "inProgress";
  return "upcoming";
}

/**
 * The API has no progress field. We pick a stable heuristic so the UI
 * has something to render:
 *   - completed → 100%
 *   - in_progress without open issues → 50% (work is happening)
 *   - blocked → 35% (some progress, but stalled by issues)
 *   - pending → 0%
 *
 * The numbers are intentionally coarse — once the backend exposes a
 * real progress field we can drop this and forward `item.progress`.
 */
function resolvePhaseProgress(
  status: ConstructionStatus,
  openIssueCount: number,
): number {
  if (status === "completed") return 100;
  if (status === "in_progress") return openIssueCount > 0 ? 35 : 50;
  return 0;
}

/**
 * Build a map of `constructionItemId → open-issue count`. Only counts
 * `open` and `in_progress` issues — `resolved` and `closed` ones are
 * not blockers.
 */
function countOpenIssuesByItem(issues: Issue[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const issue of issues) {
    if (issue.constructionItemId == null) continue;
    if (!isOpenIssue(issue.status)) continue;
    counts.set(
      issue.constructionItemId,
      (counts.get(issue.constructionItemId) ?? 0) + 1,
    );
  }
  return counts;
}

function isOpenIssue(status: IssueStatus): boolean {
  return status === "open" || status === "in_progress";
}

/**
 * Pull a short label from the milestone name for the track node:
 *   "Demolition & foundation" → "Demolition"
 *   "Site preparation" → "Site"
 *   "Closeout & handover" → "Closeout"
 * Falls back to the full name when the name is empty.
 */
function deriveShortLabel(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "—";
  // Take the first 2 words, cap at 16 chars so the rail node doesn't
  // overflow on narrow screens.
  const firstTwo = trimmed.split(/\s+/).slice(0, 2).join(" ");
  return firstTwo.length > 16 ? firstTwo.slice(0, 14).trimEnd() + "…" : firstTwo;
}

/**
 * Aggregate progress for the hero strip — weighted equally across
 * top-level phases. With no API progress field this is the best we
 * can do without drifting further from the truth.
 */
function computeOverallProgress(phases: MilestonePhase[]): number {
  if (phases.length === 0) return 0;
  const sum = phases.reduce((acc, p) => acc + p.progress, 0);
  return Math.round(sum / phases.length);
}

/**
 * Last-updated timestamp — prefer the most recently touched milestone
 * (its `updatedAt`), fall back to the latest issue, fall back to now.
 * Used by the header pill "Last updated …".
 */
function computeLastUpdated(
  items: ConstructionItem[],
  issues: Issue[],
): string {
  const candidates: string[] = [];
  for (const item of items) candidates.push(item.updatedAt);
  for (const issue of issues) candidates.push(issue.updatedAt);
  if (candidates.length === 0) return new Date().toISOString();
  return candidates.sort().slice(-1)[0]!;
}
