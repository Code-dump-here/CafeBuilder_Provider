import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";

import type {
  AccountWithProfile,
  NormalizedAccount,
  NormalizedServiceProviderProfile,
  NormalizedShopOwnerProfile,
} from "./auth-me-types";

// ─── Normalization ────────────────────────────────────────────────────────────

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function normalizeAccount(raw: AccountWithProfile): NormalizedAccount {
  const sp = raw.serviceProvider;
  return {
    id: raw.id,
    email: raw.email,
    phone: raw.phone,
    role: raw.role,
    status: raw.status,
    emailVerifiedAt: parseDate(raw.emailVerifiedAt),
    createdAt: parseDate(raw.createdAt) ?? new Date(),
    updatedAt: parseDate(raw.updatedAt) ?? new Date(),
    shopOwner: raw.shopOwner
      ? normalizeShopOwner(raw.shopOwner)
      : null,
    serviceProvider: sp
      ? normalizeServiceProvider(sp)
      : null,
  };
}

function normalizeShopOwner(raw: NonNullable<AccountWithProfile["shopOwner"]>): NormalizedShopOwnerProfile {
  return {
    id: raw.id,
    fullName: raw.fullName,
    shopName: raw.shopName,
    phone: raw.phone,
    address: raw.address,
    createdAt: parseDate(raw.createdAt) ?? new Date(),
    updatedAt: parseDate(raw.updatedAt) ?? new Date(),
  };
}

function normalizeServiceProvider(raw: NonNullable<AccountWithProfile["serviceProvider"]>): NormalizedServiceProviderProfile {
  return {
    id: raw.id,
    displayName: raw.displayName,
    providerType: raw.providerType,
    capability: raw.capability,
    bio: raw.bio,
    companyTaxCode: raw.companyTaxCode,
    yearsExperience: raw.yearsExperience,
    portfolioHeadline: raw.portfolioHeadline,
    isVerified: raw.isVerified,
    avgRating: raw.avgRating,
    createdAt: parseDate(raw.createdAt) ?? new Date(),
    updatedAt: parseDate(raw.updatedAt) ?? new Date(),
    designer: raw.designer
      ? {
          specialties: raw.designer.specialties,
          softwareSkills: raw.designer.softwareSkills,
          designStyle: raw.designer.designStyle,
          minProjectBudget: raw.designer.minProjectBudget,
        }
      : null,
    constructor: raw.constructor
      ? {
          licenseNo: raw.constructor.licenseNo,
          teamSize: raw.constructor.teamSize,
          equipment: raw.constructor.equipment,
          maxProjectValue: raw.constructor.maxProjectValue,
          warrantyPolicy: raw.constructor.warrantyPolicy,
        }
      : null,
  };
}

// ─── API Call ────────────────────────────────────────────────────────────────

/**
 * GET /api/auth/me — fetch the currently authenticated account with profile.
 *
 * Requires a valid access token (automatically attached by the axios interceptor).
 * Returns the full account object including shopOwner or serviceProvider profile.
 */
export async function fetchMe(
  config?: RequestConfig,
): Promise<NormalizedAccount> {
  const response = await api.get<AccountWithProfile>("/api/auth/me", config);
  return normalizeAccount(response.data);
}
