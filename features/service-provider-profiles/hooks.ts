"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";

import {
  createServiceProviderProfileApi,
  updateServiceProviderProfileApi,
  type CreateServiceProviderProfilePayload,
  type ServiceProviderProfileCreated,
  type UpdateServiceProviderProfilePayload,
} from "./api";

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * POST /api/service-provider-profiles — finish provider onboarding.
 *
 * On success we invalidate the `auth.me` query so the guard at the layout
 * level re-fetches `/api/auth/me` and sees the freshly-created profile
 * (which makes the `serviceProvider !== null` branch fire and stops
 * bouncing the user back to `/onboarding` on the next nav).
 */
export function useCreateServiceProviderProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation<ServiceProviderProfileCreated, Error, CreateServiceProviderProfilePayload>({
    mutationFn: (payload) => createServiceProviderProfileApi(payload),
    onSuccess: async () => {
      // Refetch "me" so the caller can rely on
      // `useCurrentUser().account.serviceProvider` being populated by the time
      // this promise resolves. Otherwise the post-onboarding redirect races the
      // refetch, `ProfileGuard` sees the stale (pre-profile) account and bounces
      // the user back to `/onboarding` — where the form remounts at step 1, the
      // Verify Email screen.
      //
      // This previously called `removeQueries` first. That deleted the query,
      // and `refetchQueries` only refetches queries that still exist, so the
      // awaited refetch was a no-op that resolved instantly without fetching —
      // causing the exact bounce the comment said it was preventing.
      await queryClient.refetchQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}

/**
 * PUT /api/service-provider-profiles/{id} — save edits to the current
 * provider's own profile (e.g. from the `/profile` page).
 *
 * The mutation carries the profile `id` separately from the payload so
 * the cached key stays a tuple `[id, payload]` instead of leaking the
 * id into the body shape.
 *
 * On success we invalidate both the `auth.me` query (so the header /
 * role-aware chrome updates the user fields it renders) and the
 * `serviceProviderProfiles.detail` query for this id (so any other
 * page holding that record sees the fresh data). We `await` the refetch
 * of `auth.me` so the caller can read the new `account.serviceProvider`
 * immediately after the mutation resolves.
 */
export function useUpdateServiceProviderProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ServiceProviderProfileCreated,
    Error,
    { id: string; payload: UpdateServiceProviderProfilePayload }
  >({
    mutationFn: ({ id, payload }) => updateServiceProviderProfileApi(id, payload),
    onSuccess: async (_data, variables) => {
      queryClient.removeQueries({
        queryKey: queryKeys.serviceProviderProfiles.detail(variables.id),
      });
      await queryClient.refetchQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}