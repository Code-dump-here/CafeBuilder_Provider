import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import {
  normalizeProjectDetail,
  type ProjectDetail,
  type RawProjectDetail,
} from "@/features/projects/project-detail-types";

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch a single project by id.
 *
 * Endpoint: `GET /api/project-shop-owners/{projectId}`.
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
  projectId: string,
  config?: RequestConfig,
): Promise<ProjectDetail> {
  const response = await api.get<RawProjectDetail>(
    `/api/project-shop-owners/${encodeURIComponent(String(projectId))}`,
    config,
  );
  return normalizeProjectDetail(response.data);
}

/**
 * Owner closes a project (after every engagement is `completed`).
 *
 * Endpoint: `POST /api/project-shop-owners/{projectId}/complete`.
 *
 * Authorization:
 *   Bearer token required; **must be the project owner**. A 401 is
 *   returned otherwise. The backend doesn't accept `status: "completed"`
 *   via `PUT` any more — see `a.md` §1 for the breaking change.
 *
 * Side effects the backend applies:
 *   - `projectShopOwner.status` → `"completed"`.
 *   - every open post (`openPosts[].status === "open"`) flips to `"closed"`.
 *
 * Errors worth handling on the FE:
 *   - 409: "Còn N engagement chưa đóng (requested/accepted) — nghiệm thu
 *     hoặc huỷ ngang từng provider trước khi đóng dự án." — surface the
 *     Vietnamese message verbatim.
 *   - 409: short-circuit when the project is already `completed` /
 *     `cancelled`.
 */
export async function completeProjectApi(
  projectId: string,
  config?: RequestConfig,
): Promise<ProjectDetail> {
  const response = await api.post<RawProjectDetail>(
    `/api/project-shop-owners/${encodeURIComponent(String(projectId))}/complete`,
    undefined,
    config,
  );
  return normalizeProjectDetail(response.data);
}

/**
 * Owner cancels a project (`briefed` or `in_progress`).
 *
 * Endpoint: `POST /api/project-shop-owners/{projectId}/cancel`.
 *
 * Authorization:
 *   Bearer token required; **must be the project owner**. A 401 is
 *   returned otherwise.
 *
 * The backend cascades:
 *   - engagement `requested` → `rejected`.
 *   - engagement `accepted`  → `terminated`.
 *   - `openPosts[]` with `status === "open"` → `closed`.
 *
 * Errors worth handling on the FE:
 *   - 409: "Không thể huỷ dự án đã hoàn thành" (or similar).
 */
export async function cancelProjectApi(
  projectId: string,
  config?: RequestConfig,
): Promise<ProjectDetail> {
  const response = await api.post<RawProjectDetail>(
    `/api/project-shop-owners/${encodeURIComponent(String(projectId))}/cancel`,
    undefined,
    config,
  );
  return normalizeProjectDetail(response.data);
}
