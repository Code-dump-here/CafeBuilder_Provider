"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  addSiteFloorApi,
  addSiteOpeningApi,
  createSiteProfileApi,
  deleteSiteProfileApi,
  getSiteProfileByProjectApi,
  removeSiteFloorApi,
  removeSiteOpeningApi,
  updateSiteFloorApi,
  updateSiteOpeningApi,
  updateSiteProfileApi,
} from "./site-profile-api";
import type {
  CreateSiteProfilePayload,
  SiteFloor,
  SiteFloorPayload,
  SiteOpening,
  SiteOpeningPayload,
  SiteProfile,
  UpdateSiteProfilePayload,
} from "./site-profile-types";

const TOAST = {
  createSuccess: "Đã lưu thông số mặt bằng.",
  updateSuccess: "Đã cập nhật thông số mặt bằng.",
  deleteSuccess: "Đã xoá hồ sơ mặt bằng.",
  floorAdded: "Đã thêm tầng.",
  floorUpdated: "Đã cập nhật tầng.",
  floorRemoved: "Đã xoá tầng.",
  openingAdded: "Đã thêm cửa / ban công.",
  openingUpdated: "Đã cập nhật cửa / ban công.",
  openingRemoved: "Đã xoá cửa / ban công.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Bạn không có quyền sửa thông số mặt bằng của dự án này.",
  notFound: "Không tìm thấy hồ sơ mặt bằng.",
  generic: "Không thể thực hiện. Vui lòng thử lại sau.",
} as const;

/**
 * The server explains its own refusals in full sentences ("một mặt bằng không
 * có hai tầng số 2", "chỉ chủ dự án hoặc nhà cung cấp đang thực hiện…"), so its
 * message wins wherever there is one.
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
    case 403:
      return TOAST.unauthorized;
    case 404:
      return TOAST.notFound;
    default:
      return TOAST.generic;
  }
}

const siteProfileKey = (projectShopOwnerId: string) =>
  ["site-profile", { projectShopOwnerId }] as const;

/**
 * The premises record for a project, or `null` when nobody has measured it.
 *
 * A 404 here is an ordinary state, not a failure: most projects have no
 * profile until someone fills the form in. Letting it reach `isError` would
 * put an error panel in front of the very button that creates one.
 */
export function useSiteProfile(options: {
  projectShopOwnerId: string | null | undefined;
  enabled?: boolean;
}) {
  const projectShopOwnerId = options.projectShopOwnerId
    ? String(options.projectShopOwnerId)
    : "";

  const query = useQuery<SiteProfile | null, Error>({
    queryKey: siteProfileKey(projectShopOwnerId),
    queryFn: async ({ signal }) => {
      try {
        return await getSiteProfileByProjectApi(projectShopOwnerId, { signal });
      } catch (error) {
        if (error instanceof AppError && error.status === 404) return null;
        throw error;
      }
    },
    enabled: (options.enabled ?? true) && Boolean(projectShopOwnerId),
    staleTime: 30 * 1000,
  });

  return {
    profile: query.data ?? null,
    /** `true` once we know there is no profile — distinct from still loading. */
    isMissing: query.isSuccess && query.data === null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Everything that renders premises data for one project. */
function useSiteProfileInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["site-profile"] });
  };
}

export function useCreateSiteProfileMutation() {
  const invalidate = useSiteProfileInvalidator();

  return useMutation<SiteProfile, AppError, CreateSiteProfilePayload>({
    mutationFn: (payload) => createSiteProfileApi(payload),
    onSuccess: () => {
      notifySuccess(TOAST.createSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useUpdateSiteProfileMutation() {
  const invalidate = useSiteProfileInvalidator();

  return useMutation<
    SiteProfile,
    AppError,
    { id: string; payload: UpdateSiteProfilePayload }
  >({
    mutationFn: ({ id, payload }) => updateSiteProfileApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.updateSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useDeleteSiteProfileMutation() {
  const invalidate = useSiteProfileInvalidator();

  return useMutation<void, AppError, string>({
    mutationFn: (id) => deleteSiteProfileApi(id),
    onSuccess: () => {
      notifySuccess(TOAST.deleteSuccess);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

// ─── Floors ──────────────────────────────────────────────────────────────────

export function useAddSiteFloorMutation() {
  const invalidate = useSiteProfileInvalidator();

  return useMutation<
    SiteFloor,
    AppError,
    { siteProfileId: string; payload: SiteFloorPayload }
  >({
    mutationFn: ({ siteProfileId, payload }) => addSiteFloorApi(siteProfileId, payload),
    onSuccess: () => {
      notifySuccess(TOAST.floorAdded);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useUpdateSiteFloorMutation() {
  const invalidate = useSiteProfileInvalidator();

  return useMutation<SiteFloor, AppError, { floorId: string; payload: SiteFloorPayload }>({
    mutationFn: ({ floorId, payload }) => updateSiteFloorApi(floorId, payload),
    onSuccess: () => {
      notifySuccess(TOAST.floorUpdated);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useRemoveSiteFloorMutation() {
  const invalidate = useSiteProfileInvalidator();

  return useMutation<void, AppError, string>({
    mutationFn: (floorId) => removeSiteFloorApi(floorId),
    onSuccess: () => {
      notifySuccess(TOAST.floorRemoved);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

// ─── Openings ────────────────────────────────────────────────────────────────

export function useAddSiteOpeningMutation() {
  const invalidate = useSiteProfileInvalidator();

  return useMutation<
    SiteOpening,
    AppError,
    { siteProfileId: string; payload: SiteOpeningPayload }
  >({
    mutationFn: ({ siteProfileId, payload }) => addSiteOpeningApi(siteProfileId, payload),
    onSuccess: () => {
      notifySuccess(TOAST.openingAdded);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useUpdateSiteOpeningMutation() {
  const invalidate = useSiteProfileInvalidator();

  return useMutation<
    SiteOpening,
    AppError,
    { openingId: string; payload: SiteOpeningPayload }
  >({
    mutationFn: ({ openingId, payload }) => updateSiteOpeningApi(openingId, payload),
    onSuccess: () => {
      notifySuccess(TOAST.openingUpdated);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useRemoveSiteOpeningMutation() {
  const invalidate = useSiteProfileInvalidator();

  return useMutation<void, AppError, string>({
    mutationFn: (openingId) => removeSiteOpeningApi(openingId),
    onSuccess: () => {
      notifySuccess(TOAST.openingRemoved);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}
