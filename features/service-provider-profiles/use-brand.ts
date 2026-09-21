"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppError } from "@/lib/http/errors";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  addProviderCertificateApi,
  addProviderServiceAreaApi,
  addProviderSocialLinkApi,
  getProviderBrandApi,
  removeProviderCertificateApi,
  removeProviderServiceAreaApi,
  removeProviderSocialLinkApi,
  updateProviderBrandApi,
  updateProviderCertificateApi,
  updateProviderSocialLinkApi,
} from "./brand-api";
import type {
  ProviderBrand,
  ProviderCertificate,
  ProviderCertificatePayload,
  ProviderServiceArea,
  ProviderServiceAreaPayload,
  ProviderSocialLink,
  ProviderSocialLinkPayload,
  UpdateProviderBrandPayload,
} from "./brand-types";
import {
  addProviderPortfolioImageApi,
  createProviderPortfolioApi,
  deleteProviderPortfolioApi,
  getProviderPortfoliosApi,
  removeProviderPortfolioImageApi,
  updateProviderPortfolioApi,
} from "./portfolio-api";
import type {
  CreateProviderPortfolioPayload,
  ProviderPortfolio,
  ProviderPortfolioImage,
  ProviderPortfolioImagePayload,
  ProviderPortfolioListResponse,
  UpdateProviderPortfolioPayload,
} from "./portfolio-types";

const TOAST = {
  brandSaved: "Đã lưu thông tin thương hiệu.",
  linkAdded: "Đã thêm kênh liên hệ.",
  linkUpdated: "Đã cập nhật kênh liên hệ.",
  linkRemoved: "Đã xoá kênh liên hệ.",
  areaAdded: "Đã thêm khu vực nhận việc.",
  areaRemoved: "Đã xoá khu vực nhận việc.",
  certAdded: "Đã thêm chứng chỉ.",
  certUpdated: "Đã cập nhật chứng chỉ.",
  certRemoved: "Đã xoá chứng chỉ.",
  portfolioCreated: "Đã thêm dự án mẫu.",
  portfolioUpdated: "Đã cập nhật dự án mẫu.",
  portfolioDeleted: "Đã xoá dự án mẫu.",
  imageAdded: "Đã thêm ảnh.",
  imageRemoved: "Đã xoá ảnh.",
  network: "Mất kết nối mạng. Vui lòng thử lại.",
  timeout: "Yêu cầu quá thời gian. Vui lòng thử lại.",
  unauthorized: "Bạn chỉ sửa được hồ sơ của chính mình.",
  notFound: "Không tìm thấy dữ liệu.",
  generic: "Không thể thực hiện. Vui lòng thử lại sau.",
} as const;

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

// ─── Brand ───────────────────────────────────────────────────────────────────

export function useProviderBrand(options: {
  serviceProviderProfileId: string | null | undefined;
  enabled?: boolean;
}) {
  const id = options.serviceProviderProfileId
    ? String(options.serviceProviderProfileId)
    : "";

  const query = useQuery<ProviderBrand, Error>({
    queryKey: ["provider-brand", { id }],
    queryFn: async ({ signal }) => getProviderBrandApi(id, { signal }),
    enabled: (options.enabled ?? true) && Boolean(id),
    staleTime: 60 * 1000,
  });

  return {
    brand: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Links, areas and certificates all come back nested inside the brand, so a
 * change to any of them invalidates the one query that carries them.
 */
function useBrandInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["provider-brand"] });
  };
}

export function useUpdateProviderBrandMutation() {
  const invalidate = useBrandInvalidator();

  return useMutation<
    ProviderBrand,
    AppError,
    { serviceProviderProfileId: string; payload: UpdateProviderBrandPayload }
  >({
    mutationFn: ({ serviceProviderProfileId, payload }) =>
      updateProviderBrandApi(serviceProviderProfileId, payload),
    onSuccess: () => {
      notifySuccess(TOAST.brandSaved);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useAddSocialLinkMutation() {
  const invalidate = useBrandInvalidator();

  return useMutation<
    ProviderSocialLink,
    AppError,
    { serviceProviderProfileId: string; payload: ProviderSocialLinkPayload }
  >({
    mutationFn: ({ serviceProviderProfileId, payload }) =>
      addProviderSocialLinkApi(serviceProviderProfileId, payload),
    onSuccess: () => {
      notifySuccess(TOAST.linkAdded);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useUpdateSocialLinkMutation() {
  const invalidate = useBrandInvalidator();

  return useMutation<
    ProviderSocialLink,
    AppError,
    { linkId: string; payload: ProviderSocialLinkPayload }
  >({
    mutationFn: ({ linkId, payload }) => updateProviderSocialLinkApi(linkId, payload),
    onSuccess: () => {
      notifySuccess(TOAST.linkUpdated);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useRemoveSocialLinkMutation() {
  const invalidate = useBrandInvalidator();

  return useMutation<void, AppError, string>({
    mutationFn: (linkId) => removeProviderSocialLinkApi(linkId),
    onSuccess: () => {
      notifySuccess(TOAST.linkRemoved);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useAddServiceAreaMutation() {
  const invalidate = useBrandInvalidator();

  return useMutation<
    ProviderServiceArea,
    AppError,
    { serviceProviderProfileId: string; payload: ProviderServiceAreaPayload }
  >({
    mutationFn: ({ serviceProviderProfileId, payload }) =>
      addProviderServiceAreaApi(serviceProviderProfileId, payload),
    onSuccess: () => {
      notifySuccess(TOAST.areaAdded);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useRemoveServiceAreaMutation() {
  const invalidate = useBrandInvalidator();

  return useMutation<void, AppError, string>({
    mutationFn: (areaId) => removeProviderServiceAreaApi(areaId),
    onSuccess: () => {
      notifySuccess(TOAST.areaRemoved);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useAddCertificateMutation() {
  const invalidate = useBrandInvalidator();

  return useMutation<
    ProviderCertificate,
    AppError,
    { serviceProviderProfileId: string; payload: ProviderCertificatePayload }
  >({
    mutationFn: ({ serviceProviderProfileId, payload }) =>
      addProviderCertificateApi(serviceProviderProfileId, payload),
    onSuccess: () => {
      notifySuccess(TOAST.certAdded);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useUpdateCertificateMutation() {
  const invalidate = useBrandInvalidator();

  return useMutation<
    ProviderCertificate,
    AppError,
    { certificateId: string; payload: ProviderCertificatePayload }
  >({
    mutationFn: ({ certificateId, payload }) =>
      updateProviderCertificateApi(certificateId, payload),
    onSuccess: () => {
      notifySuccess(TOAST.certUpdated);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useRemoveCertificateMutation() {
  const invalidate = useBrandInvalidator();

  return useMutation<void, AppError, string>({
    mutationFn: (certificateId) => removeProviderCertificateApi(certificateId),
    onSuccess: () => {
      notifySuccess(TOAST.certRemoved);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

// ─── Portfolio ───────────────────────────────────────────────────────────────

export function useProviderPortfolios(options: {
  serviceProviderProfileId: string | null | undefined;
  enabled?: boolean;
}) {
  const id = options.serviceProviderProfileId
    ? String(options.serviceProviderProfileId)
    : "";

  const query = useQuery<ProviderPortfolioListResponse, Error>({
    queryKey: ["provider-portfolios", { id }],
    queryFn: async ({ signal }) => getProviderPortfoliosApi(id, undefined, { signal }),
    enabled: (options.enabled ?? true) && Boolean(id),
    staleTime: 60 * 1000,
  });

  return {
    portfolios: query.data?.items ?? [],
    totalItems: query.data?.totalItems ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

function usePortfolioInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["provider-portfolios"] });
  };
}

export function useCreatePortfolioMutation() {
  const invalidate = usePortfolioInvalidator();

  return useMutation<ProviderPortfolio, AppError, CreateProviderPortfolioPayload>({
    mutationFn: (payload) => createProviderPortfolioApi(payload),
    onSuccess: () => {
      notifySuccess(TOAST.portfolioCreated);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useUpdatePortfolioMutation() {
  const invalidate = usePortfolioInvalidator();

  return useMutation<
    ProviderPortfolio,
    AppError,
    { id: string; payload: UpdateProviderPortfolioPayload }
  >({
    mutationFn: ({ id, payload }) => updateProviderPortfolioApi(id, payload),
    onSuccess: () => {
      notifySuccess(TOAST.portfolioUpdated);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useDeletePortfolioMutation() {
  const invalidate = usePortfolioInvalidator();

  return useMutation<void, AppError, string>({
    mutationFn: (id) => deleteProviderPortfolioApi(id),
    onSuccess: () => {
      notifySuccess(TOAST.portfolioDeleted);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useAddPortfolioImageMutation() {
  const invalidate = usePortfolioInvalidator();

  return useMutation<
    ProviderPortfolioImage,
    AppError,
    { portfolioId: string; payload: ProviderPortfolioImagePayload }
  >({
    mutationFn: ({ portfolioId, payload }) =>
      addProviderPortfolioImageApi(portfolioId, payload),
    onSuccess: () => {
      notifySuccess(TOAST.imageAdded);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}

export function useRemovePortfolioImageMutation() {
  const invalidate = usePortfolioInvalidator();

  return useMutation<void, AppError, string>({
    mutationFn: (imageId) => removeProviderPortfolioImageApi(imageId),
    onSuccess: () => {
      notifySuccess(TOAST.imageRemoved);
      invalidate();
    },
    onError: (error) => notifyError(resolveErrorMessage(error)),
  });
}
