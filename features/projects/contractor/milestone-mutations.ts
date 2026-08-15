/**
 * Pure mutations for milestone + task management.
 *
 * The `/milestones` page holds the full state in-memory (no backend
 * yet) and applies these reducers to derive the next snapshot. Keeping
 * the logic pure makes it trivial to wire a real backend later —
 * replace the reducer with a server action and the UI is unchanged.
 */

import type {
  MilestonePhase,
  MilestoneStatus,
  PhaseExtras,
} from "./construction-overview-data";
import type { MilestoneTask, TaskMetaMap } from "./milestone-mgmt-state";
import { taskKey } from "./milestone-mgmt-state";

export interface MilestoneState {
  phases: MilestonePhase[];
  /** Keyed by phase id; carries optional narrative + blockers + crew + photos. */
  extras: Record<string, PhaseExtras>;
  /**
   * Per-task completion state. Keyed by `<phaseId>:<taskIndex>` so a
   * rename doesn't invalidate progress counters.
   */
  taskDone: Record<string, boolean>;
  /**
   * Rich task metadata (description / due date / photos). Keyed by
   * `<phaseId>:<taskIndex>`. Sparse — missing entries mean "just a
   * title".
   */
  taskMeta: TaskMetaMap;
}

export type MilestoneAction =
  | { type: "rename_phase"; phaseId: string; label: string }
  | { type: "update_phase_meta"; phaseId: string; lead: string; targetDate: string; startDate: string; endDate: string }
  | { type: "set_phase_progress"; phaseId: string; progress: number }
  | { type: "set_phase_status"; phaseId: string; status: MilestoneStatus }
  | { type: "add_phase"; label: string; lead: string; targetDate: string; startDate: string; endDate: string }
  | { type: "remove_phase"; phaseId: string }
  | { type: "move_phase"; phaseId: string; direction: "left" | "right" }
  | {
      type: "add_task";
      phaseId: string;
      title: string;
      description?: string;
      dueDate?: string;
      images?: string[];
    }
  | { type: "edit_task"; phaseId: string; taskIndex: number; title: string }
  | {
      type: "set_task_meta";
      phaseId: string;
      taskIndex: number;
      description?: string;
      dueDate?: string;
      images?: string[];
      createdAt?: string;
    }
  | { type: "remove_task"; phaseId: string; taskIndex: number }
  | { type: "toggle_task"; phaseId: string; taskIndex: number }
  | { type: "move_task"; fromPhaseId: string; toPhaseId: string; taskIndex: number };

export function milestoneReducer(
  state: MilestoneState,
  action: MilestoneAction
): MilestoneState {
  switch (action.type) {
    case "rename_phase":
      return mutatePhase(state, action.phaseId, (p) => ({
        ...p,
        label: action.label,
        shortLabel: deriveShortLabel(action.label),
      }));

    case "update_phase_meta":
      return mutatePhase(state, action.phaseId, (p) => ({
        ...p,
        lead: action.lead,
        targetDate: action.targetDate,
        startDate: action.startDate,
        endDate: action.endDate,
      }));

    case "set_phase_progress":
      return mutatePhase(state, action.phaseId, (p) => ({
        ...p,
        progress: clamp(action.progress, 0, 100),
      }));

    case "set_phase_status": {
      return mutatePhase(state, action.phaseId, (p) => {
        const next: MilestonePhase = { ...p, status: action.status };
        if (action.status === "completed") next.progress = 100;
        if (action.status === "upcoming") next.progress = 0;
        return next;
      });
    }

    case "add_phase": {
      const id = newPhaseId(state.phases);
      const created: MilestonePhase = {
        id,
        shortLabel: deriveShortLabel(action.label),
        label: action.label,
        status: "upcoming",
        progress: 0,
        targetDate: action.targetDate,
        startDate: action.startDate,
        endDate: action.endDate,
        lead: action.lead,
        tasks: [],
        blockerCount: 0,
        photoCount: 0,
      };
      return {
        ...state,
        phases: [...state.phases, created],
        extras: {
          ...state.extras,
          [id]: { narrative: "", blockers: [], crew: [], photos: [] },
        },
      };
    }

    case "remove_phase": {
      const idx = state.phases.findIndex((p) => p.id === action.phaseId);
      if (idx < 0) return state;
      const phases = state.phases.filter((p) => p.id !== action.phaseId);
      const extras = { ...state.extras };
      delete extras[action.phaseId];
      const prefix = `${action.phaseId}:`;
      const taskDone = Object.fromEntries(
        Object.entries(state.taskDone).filter(([k]) => !k.startsWith(prefix))
      );
      const taskMeta = Object.fromEntries(
        Object.entries(state.taskMeta).filter(([k]) => !k.startsWith(prefix))
      );
      return { phases, extras, taskDone, taskMeta };
    }

    case "move_phase": {
      const idx = state.phases.findIndex((p) => p.id === action.phaseId);
      if (idx < 0) return state;
      const swapWith = action.direction === "left" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= state.phases.length) return state;
      const next = [...state.phases];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return { ...state, phases: next };
    }

    case "add_task": {
      const phase = state.phases.find((p) => p.id === action.phaseId);
      const insertionIndex = phase ? phase.tasks.length : 0;
      const realKey = taskKey(action.phaseId, insertionIndex);
      const nextMeta = { ...state.taskMeta };
      const hasRich =
        action.description ||
        action.dueDate ||
        (action.images && action.images.length > 0);
      if (hasRich) {
        nextMeta[realKey] = {
          id: realKey,
          title: action.title,
          description: action.description,
          dueDate: action.dueDate,
          images: action.images,
          createdAt: new Date().toISOString(),
        };
      }
      const nextState = mutatePhase(state, action.phaseId, (p) => ({
        ...p,
        tasks: [...p.tasks, action.title],
      }));
      return { ...nextState, taskMeta: nextMeta };
    }

    case "edit_task":
      return mutatePhase(state, action.phaseId, (p) => ({
        ...p,
        tasks: p.tasks.map((t, i) => (i === action.taskIndex ? action.title : t)),
      }));

    case "set_task_meta": {
      const key = taskKey(action.phaseId, action.taskIndex);
      const phase = state.phases.find((p) => p.id === action.phaseId);
      if (!phase) return state;
      const title = phase.tasks[action.taskIndex] ?? "";
      const existing = state.taskMeta[key];
      const nextEntry: MilestoneTask = {
        id: key,
        title,
        description: action.description ?? existing?.description,
        dueDate: action.dueDate ?? existing?.dueDate,
        images: action.images ?? existing?.images,
        createdAt: action.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
      };
      const isEmpty =
        !nextEntry.description &&
        !nextEntry.dueDate &&
        (!nextEntry.images || nextEntry.images.length === 0);
      const nextMeta = { ...state.taskMeta };
      if (isEmpty) {
        delete nextMeta[key];
      } else {
        nextMeta[key] = nextEntry;
      }
      return { ...state, taskMeta: nextMeta };
    }

    case "remove_task": {
      const phase = state.phases.find((p) => p.id === action.phaseId);
      const nextTasks = phase
        ? phase.tasks.filter((_, i) => i !== action.taskIndex)
        : undefined;
      const nextMeta = reindexMetaAfterRemove(
        state.taskMeta,
        action.phaseId,
        action.taskIndex
      );
      const nextDone = reindexDoneAfterRemove(
        state.taskDone,
        action.phaseId,
        action.taskIndex
      );
      const nextState = mutatePhase(state, action.phaseId, (p) => ({
        ...p,
        tasks: nextTasks ?? p.tasks,
      }));
      return { ...nextState, taskMeta: nextMeta, taskDone: nextDone };
    }

    case "toggle_task": {
      const key = taskKey(action.phaseId, action.taskIndex);
      return {
        ...state,
        taskDone: {
          ...state.taskDone,
          [key]: !state.taskDone[key],
        },
      };
    }

    case "move_task": {
      if (action.fromPhaseId === action.toPhaseId) return state;
      let moved: string | undefined;
      const fromPhase = state.phases.find((p) => p.id === action.fromPhaseId);
      if (!fromPhase) return state;
      moved = fromPhase.tasks[action.taskIndex];
      if (moved === undefined) return state;

      const nextState = mutatePhase(state, action.fromPhaseId, (p) => ({
        ...p,
        tasks: p.tasks.filter((_, i) => i !== action.taskIndex),
      }));
      return mutatePhase(nextState, action.toPhaseId, (p) => ({
        ...p,
        tasks: [...p.tasks, moved!],
      }));
    }

    default:
      return state;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mutatePhase(
  state: MilestoneState,
  phaseId: string,
  fn: (p: MilestonePhase) => MilestonePhase
): MilestoneState {
  return {
    ...state,
    phases: state.phases.map((p) => (p.id === phaseId ? fn(p) : p)),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function newPhaseId(phases: MilestonePhase[]): string {
  const used = new Set(phases.map((p) => p.id));
  let i = 1;
  while (used.has(`phase-${i}`)) i++;
  return `phase-${i}`;
}

export function deriveShortLabel(label: string): string {
  const trimmed = label.trim();
  if (trimmed.length <= 12) return trimmed;
  const firstWord = trimmed.split(/[,\s&]+/)[0];
  if (firstWord && firstWord.length <= 10) {
    return capitalize(firstWord);
  }
  return capitalize(trimmed.slice(0, 10));
}

function capitalize(s: string): string {
  if (!s.length) return s;
  return s[0].toUpperCase() + s.slice(1);
}

export function countDone(
  phaseId: string,
  taskCount: number,
  taskDone: Record<string, boolean>
): number {
  let n = 0;
  for (let i = 0; i < taskCount; i++) {
    if (taskDone[`${phaseId}:${i}`]) n++;
  }
  return n;
}

export function deriveProgressFromTasks(
  phaseId: string,
  tasks: string[],
  taskDone: Record<string, boolean>
): number {
  if (tasks.length === 0) return 0;
  let done = 0;
  for (let i = 0; i < tasks.length; i++) {
    if (taskDone[`${phaseId}:${i}`]) done++;
  }
  return Math.round((done / tasks.length) * 100);
}

function reindexMetaAfterRemove(
  meta: TaskMetaMap,
  phaseId: string,
  removedIndex: number
): TaskMetaMap {
  const prefix = `${phaseId}:`;
  const next: TaskMetaMap = {};
  for (const [k, v] of Object.entries(meta)) {
    if (!k.startsWith(prefix)) {
      next[k] = v;
      continue;
    }
    const idx = Number(k.slice(prefix.length));
    if (Number.isNaN(idx)) continue;
    if (idx === removedIndex) continue;
    const newIdx = idx > removedIndex ? idx - 1 : idx;
    next[`${phaseId}:${newIdx}`] = v;
  }
  return next;
}

function reindexDoneAfterRemove(
  done: Record<string, boolean>,
  phaseId: string,
  removedIndex: number
): Record<string, boolean> {
  const prefix = `${phaseId}:`;
  const next: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(done)) {
    if (!k.startsWith(prefix)) {
      next[k] = v;
      continue;
    }
    const idx = Number(k.slice(prefix.length));
    if (Number.isNaN(idx) || idx === removedIndex) continue;
    const newIdx = idx > removedIndex ? idx - 1 : idx;
    next[`${phaseId}:${newIdx}`] = v;
  }
  return next;
}
