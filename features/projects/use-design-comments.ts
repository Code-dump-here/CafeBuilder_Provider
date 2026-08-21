"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/keys";
import { AppError } from "@/lib/http/errors";
import { notifyError } from "@/lib/notify";
import {
  createCommentApi,
  getCommentsApi,
  type Comment,
} from "./comment-api";
import type { DesignVersionComment } from "./design-version-types";

/**
 * Comments on a design, wired to `GET/POST /api/comments`.
 *
 * The rows the design-management table calls "versions" are Designs — see
 * `use-designs.ts`, which maps `design.id` straight onto `DesignVersion.id`.
 * So the id the table holds is exactly the `targetId` the comment API wants,
 * with `targetType: "design"`.
 *
 * This is the same thread the shop owner writes to from the mobile app, so
 * both sides of an engagement finally see each other's messages.
 */

/**
 * Adapts the wire shape to the `DesignVersionComment` the existing panel
 * renders. Two fields have no backend equivalent:
 *
 *   - `pinned` — no such concept server-side, so nothing is ever pinned.
 *   - `parentId` — comments are a flat list, not a tree, so every comment is
 *     top-level and the panel's reply grouping stays empty.
 *
 * Both are kept in the shape rather than removed so the panel, which also
 * serves the (still mock) technical-drawings surface, needs no changes.
 */
function toVersionComment(comment: Comment): DesignVersionComment {
  return {
    id: comment.id,
    versionId: comment.targetId,
    author: {
      id: comment.createdBy ?? "",
      fullName: comment.createdByName ?? "Unknown",
      // No avatar colour on the wire; the panel falls back to `bg-muted`.
      avatarColor: null,
    },
    body: comment.body ?? "",
    pinned: false,
    parentId: null,
    createdAt: new Date(comment.createdAt),
  };
}

export interface UseDesignCommentsResult {
  comments: DesignVersionComment[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Comments for one design. Pass `null` when nothing is selected — the query
 * stays disabled and an empty list is returned.
 */
export function useDesignComments(
  designId: string | null,
): UseDesignCommentsResult {
  const query = useQuery({
    queryKey: queryKeys.comments.list("design", designId ?? ""),
    queryFn: () =>
      getCommentsApi({ targetType: "design", targetId: designId as string }),
    enabled: designId != null,
  });

  const comments = React.useMemo(
    () => (query.data?.items ?? []).map(toVersionComment),
    [query.data],
  );

  return {
    comments,
    isLoading: designId != null && query.isLoading,
    isError: query.isError,
  };
}

/**
 * Posts a comment on a design and refreshes the thread. Errors surface as a
 * toast rather than being swallowed, so a failed post can't look like a
 * successful one.
 */
export function useCreateDesignCommentMutation(designId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<Comment, AppError, string>({
    mutationFn: (body: string) =>
      createCommentApi({
        targetType: "design",
        targetId: designId as string,
        body,
      }),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.comments.list("design", designId ?? ""),
      });
    },

    onError: (error) => {
      notifyError(error?.message ?? "Couldn't post that comment.");
    },
  });
}
