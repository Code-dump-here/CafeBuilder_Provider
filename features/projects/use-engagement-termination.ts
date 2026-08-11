"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/http/axios";
import { AppError } from "@/lib/http/errors";
import { notifyError } from "@/lib/notify";
import type { RequestConfig } from "@/lib/http/types";
import type { Engagement } from "./engagement-types";

// ---------------------------------------------------------------------------
// Endpoints
//
// Ending a running engagement needs both sides to agree:
//
//   POST   /api/project-workings/{id}/termination-request   { reason? }
//   POST   /api/project-workings/{id}/termination-response  { approve, note? }
//   DELETE /api/project-workings/{id}/termination-request
//
// A request does NOT change the status — the engagement stays `accepted`
// with `isAwaitingTerminationApproval` set until the other party answers.
//
// There is also a legacy `POST /{id}/terminate`. It no longer terminates on
// its own (it files a request, or approves the other side's), so it is
// deliberately not used here: calling the explicit endpoints keeps it obvious
// which step actually happened.

export async function requestTerminationApi(
  id: number,
  reason?: string,
  config?: RequestConfig,
): Promise<Engagement> {
  const response = await api.post<Engagement>(
    `/api/project-workings/${id}/termination-request`,
    { reason: reason?.trim() || undefined },
    config,
  );
  return response.data;
}

export async function respondToTerminationApi(
  id: number,
  approve: boolean,
  note?: string,
  config?: RequestConfig,
): Promise<Engagement> {
  const response = await api.post<Engagement>(
    `/api/project-workings/${id}/termination-response`,
    { approve, note: note?.trim() || undefined },
    config,
  );
  return response.data;
}

export async function cancelTerminationRequestApi(
  id: number,
  config?: RequestConfig,
): Promise<Engagement> {
  const response = await api.delete<Engagement>(
    `/api/project-workings/${id}/termination-request`,
    config,
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// Mutations

/**
 * Every engagement query is keyed under the `"engagements"` prefix, so one
 * invalidation refreshes the list, the detail, and the overview together.
 * Without it the banner would keep rendering a request that is already
 * answered.
 */
function useInvalidateEngagements() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["engagements"] });
}

/** Ask the owner to end the engagement. */
export function useRequestTerminationMutation() {
  const invalidate = useInvalidateEngagements();

  return useMutation<Engagement, AppError, { id: number; reason?: string }>({
    mutationFn: ({ id, reason }) => requestTerminationApi(id, reason),
    onSuccess: () => {
      void invalidate();
    },
    onError: (error) => {
      notifyError(error?.message ?? "Couldn't send that request.");
    },
  });
}

/** Answer the owner's request: approve ends it, reject keeps the work going. */
export function useRespondToTerminationMutation() {
  const invalidate = useInvalidateEngagements();

  return useMutation<
    Engagement,
    AppError,
    { id: number; approve: boolean; note?: string }
  >({
    mutationFn: ({ id, approve, note }) =>
      respondToTerminationApi(id, approve, note),
    onSuccess: () => {
      void invalidate();
    },
    onError: (error) => {
      notifyError(error?.message ?? "Couldn't send that response.");
    },
  });
}

/** Withdraw our own request while the owner hasn't answered. */
export function useCancelTerminationRequestMutation() {
  const invalidate = useInvalidateEngagements();

  return useMutation<Engagement, AppError, { id: number }>({
    mutationFn: ({ id }) => cancelTerminationRequestApi(id),
    onSuccess: () => {
      void invalidate();
    },
    onError: (error) => {
      notifyError(error?.message ?? "Couldn't withdraw that request.");
    },
  });
}
