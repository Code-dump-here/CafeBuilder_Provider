import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import { normalizeMyProjectsPage } from "./my-projects-types";
import type {
  MyProjectWorking,
  MyProjectsQueryParams,
} from "./my-projects-types";
import type { PagedResponse } from "./marketplace-types";

/**
 * Fetch the `My Projects` list for the authenticated provider.
 *
 * Endpoint:
 *   `GET /api/project-workings/filter?serviceProviderProfileId={id}&statuses={csv}&contractType={kind}`
 *
 * `/filter` rather than the plain list endpoint, because that one takes a
 * single `status` and no `contractType`. Under it, the "All" tab had to ask
 * for everything and discard declined and terminated rows in the browser —
 * after the server had already paged — which left short pages and a total
 * that disagreed with what was on screen. Naming the statuses lets the
 * server do the filtering and count honestly.
 *
 * The provider id is REQUIRED — `serviceProviderProfileId` resolves from
 * the current `/api/auth/me` JWT, but the endpoint also accepts the
 * explicit param, which keeps the call cacheable per provider even if
 * we later expose impersonation / admin override pages.
 *
 * Response is the standard `PagedResponse<MyProjectWorking>`. Date
 * strings are normalized to `Date` so the rest of the app can render
 * them directly through `useFormatter`.
 */
export async function fetchMyProjectWorkings(
  params: MyProjectsQueryParams,
  config?: RequestConfig,
): Promise<PagedResponse<MyProjectWorking>> {
  const response = await api.get("/api/project-workings/filter", {
    ...config,
    params: {
      serviceProviderProfileId: params.serviceProviderProfileId,
      pageNumber: params.pageNumber,
      pageSize: params.pageSize,
      // Omitted entirely when empty — a blank `statuses` reads as "every
      // status" server-side, which is the opposite of what a caller passing
      // an empty list means.
      ...(params.statuses?.length
        ? { statuses: params.statuses.join(",") }
        : {}),
      ...(params.contractType ? { contractType: params.contractType } : {}),
    },
  });
  return normalizeMyProjectsPage(response.data);
}
