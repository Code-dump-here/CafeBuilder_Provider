import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

/**
 * Thread comments anchored to a ConstructionItem or a Design via a soft FK
 * (`targetType` + `targetId`). Mirrors `CommentController` on the backend.
 *
 * Both sides of an engagement read and write the same thread: the shop owner
 * comments from the mobile app, the provider from here.
 */
export type CommentTargetType = "design" | "construction_item";

/** Wire shape of `CommentResponse`. */
export interface Comment {
  id: number;
  targetType: string;
  targetId: number;
  body: string | null;
  createdBy: number | null;
  /**
   * Display name resolved server-side — ShopOwner.FullName for owners,
   * ServiceProviderProfile.DisplayName for providers, email for admins.
   * Null when the account can't be resolved.
   */
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommentListResponse {
  items: Comment[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface CreateCommentPayload {
  targetType: CommentTargetType;
  targetId: number;
  body: string;
}

/**
 * List comments for a target. The server orders by `CreatedAt` descending, so
 * page 1 is the newest; the panel re-sorts anyway, so callers shouldn't rely
 * on the order here.
 *
 * Endpoint: `GET /api/comments?targetType=&targetId=&pageNumber=&pageSize=`
 */
export async function getCommentsApi(
  options: {
    targetType: CommentTargetType;
    targetId: number;
    pageNumber?: number;
    pageSize?: number;
  },
  config?: RequestConfig,
): Promise<CommentListResponse> {
  const response = await api.get<CommentListResponse>("/api/comments", {
    ...config,
    params: {
      targetType: options.targetType,
      targetId: options.targetId,
      pageNumber: options.pageNumber ?? 1,
      pageSize: options.pageSize ?? 50,
      ...config?.params,
    },
  });
  return response.data;
}

/**
 * Post a comment. `createdBy` is taken from the JWT server-side, so it is
 * deliberately not part of the payload.
 *
 * Endpoint: `POST /api/comments`
 */
export async function createCommentApi(
  payload: CreateCommentPayload,
  config?: RequestConfig,
): Promise<Comment> {
  const response = await api.post<Comment>("/api/comments", payload, config);
  return response.data;
}

/**
 * Delete a comment. The server allows this only for the author or an admin.
 *
 * Endpoint: `DELETE /api/comments/{id}`
 */
export async function deleteCommentApi(
  id: number,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/comments/${id}`, config);
}
