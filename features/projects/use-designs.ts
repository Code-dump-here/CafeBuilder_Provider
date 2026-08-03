"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import {
  approveDesignApi,
  createDesignApi,
  deleteDesignImageApi,
  getDesignApi,
  getDesignsApi,
  requestRevisionApi,
  startRevisionApi,
  submitDesignApi,
  updateDesignApi,
  uploadDesignImageApi,
  type ListDesignsParams,
} from "./design-api";
import type {
  CreateDesignPayload,
  Design,
  DesignImageUploadFields,
  DesignImageUploadResponse,
  DesignListResponse,
  DesignType,
  RequestRevisionPayload,
  UpdateDesignPayload,
} from "./design-types";
import type { NormalizedAccount } from "@/features/auth/auth-me-types";
import type { DesignVersion, DrawingCategory } from "./design-version-types";

// ─── Toast messages ─────────────────────────────────────────────────────────

const TOAST = {
  createSuccess: "Design created.",
  updateSuccess: "Design updated.",
  submitSuccess: "Design submitted for review.",
  approveSuccess: "Design approved.",
  revisionRequested: "Revision requested.",
  revisionStarted: "Revision started.",
  uploadSuccess: "File uploaded.",
  deleteSuccess: "File deleted.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy design.",
  validation: "Thông tin chưa hợp lệ.",
  submitMissingFiles: "Cần upload ít nhất một file trước khi submit.",
  generic: "Không thể thực hiện. Vui lòng thử lại sau.",
} as const;

// ─── Mapper: Design → DesignVersion ──────────────────────────────────────────
//
// The legacy `useDesignVersions` returned a richer `DesignVersion` shape
// (with nested drawings) so the page's file-list UI rendered without a
// backend. The real `Design` is flatter — a parent record with a flat
// `images[]` array. This mapper keeps the existing UI working while the
// detail pages (per-version file browser) catch up.

// ─── Tab adapters ──────────────────────────────────────────────────────────
//
// The C# `DesignType` enum (concept / layout_2d / render_3d /
// technical_drawing) is coarser than the in-app `DrawingCategory` the
// tab filter was built on (REVISION / FLOOR_PLAN / 3D / ELEVATION /
// SECTION). We translate between the two at the read/write boundary so
// the existing tab UI can stay at its finer granularity while the wire
// payload uses the backend enum.
//
// Mapping table:
//   concept              → REVISION
//   layout_2d            → FLOOR_PLAN
//   render_3d            → 3D
//   technical_drawing    → SECTION  (default; ELEVATION could get its
//                                    own DesignType in a future migration)
//
// Reads (DesignType → DrawingCategory) are lossy by design — the legacy
// category is purely a display concern.

/** Map an API `DesignType` to the legacy tab category for display. */
export function mapDesignTypeToCategory(
  type: DesignType,
): DrawingCategory {
  switch (type) {
    case "concept":
      return "REVISION";
    case "layout_2d":
      return "FLOOR_PLAN";
    case "render_3d":
      return "3D";
    case "technical_drawing":
      return "SECTION";
  }
}

/** Map a legacy tab category back to the API `DesignType` when the user
 *  picks a tab to scope a design under. Defaults to `concept`. */
export function mapCategoryToDesignType(
  category: DrawingCategory,
): DesignType {
  switch (category) {
    case "FLOOR_PLAN":
      return "layout_2d";
    case "3D":
      return "render_3d";
    case "ELEVATION":
    case "SECTION":
      // ELEVATION collapses into technical_drawing (it has no first-class
      // C# value yet). SECTION is the historical default for that bucket.
      return "technical_drawing";
    case "REVISION":
    default:
      return "concept";
  }
}

function deterministicAvatarColor(seed: number): string {
  const palette = [
    "#A07B5A",
    "#3B5BA9",
    "#5A8F7B",
    "#8E5A3B",
    "#7B5A9B",
    "#5A7B8F",
    "#A95A8E",
    "#9B8B5A",
  ] as const;
  return palette[Math.abs(seed * 13) % palette.length];
}

function statusToVersionStatus(
  status: Design["status"],
): DesignVersion["status"] {
  // Wire enum and UI status are now 1:1 — keep the switch explicit so a
  // future BE enum value shows up here as a TypeScript exhaustiveness
  // check instead of silently collapsing into a generic bucket.
  switch (status) {
    case "in_progress":
      return "in_progress";
    case "submitted":
      return "submitted";
    case "approved":
      return "approved";
    case "revision":
      return "revision";
    default: {
      // Exhaustiveness guard.
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Convert a `Design` from `api/designs` into the legacy
 * `DesignVersion` shape consumed by `VersionListTable`.
 *
 * @param design  Backend record.
 * @param owner   Optional fallback owner when the API doesn't ship one.
 *                We default to the caller's account so the row never
 *                renders with a blank avatar.
 */
export function mapDesignToVersion(
  design: Design,
  owner: NormalizedAccount,
): DesignVersion {
  const createdAt = new Date(design.createdAt);
  const updatedAt = new Date(design.updatedAt);
  return {
    id: design.id,
    projectId: design.projectWorkingId,
    code: `V${design.version}`,
    name: design.title,
    description: design.reason,
    status: statusToVersionStatus(design.status),
    category: mapDesignTypeToCategory(design.type),
    owner: {
      id: owner.id,
      fullName:
        owner.shopOwner?.fullName ??
        owner.serviceProvider?.displayName ??
        owner.email,
      avatarColor: deterministicAvatarColor(design.createdBy || design.id),
    },
    drawingCount: design.images.length,
    createdAt,
    updatedAt,
    publishedAt: design.status === "approved" ? updatedAt : null,
    latestNote: design.reason,
    drawings: design.images.map((img) => ({
      id: img.id,
      versionId: design.id,
      name: img.caption ?? `Image #${img.id}`,
      code: `IMG-${img.id}`,
      category: mapDesignTypeToCategory(design.type),
      thumbnailUrl: img.viewUrl,
      scale: null,
      sheet: null,
      note: img.caption,
      updatedAt: new Date(img.createdAt),
      updatedBy: img.uploadedBy.toString(),
    })),
  };
}

// ─── Get Designs Query ───────────────────────────────────────────────────────

export interface UseDesignsOptions {
  projectWorkingId: number | null;
  enabled?: boolean;
  pageNumber?: number;
  pageSize?: number;
  status?: Design["status"];
  type?: Design["type"];
}

export interface UseDesignsResult {
  designs: Design[];
  versions: DesignVersion[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useDesigns(options: UseDesignsOptions): UseDesignsResult {
  const {
    projectWorkingId,
    enabled = true,
    pageNumber = 1,
    pageSize = 50,
    status,
    type,
  } = options;

  const query = useQuery<DesignListResponse, Error>({
    queryKey: [
      "designs",
      {
        projectWorkingId,
        status,
        type,
        pageNumber,
        pageSize,
      },
    ],
    queryFn: async ({ signal }) => {
      const params: ListDesignsParams = {
        projectWorkingId: projectWorkingId ?? 0,
        pageNumber,
        pageSize,
        status,
        type,
      };
      return getDesignsApi(params, { signal });
    },
    enabled: enabled && Boolean(projectWorkingId),
    staleTime: 30 * 1000,
  });

  const designs = query.data?.items ?? [];

  // Map every Design → DesignVersion for consumers that haven't migrated.
  // The mapping only needs the caller's account; pass `null` when the
  // hook is used outside an authenticated context (today every caller
  // is) and fall back to a synthetic owner so the avatar still renders.
  const fallbackOwner: NormalizedAccount = React.useMemo(
    () => ({
      id: 0,
      email: "system@example.com",
      phone: null,
      role: "provider",
      status: "active",
      emailVerifiedAt: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      shopOwner: null,
      serviceProvider: null,
    }),
    [],
  );

  const versions = React.useMemo(
    () => designs.map((d) => mapDesignToVersion(d, fallbackOwner)),
    [designs, fallbackOwner],
  );

  return {
    designs,
    versions,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Get Single Design Query ─────────────────────────────────────────────────

export interface UseDesignOptions {
  designId: number | null;
  enabled?: boolean;
}

export interface UseDesignResult {
  design: Design | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useDesign(options: UseDesignOptions): UseDesignResult {
  const { designId, enabled = true } = options;

  const query = useQuery<Design, Error>({
    queryKey: ["designs", "detail", { designId }],
    queryFn: async ({ signal }) => {
      return getDesignApi(designId ?? 0, { signal });
    },
    enabled: enabled && Boolean(designId),
    staleTime: 30 * 1000,
  });

  return {
    design: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Create Design Mutation ──────────────────────────────────────────────────

export interface CreateDesignOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (design: Design) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useCreateDesignMutation(
  options: CreateDesignOptions = {},
) {
  const queryClient = useQueryClient();

  return useMutation<Design, AppError, CreateDesignPayload>({
    mutationFn: (payload) => createDesignApi(payload),

    onSuccess: (design) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.createSuccess;
        console.log(message); // TODO: wire to toast
      }
      // Invalidate every list query scoped to this engagement so any
      // mounted table refetches the new row. Narrowing on the cache
      // key avoids invalidating unrelated projects.
      queryClient.invalidateQueries({
        queryKey: ["designs", { projectWorkingId: design.projectWorkingId }],
      });
      options.onSuccessSideEffect?.(design);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        console.log(message); // TODO: wire to toast
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Update Design Mutation ──────────────────────────────────────────────────

export interface UpdateDesignOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (design: Design) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useUpdateDesignMutation(
  options: UpdateDesignOptions = {},
) {
  const queryClient = useQueryClient();

  return useMutation<
    Design,
    AppError,
    { designId: number; payload: UpdateDesignPayload }
  >({
    mutationFn: ({ designId, payload }) =>
      updateDesignApi(designId, payload),

    onSuccess: (design) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.updateSuccess;
        console.log(message); // TODO: wire to toast
      }
      queryClient.invalidateQueries({
        queryKey: ["designs", { projectWorkingId: design.projectWorkingId }],
      });
      queryClient.invalidateQueries({
        queryKey: ["designs", "detail", { designId: design.id }],
      });
      options.onSuccessSideEffect?.(design);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        console.log(message); // TODO: wire to toast
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Submit / Approve / Revision Mutations ──────────────────────────────────

export interface SubmitDesignOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (design: Design) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useSubmitDesignMutation(options: SubmitDesignOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<Design, AppError, number>({
    mutationFn: (designId) => submitDesignApi(designId),

    onSuccess: (design) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.submitSuccess;
        console.log(message); // TODO: wire to toast
      }
      queryClient.invalidateQueries({
        queryKey: ["designs", { projectWorkingId: design.projectWorkingId }],
      });
      queryClient.invalidateQueries({
        queryKey: ["designs", "detail", { designId: design.id }],
      });
      options.onSuccessSideEffect?.(design);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        console.log(message); // TODO: wire to toast
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

export interface ApproveDesignOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (design: Design) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useApproveDesignMutation(options: ApproveDesignOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<Design, AppError, number>({
    mutationFn: (designId) => approveDesignApi(designId),

    onSuccess: (design) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.approveSuccess;
        console.log(message); // TODO: wire to toast
      }
      queryClient.invalidateQueries({
        queryKey: ["designs", { projectWorkingId: design.projectWorkingId }],
      });
      queryClient.invalidateQueries({
        queryKey: ["designs", "detail", { designId: design.id }],
      });
      options.onSuccessSideEffect?.(design);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        console.log(message); // TODO: wire to toast
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

export interface RequestDesignRevisionOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (design: Design) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useRequestDesignRevisionMutation(
  options: RequestDesignRevisionOptions = {},
) {
  const queryClient = useQueryClient();

  return useMutation<
    Design,
    AppError,
    { designId: number; payload: RequestRevisionPayload }
  >({
    mutationFn: ({ designId, payload }) =>
      requestRevisionApi(designId, payload),

    onSuccess: (design) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.revisionRequested;
        console.log(message); // TODO: wire to toast
      }
      queryClient.invalidateQueries({
        queryKey: ["designs", { projectWorkingId: design.projectWorkingId }],
      });
      queryClient.invalidateQueries({
        queryKey: ["designs", "detail", { designId: design.id }],
      });
      options.onSuccessSideEffect?.(design);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        console.log(message); // TODO: wire to toast
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

export interface StartRevisionOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (design: Design) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

export function useStartRevisionMutation(options: StartRevisionOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<Design, AppError, number>({
    mutationFn: (designId) => startRevisionApi(designId),

    onSuccess: (design) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.revisionStarted;
        console.log(message); // TODO: wire to toast
      }
      queryClient.invalidateQueries({
        queryKey: ["designs", { projectWorkingId: design.projectWorkingId }],
      });
      queryClient.invalidateQueries({
        queryKey: ["designs", "detail", { designId: design.id }],
      });
      options.onSuccessSideEffect?.(design);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        console.log(message); // TODO: wire to toast
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Upload / Delete Design Image Mutations ───────────────────────────────

export interface UploadDesignImageOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: (image: DesignImageUploadResponse) => void;
  onErrorSideEffect?: (error: AppError) => void;
}

/** Upload a file to an existing design (multipart). */
export function useUploadDesignImageMutation(
  designId: number,
  options: UploadDesignImageOptions = {},
) {
  const queryClient = useQueryClient();

  return useMutation<
    DesignImageUploadResponse,
    AppError,
    { file: File; caption?: string; uploadedBy: number }
  >({
    mutationFn: ({ file, caption, uploadedBy }) =>
      uploadDesignImageApi(designId, file, { caption, uploadedBy }),

    onSuccess: (image) => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.uploadSuccess;
        console.log(message); // TODO: wire to toast
      }
      // Invalidate the design detail so the new image appears in the list.
      queryClient.invalidateQueries({
        queryKey: ["designs", "detail", { designId }],
      });
      options.onSuccessSideEffect?.(image);
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        console.log(message); // TODO: wire to toast
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

export interface DeleteDesignImageOptions {
  onSuccessMessage?: string | null;
  onErrorMessage?: string | ((error: AppError) => string) | null;
  onSuccessSideEffect?: () => void;
  onErrorSideEffect?: (error: AppError) => void;
}

/** Delete a file from a design. */
export function useDeleteDesignImageMutation(
  designId: number,
  options: DeleteDesignImageOptions = {},
) {
  const queryClient = useQueryClient();

  return useMutation<void, AppError, number>({
    mutationFn: (fileId) => deleteDesignImageApi(designId, fileId),

    onSuccess: () => {
      if (options.onSuccessMessage !== null) {
        const message = options.onSuccessMessage ?? TOAST.deleteSuccess;
        console.log(message); // TODO: wire to toast
      }
      queryClient.invalidateQueries({
        queryKey: ["designs", "detail", { designId }],
      });
      options.onSuccessSideEffect?.();
    },

    onError: (error) => {
      if (options.onErrorMessage !== null) {
        const message =
          typeof options.onErrorMessage === "function"
            ? options.onErrorMessage(error)
            : options.onErrorMessage ?? resolveErrorMessage(error);
        console.log(message); // TODO: wire to toast
      }
      options.onErrorSideEffect?.(error);
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveErrorMessage(error: AppError): string {
  if (error.isNetworkError) return TOAST.network;
  if (error.isTimeout) return TOAST.timeout;

  switch (error.status) {
    case 400:
      // Backend often returns "design must have at least one file" on
      // /submit; surface a friendlier line.
      if (
        error.message &&
        error.message.toLowerCase().includes("file")
      ) {
        return TOAST.submitMissingFiles;
      }
      return TOAST.validation;
    case 401:
      return TOAST.unauthorized;
    case 403:
      return TOAST.forbidden;
    case 404:
      return TOAST.notFound;
    default:
      if (
        error.message &&
        error.message.trim().length > 0 &&
        !/^Request failed/i.test(error.message)
      ) {
        return error.message;
      }
      return TOAST.generic;
  }
}
