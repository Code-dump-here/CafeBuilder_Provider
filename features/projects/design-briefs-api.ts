import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  DesignBrief,
  RawDesignBrief,
} from "./design-brief-list-types";

// ─── Filters ────────────────────────────────────────────────────────────────

export interface DesignBriefListFilters {
  /** Required by the backend to scope briefs to one project. */
  projectId: string;
  pageNumber: number;
  pageSize: number;
}

// ─── Paged response ─────────────────────────────────────────────────────────

/**
 * Mirror of the backend `PagedResponse<T>` envelope. Reused from the
 * marketplace wire shape — the API is consistent across resources.
 */
export interface PagedDesignBriefs {
  items: DesignBrief[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// ─── Wire types ─────────────────────────────────────────────────────────────

interface RawPagedDesignBriefs {
  items: RawDesignBrief[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch the (paged) design briefs for a given project.
 *
 * Endpoint: `GET /api/design-briefs?pageNumber={n}&pageSize={m}&projectId={id}`.
 *
 * The shared `api` axios instance already attaches the Bearer access
 * token via the request interceptor (see `lib/http/axios.ts`). No extra
 * auth wiring is needed here — the user just needs to be logged in.
 */
export async function fetchDesignBriefs(
  filters: DesignBriefListFilters,
  config?: RequestConfig,
): Promise<PagedDesignBriefs> {
  const response = await api.get<RawPagedDesignBriefs>(
    "/api/design-briefs",
    {
      ...config,
      params: {
        projectId: filters.projectId,
        pageNumber: filters.pageNumber,
        pageSize: filters.pageSize,
      },
    },
  );
  return normalizePagedResponse(response.data);
}

// ─── Normalization ──────────────────────────────────────────────────────────

function normalizePagedResponse(
  raw: RawPagedDesignBriefs,
): PagedDesignBriefs {
  return {
    items: raw.items.map(normalizeBrief),
    pageNumber: raw.pageNumber,
    pageSize: raw.pageSize,
    totalItems: raw.totalItems,
    totalPages: raw.totalPages,
    hasPrevious: raw.hasPrevious,
    hasNext: raw.hasNext,
  };
}

function normalizeBrief(raw: RawDesignBrief): DesignBrief {
  return {
    id: raw.id,
    projectId: raw.projectId,
    targetCustomer: raw.targetCustomer ?? "",
    style: raw.style ?? "",
    mood: raw.mood ?? "",
    seatCount: typeof raw.seatCount === "number" ? raw.seatCount : null,
    timeline: raw.timeline ?? null,
    brandNote: raw.brandNote ?? null,
    businessModel: raw.businessModel ?? null,
    businessGoals: raw.businessGoals ?? null,
    operationNote: raw.operationNote ?? null,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    // The brief-list endpoint doesn't carry AI recommendations; downstream
    // hooks that need them should call the dedicated recommendations API.
    aiRecommendations: [],
  };
}
