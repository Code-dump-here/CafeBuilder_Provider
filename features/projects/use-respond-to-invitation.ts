"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/http/axios";
import { AppError } from "@/lib/http/errors";
import type { RequestConfig } from "@/lib/http/types";
import { queryKeys } from "@/lib/react-query/keys";

// ---------------------------------------------------------------------------
// Endpoints
//
// Both endpoints share the same "respond to a direct request" contract:
//   POST /api/project-workings/{id}/accept   (provider, no body)
//   POST /api/project-workings/{id}/reject   (provider, no body)
//
// The backend either echoes the updated engagement (`ProjectWorkingResponse`)
// or returns an empty body on success. The mutation doesn't consume the
// response — the cache invalidation below re-fetches the list, so the
// mutated row re-enters the cache through the normalizer used by the
// list endpoint.

async function respondToInvitation(
  id: string,
  action: "accept" | "reject",
  config?: RequestConfig,
): Promise<void> {
  await api.post(`/api/project-workings/${id}/${action}`, undefined, config);
}

// ---------------------------------------------------------------------------
// Mutation

/**
 * Respond to a project invitation by accepting or rejecting it.
 *
 * The `serviceProviderProfileId` of the current viewer is required to
 * scope the cache invalidation: only the provider's own `myProjects`
 * list cache should be touched, and other providers' lists must be
 * left alone.
 *
 * On success, we invalidate every `myProjects.list` cache entry for the
 * current provider so the next visit pulls the freshly-updated rows.
 * Both the all-seeing list AND the `requested`-only subset share the
 * same `myProjects.list` prefix (with `status` as the discriminator), so
 * the same invalidation handles both.
 */
export function useRespondToInvitationMutation(
  serviceProviderProfileId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { id: string; action: "accept" | "reject" }
  >({
    mutationFn: ({ id, action }) => respondToInvitation(id, action),
    onSuccess: async () => {
      if (serviceProviderProfileId != null) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.myProjects.listAll(serviceProviderProfileId),
        });
      }
    },
  });
}

/**
 * Convenience accessor for the typed error surface. Wraps the unknown
 * value `useMutation` keeps in `error` as a real `AppError` so callers
 * can pull translated messages without re-wrapping.
 */
export function describeInvitationError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message ?? "Failed to respond to the invitation.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Failed to respond to the invitation.";
}
