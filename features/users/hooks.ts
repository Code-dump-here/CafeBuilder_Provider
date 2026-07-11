"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { tokenStore } from "@/lib/auth/token-store";
import { queryKeys } from "@/lib/react-query/keys";

import {
  getMe,
  updateMe,
  type Account,
  type Me,
  type UpdateMePayload,
} from "./api";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Fetch the currently authenticated user's profile. Disabled until an access
 * token is present so the request interceptor never fires without auth.
 */
export function useMeQuery() {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: getMe,
    enabled: tokenStore.hasAccessToken(),
  });
}

/**
 * Stub query for the cheap account summary that's already in the cache
 * (populated by `useLoginMutation` / `useRegisterMutation` in the auth
 * feature). Returns `null` while disabled — wire up an actual queryFn when
 * the backend exposes a dedicated account endpoint.
 */
export function useAccountQuery() {
  return useQuery({
    queryKey: queryKeys.auth.account(),
    queryFn: () => null as Account | null,
    enabled: false,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useUpdateMeMutation() {
  const queryClient = useQueryClient();

  return useMutation<Me, Error, UpdateMePayload>({
    mutationFn: (payload) => updateMe(payload),
    onSuccess: async (updatedUser) => {
      queryClient.setQueryData(queryKeys.auth.me(), updatedUser);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.auth.me(),
      });
    },
  });
}