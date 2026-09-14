"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { tokenStore } from "@/features/auth/token-store";
import { AppError } from "@/lib/http/errors";

import type { DesignBrief, RawDesignBrief } from "./design-brief-list-types";
import { normalizeBrief } from "./design-briefs-api";
import { getEngagementBriefApi } from "./engagement-api";

function useAuthHydrated(): boolean {
  return React.useSyncExternalStore(
    (notify) => tokenStore.subscribe(notify),
    () => tokenStore.isHydrated(),
    () => true,
  );
}

/**
 * The owner's brief as a provider on this engagement may see it:
 * `GET /api/project-workings/{id}/brief`.
 *
 * This is the endpoint for deciding whether to take a job — the backend opens
 * it from `requested`, before the invitation is accepted, and blocks it once
 * the engagement is rejected or terminated. It 404s while the owner has not
 * written a brief; that is an ordinary state, so it resolves to `null` rather
 * than retrying.
 */
export function useEngagementBrief(engagementId: string | null | undefined) {
  const hydrated = useAuthHydrated();
  const id = engagementId?.trim() ?? "";

  const query = useQuery<DesignBrief | null, Error>({
    queryKey: ["engagements", "brief", id],
    queryFn: async ({ signal }) => {
      try {
        return normalizeBrief((await getEngagementBriefApi(id, { signal })) as RawDesignBrief);
      } catch (error) {
        // The axios interceptor rethrows as AppError, which carries `status`.
        if (error instanceof AppError && error.status === 404) return null;
        throw error;
      }
    },
    enabled: hydrated && id.length > 0,
    retry: false,
    staleTime: 60_000,
  });

  return { brief: query.data ?? null, isLoading: query.isLoading };
}
