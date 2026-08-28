/**
 * Daily construction log API — mirrors the wire contract for `api/daily-logs`.
 */

import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  CreateDailyLogPayload,
  DailyLog,
  DailyLogListResponse,
  UpdateDailyLogPayload,
} from "./daily-log-types";

/**
 * Logs for an engagement, a milestone or a task — newest day first.
 *
 * Endpoint:
 * `GET /api/daily-logs?projectWorkingId=&constructionItemId=&constructionTaskId=&fromDate=&toDate=`
 *
 * `fromDate` / `toDate` are `yyyy-MM-dd` and are how a week or a month of
 * reports is pulled up.
 */
export async function getDailyLogsApi(
  filter: {
    projectWorkingId?: string;
    constructionItemId?: string;
    constructionTaskId?: string;
    fromDate?: string;
    toDate?: string;
  },
  options?: { pageNumber?: number; pageSize?: number },
  config?: RequestConfig,
): Promise<DailyLogListResponse> {
  const params = new URLSearchParams();
  if (filter.projectWorkingId) params.set("projectWorkingId", filter.projectWorkingId);
  if (filter.constructionItemId) {
    params.set("constructionItemId", filter.constructionItemId);
  }
  if (filter.constructionTaskId) {
    params.set("constructionTaskId", filter.constructionTaskId);
  }
  if (filter.fromDate) params.set("fromDate", filter.fromDate);
  if (filter.toDate) params.set("toDate", filter.toDate);
  params.set("pageSize", String(options?.pageSize ?? 20));
  if (options?.pageNumber) params.set("pageNumber", String(options.pageNumber));

  const response = await api.get<DailyLogListResponse>(
    `/api/daily-logs?${params.toString()}`,
    config,
  );
  return response.data;
}

/** Endpoint: `GET /api/daily-logs/{id}` */
export async function getDailyLogApi(
  id: string,
  config?: RequestConfig,
): Promise<DailyLog> {
  const response = await api.get<DailyLog>(`/api/daily-logs/${id}`, config);
  return response.data;
}

/**
 * Provider writes a day's report. Requires an `accepted` engagement.
 *
 * Endpoint: `POST /api/daily-logs`
 */
export async function createDailyLogApi(
  payload: CreateDailyLogPayload,
  config?: RequestConfig,
): Promise<DailyLog> {
  const response = await api.post<DailyLog>("/api/daily-logs", payload, config);
  return response.data;
}

/** Endpoint: `PUT /api/daily-logs/{id}` — sending `media` replaces the whole list. */
export async function updateDailyLogApi(
  id: string,
  payload: UpdateDailyLogPayload,
  config?: RequestConfig,
): Promise<DailyLog> {
  const response = await api.put<DailyLog>(`/api/daily-logs/${id}`, payload, config);
  return response.data;
}

/** Endpoint: `DELETE /api/daily-logs/{id}` */
export async function deleteDailyLogApi(
  id: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/daily-logs/${id}`, config);
}
