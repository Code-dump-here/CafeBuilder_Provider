"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { AppError } from "@/lib/http/errors";
import { notifyError } from "@/lib/notify";

import { createCommentApi, getCommentsApi, type Comment } from "./comment-api";

/**
 * Notes on a construction milestone, wired to `GET/POST /api/comments` with
 * `targetType: "construction_item"`.
 *
 * This is the same thread the shop owner writes to from the mobile app, where
 * it is labelled "Notes" and sits under each milestone. The owner has been
 * able to post to it all along; nothing on the provider side ever read it, so
 * those notes went nowhere. Both sides of the engagement may read and post —
 * the backend authorises comments for the owner and the engaged provider
 * alike.
 *
 * Only milestones can carry notes. `CommentTargetType` is `{construction_item,
 * design}`, so an individual task is not an addressable target — a note about
 * one belongs on its milestone.
 */

export interface UseMilestoneNotesResult {
  notes: Comment[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

/**
 * Notes for one milestone. Pass `null` when nothing is open — the query stays
 * disabled and an empty list comes back.
 */
export function useMilestoneNotes(
  constructionItemId: number | null,
): UseMilestoneNotesResult {
  const query = useQuery({
    queryKey: queryKeys.comments.list(
      "construction_item",
      constructionItemId ?? 0,
    ),
    queryFn: () =>
      getCommentsApi({
        targetType: "construction_item",
        targetId: constructionItemId as number,
      }),
    enabled: constructionItemId != null,
  });

  return {
    notes: query.data?.items ?? [],
    isLoading: constructionItemId != null && query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Posts a note on a milestone and refreshes the thread. A failure surfaces as
 * a toast rather than being swallowed, so it can't look like it worked.
 */
export function useCreateMilestoneNoteMutation(
  constructionItemId: number | null,
) {
  const queryClient = useQueryClient();

  return useMutation<Comment, AppError, string>({
    mutationFn: (body: string) =>
      createCommentApi({
        targetType: "construction_item",
        targetId: constructionItemId as number,
        body,
      }),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.comments.list(
          "construction_item",
          constructionItemId ?? 0,
        ),
      });
    },

    onError: (error) => {
      notifyError(error?.message ?? "Couldn't post that note.");
    },
  });
}
