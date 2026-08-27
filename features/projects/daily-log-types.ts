/**
 * Daily construction log types — mirrors the wire contract for `api/daily-logs`.
 *
 * The provider reports what was done each day with site photos; the owner
 * follows progress without driving to the site. A log can be anchored to a
 * milestone or to a single task, which is what turns "the project is moving"
 * into "this milestone moved, on this day, and here is the photo".
 *
 * Anchors are `SetNull`, not cascade: deleting a milestone must not erase the
 * record that work happened. Reading is open at every engagement status, so
 * both sides can still consult the log after handover.
 */

export type DailyLogMediaType = "image" | "video";

export interface DailyLogMedia {
  id: string;
  /** Storage object name held in the database. */
  mediaUrl: string;
  /** Absolute URL — use this one for `<img>` / player sources. */
  mediaViewUrl: string | null;
  mediaType: DailyLogMediaType;
  caption: string | null;
  sortOrder: number;
}

export interface DailyLog {
  id: string;
  projectWorkingId: string;
  constructionItemId: string | null;
  /** Denormalised so a list row can show its anchor without a second call. */
  constructionItemName: string | null;
  constructionTaskId: string | null;
  constructionTaskName: string | null;

  /** `yyyy-MM-dd`. The day the work happened, not when the entry was typed. */
  logDate: string;
  workDone: string;
  issueNote: string | null;
  weatherNote: string | null;
  workerCount: number | null;

  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;

  media: DailyLogMedia[];
}

export interface DailyLogListResponse {
  items: DailyLog[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface DailyLogMediaInput {
  mediaUrl: string;
  mediaType?: DailyLogMediaType;
  caption?: string;
}

/**
 * `projectWorkingId` may be omitted when a milestone or task is given — the
 * server derives the engagement from the anchor and rejects the request if the
 * ids point at different engagements.
 */
export interface CreateDailyLogPayload {
  projectWorkingId?: string;
  constructionItemId?: string;
  constructionTaskId?: string;
  /** `yyyy-MM-dd`. Omit for today (Vietnam time, resolved server-side). */
  logDate?: string;
  workDone: string;
  issueNote?: string;
  weatherNote?: string;
  workerCount?: number;
  media?: DailyLogMediaInput[];
}

/**
 * Omitted fields keep their value. `media` is the exception: sending it
 * replaces the whole list, and an empty array detaches every file.
 */
export interface UpdateDailyLogPayload {
  constructionItemId?: string;
  constructionTaskId?: string;
  logDate?: string;
  workDone?: string;
  issueNote?: string;
  weatherNote?: string;
  workerCount?: number;
  media?: DailyLogMediaInput[];
}

/**
 * Today in Vietnam as `yyyy-MM-dd`, for the date field's default and max.
 *
 * Built from the +7 offset rather than the browser's local date: a provider on
 * a device set to UTC would otherwise be handed yesterday's date before 07:00
 * and get a "log date is in the future" rejection from the server, which
 * anchors the same rule to Vietnam time.
 */
export function todayInVietnam(): string {
  const nowUtcMs = Date.now();
  const vietnam = new Date(nowUtcMs + 7 * 60 * 60 * 1000);
  return vietnam.toISOString().slice(0, 10);
}
