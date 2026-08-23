"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  addConstructionMaterialApi,
  createMaterialApi,
  deleteMaterialApi,
  getConstructionMaterialsApi,
  getMaterialCostApi,
  getMaterialsApi,
  removeConstructionMaterialApi,
  updateConstructionMaterialApi,
  updateMaterialApi,
} from "./material-api";
import type {
  ConstructionMaterial,
  CreateConstructionMaterialPayload,
  CreateMaterialPayload,
  Material,
  MaterialCostSummary,
  MaterialListResponse,
  UpdateConstructionMaterialPayload,
  UpdateMaterialPayload,
} from "./material-types";

const TOAST = {
  createSuccess: "Đã thêm vật tư vào bảng giá.",
  updateSuccess: "Đã cập nhật vật tư.",
  deleteSuccess: "Đã xoá vật tư khỏi bảng giá.",
  addUsageSuccess: "Đã thêm vật tư cho hạng mục.",
  updateUsageSuccess: "Đã cập nhật khối lượng.",
  removeUsageSuccess: "Đã gỡ vật tư khỏi hạng mục.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy vật tư.",
  generic: "Không thể thực hiện. Vui lòng thử lại sau.",
} as const;

/**
 * The server states these rules in full sentences ("vật tư này đang được 2
 * hạng mục sử dụng…", "công việc chưa bắt đầu…"). Replacing them with a
 * generic string would drop the only explanation of what to do next, so the
 * server's own message wins whenever there is one.
 */
function resolveErrorMessage(error: AppError): string {
  if (error.isNetworkError) return TOAST.network;
  if (error.isTimeout) return TOAST.timeout;

  if (
    error.message &&
    error.message.trim().length > 0 &&
    !/^Request failed/i.test(error.message)
  ) {
    return error.message;
  }

  switch (error.status) {
    case 401:
      return TOAST.unauthorized;
    case 403:
      return TOAST.forbidden;
    case 404:
      return TOAST.notFound;
    default:
      return TOAST.generic;
  }
}

// ─── Price list ──────────────────────────────────────────────────────────────

export function useMaterials(options: {
  projectWorkingId: string | null | undefined;
  enabled?: boolean;
}) {
  const projectWorkingId = options.projectWorkingId
    ? String(options.projectWorkingId)
    : "";

  const query = useQuery<MaterialListResponse, Error>({
    queryKey: ["materials", { projectWorkingId }],
    queryFn: async ({ signal }) => getMaterialsApi(projectWorkingId, undefined, { signal }),
    enabled: (options.enabled ?? true) && Boolean(projectWorkingId),
    staleTime: 30 * 1000,
  });

  return {
    materials: query.data?.items ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Invalidate everything that shows material data for one engagement. */
function useMaterialInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["materials"] });
    void queryClient.invalidateQueries({ queryKey: ["construction-materials"] });
    void queryClient.invalidateQueries({ queryKey: ["material-cost"] });
  };
}

export function useCreateMaterialMutation() {
  const invalidate = useMaterialInvalidator();

  return useMutation<Material, AppError, CreateMaterialPayload>({
    mutationFn: (payload) => createMaterialApi(payload),
    onSuccess: () => {
      notifySuccess(TOAST.createSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useUpdateMaterialMutation() {
  const invalidate = useMaterialInvalidator();

  return useMutation<Material, AppError, { id: string; payload: UpdateMaterialPayload }>({
    mutationFn: ({ id, payload }) => updateMaterialApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.updateSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useDeleteMaterialMutation() {
  const invalidate = useMaterialInvalidator();

  return useMutation<void, AppError, string>({
    mutationFn: (id) => deleteMaterialApi(id),
    onSuccess: () => {
      notifySuccess(TOAST.deleteSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

// ─── Usage ───────────────────────────────────────────────────────────────────

export function useConstructionMaterials(options: {
  constructionItemId?: string | null;
  constructionTaskId?: string | null;
  enabled?: boolean;
}) {
  const itemId = options.constructionItemId ? String(options.constructionItemId) : undefined;
  const taskId = options.constructionTaskId ? String(options.constructionTaskId) : undefined;

  const query = useQuery<ConstructionMaterial[], Error>({
    queryKey: ["construction-materials", { itemId, taskId }],
    queryFn: async ({ signal }) =>
      getConstructionMaterialsApi(
        { constructionItemId: itemId, constructionTaskId: taskId },
        { signal },
      ),
    // Exactly one target — asking for both is a server-side 400, so don't fire.
    enabled: (options.enabled ?? true) && Boolean(itemId) !== Boolean(taskId),
    staleTime: 30 * 1000,
  });

  return {
    lines: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useAddConstructionMaterialMutation() {
  const invalidate = useMaterialInvalidator();

  return useMutation<ConstructionMaterial, AppError, CreateConstructionMaterialPayload>({
    mutationFn: (payload) => addConstructionMaterialApi(payload),
    onSuccess: () => {
      notifySuccess(TOAST.addUsageSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useUpdateConstructionMaterialMutation() {
  const invalidate = useMaterialInvalidator();

  return useMutation<
    ConstructionMaterial,
    AppError,
    { id: string; payload: UpdateConstructionMaterialPayload }
  >({
    mutationFn: ({ id, payload }) => updateConstructionMaterialApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.updateUsageSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useRemoveConstructionMaterialMutation() {
  const invalidate = useMaterialInvalidator();

  return useMutation<void, AppError, string>({
    mutationFn: (id) => removeConstructionMaterialApi(id),
    onSuccess: () => {
      notifySuccess(TOAST.removeUsageSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useMaterialCost(options: {
  constructionItemId: string | null | undefined;
  enabled?: boolean;
}) {
  const id = options.constructionItemId ? String(options.constructionItemId) : "";

  const query = useQuery<MaterialCostSummary, Error>({
    queryKey: ["material-cost", { id }],
    queryFn: async ({ signal }) => getMaterialCostApi(id, { signal }),
    enabled: (options.enabled ?? true) && Boolean(id),
    staleTime: 30 * 1000,
  });

  return {
    cost: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
