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
      // Drop the cached "me" data so any in-flight `useMe` re-fetches
      // and sees the new profile. We `await` the refetch so the caller
      // can rely on `useCurrentUser().account.serviceProvider` being
      // populated by the time the mutation promise resolves — otherwise
      // the post-onboarding redirect races the refetch and `ProfileGuard`
      // sees the stale (pre-profile) account and bounces the user back
      // to `/onboarding`.
      queryClient.removeQueries({ queryKey: queryKeys.auth.me() });
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
      queryClient.removeQueries({ queryKey: queryKeys.auth.me() });
      await queryClient.refetchQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}