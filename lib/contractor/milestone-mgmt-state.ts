/**
 * Management-page-only task shape.
 *
 * The overview / drawer still render from the lighter
 * `MilestonePhase.tasks: string[]` so we don't have to migrate every
 * reader. The management page, on the other hand, needs richer task
 * info (description, assignee, due date) — so it holds its own state
 * parallel to `MILESTONE_PHASES`, keyed by `<phaseId>:<taskIndex>`.
 *
 * When a real backend lands, both layers collapse back into one
 * `MilestoneTask[]` and the reducer becomes a server action.
 */

export interface MilestoneTask {
  /** Unique id for stable React keys + DOM ids. */
  id: string;
  title: string;
  /** Short free-text description shown in the task detail view. */
  description?: string;
  /** ISO date the task is targeted to complete by. */
  dueDate?: string;
  /** Crew member id from the parent phase's `phaseExtras.crew[]`. */
  assigneeId?: string;
  /**
   * Image URLs (or data: URIs) shown as a gallery in the task detail
   * view. Mock-only — when the backend lands this becomes a list of
   * uploaded asset refs.
   */
  images?: string[];
  /** ISO timestamp the task was first added. */
  createdAt?: string;
}

/**
 * Sparse map keyed by `<phaseId>:<taskIndex>` matching the order of
 * `MilestonePhase.tasks`. Undefined / missing entries fall back to the
 * title-only view used elsewhere — the management page resolves them
 * lazily.
 */
export type TaskMetaMap = Record<string, MilestoneTask>;

/**
 * Build the canonical key from a phase id + task index.
 */
export function taskKey(phaseId: string, taskIndex: number): string {
  return `${phaseId}:${taskIndex}`;
}

/**
 * Resolve a task's effective meta by combining the title (always
 * authoritative, lives in `MilestonePhase.tasks`) with the optional
 * rich fields stored in `taskMetaMap`. If no entry exists, returns a
 * synthetic record seeded with the title.
 */
export function resolveTask(
  phaseId: string,
  taskIndex: number,
  title: string,
  map: TaskMetaMap
): Required<Pick<MilestoneTask, "id" | "title">> & MilestoneTask {
  const key = taskKey(phaseId, taskIndex);
  const existing = map[key];
  if (existing) return existing;
  return {
    id: key,
    title,
  };
}