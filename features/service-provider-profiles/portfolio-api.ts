import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  CreateProviderPortfolioPayload,
  ProviderPortfolio,
  ProviderPortfolioImage,
  ProviderPortfolioImagePayload,
  ProviderPortfolioListResponse,
  UpdateProviderPortfolioPayload,
} from "./portfolio-types";

/**
 * A provider's sample projects, featured ones first.
 *
 * Endpoint: `GET /api/provider-portfolios?serviceProviderProfileId=&pageNumber=&pageSize=`
 */
export async function getProviderPortfoliosApi(
  serviceProviderProfileId: string,
  options?: { pageNumber?: number; pageSize?: number },
  config?: RequestConfig,
): Promise<ProviderPortfolioListResponse> {
  const params = new URLSearchParams();
  params.set("serviceProviderProfileId", serviceProviderProfileId);
  params.set("pageSize", String(options?.pageSize ?? 20));
  if (options?.pageNumber) params.set("pageNumber", String(options.pageNumber));

  const response = await api.get<ProviderPortfolioListResponse>(
    `/api/provider-portfolios?${params.toString()}`,
    config,
  );
  return response.data;
}

/** Endpoint: `GET /api/provider-portfolios/{id}` */
export async function getProviderPortfolioApi(
  id: string,
  config?: RequestConfig,
): Promise<ProviderPortfolio> {
  const response = await api.get<ProviderPortfolio>(
    `/api/provider-portfolios/${id}`,
    config,
  );
  return response.data;
}

/**
 * Endpoint: `POST /api/provider-portfolios`
 *
 * Images travel with the body, so one submit files the whole entry.
 */
export async function createProviderPortfolioApi(
  payload: CreateProviderPortfolioPayload,
  config?: RequestConfig,
): Promise<ProviderPortfolio> {
  const response = await api.post<ProviderPortfolio>(
    "/api/provider-portfolios",
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `PUT /api/provider-portfolios/{id}` */
export async function updateProviderPortfolioApi(
  id: string,
  payload: UpdateProviderPortfolioPayload,
  config?: RequestConfig,
): Promise<ProviderPortfolio> {
  const response = await api.put<ProviderPortfolio>(
    `/api/provider-portfolios/${id}`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `DELETE /api/provider-portfolios/{id}` */
export async function deleteProviderPortfolioApi(
  id: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/provider-portfolios/${id}`, config);
}

/** Endpoint: `POST /api/provider-portfolios/{id}/images` */
export async function addProviderPortfolioImageApi(
  portfolioId: string,
  payload: ProviderPortfolioImagePayload,
  config?: RequestConfig,
): Promise<ProviderPortfolioImage> {
  const response = await api.post<ProviderPortfolioImage>(
    `/api/provider-portfolios/${portfolioId}/images`,
    payload,
    config,
  );
  return response.data;
}

/** Endpoint: `DELETE /api/provider-portfolios/images/{imageId}` */
export async function removeProviderPortfolioImageApi(
  imageId: string,
  config?: RequestConfig,
): Promise<void> {
  await api.delete(`/api/provider-portfolios/images/${imageId}`, config);
}
