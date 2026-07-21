"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";

import {
  createServiceProviderProfileApi,
  type CreateServiceProviderProfilePayload,
  type ServiceProviderProfileCreated,
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