import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import {
  normalizeProjectDetail,
  type ProjectDetail,
  type RawProjectDetail,
} from "./project-detail-types";

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch a single project by id.
 *
 * Endpoint: `GET /api/projects/{projectId}`.
 *
 * The shared `api` axios instance already attaches the Bearer access
 * token via the request interceptor (see `lib/http/axios.ts`). No extra
 * auth wiring is needed here — the user just needs to be logged in.
 *
 * Throws an `ApiError` (from `normalizeAxiosError`) on any non-2xx
 * response, including 401/403. The 401 case will additionally trigger
 * the global refresh-token retry logic + `auth:expired` broadcast.
 */
export async function fetchProjectDetail(
  projectId: string | number,
  config?: RequestConfig,
): Promise<ProjectDetail> {
  const response = await api.get<RawProjectDetail>(
    `/api/projects/${encodeURIComponent(String(projectId))}`,
    config,
  );
  return normalizeProjectDetail(response.data);
}
