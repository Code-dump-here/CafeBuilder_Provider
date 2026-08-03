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
 *   `GET /api/project-workings?serviceProviderProfileId={id}&pageNumber={n}&pageSize={m}`
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
  const response = await api.get("/api/project-workings", {
    ...config,
    params: {
      serviceProviderProfileId: params.serviceProviderProfileId,
      pageNumber: params.pageNumber,
      pageSize: params.pageSize,
      ...(params.status ? { status: params.status } : {}),
    },
  });
  return normalizeMyProjectsPage(response.data);
}
