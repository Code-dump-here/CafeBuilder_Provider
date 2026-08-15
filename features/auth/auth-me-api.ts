import { api } from "@/lib/http/axios";
import type { RequestConfig } from "@/lib/http/types";
import type {
  AccountWithProfile,
  NormalizedAccount,
} from "./auth-me-types";

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

function normalizeShopOwner(raw: AccountWithProfile["shopOwner"]): NonNullable<NormalizedAccount["shopOwner"]> {
  if (!raw) throw new Error("Unexpected null shopOwner");
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

function normalizeServiceProvider(raw: NonNullable<AccountWithProfile["serviceProvider"]>): NonNullable<NormalizedAccount["serviceProvider"]> {
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
    // NOTE: there is deliberately no `constructor` key here.
    //
    // This used to read `raw.constructor ? {...} : null`. Every object inherits
    // `Object.prototype.constructor`, so that was ALWAYS truthy and produced a
    // sub-profile of all-undefined fields for every user, designers included.
    //
    // The damaging part was the key itself. Putting `constructor` on the
    // returned account shadows the built-in, and React Query's structural
    // sharing reads `data.constructor.prototype` when diffing a refetch against
    // cached data. That threw:
    //
    //   Structural sharing requires data to be JSON serializable...
    //   [["auth","me"]]: TypeError: Cannot read properties of null
    //                    (reading 'prototype')
    //
    // React Query then marked the query errored and dropped the account. The
    // first fetch after login succeeded (nothing to diff against) and the first
    // refetch destroyed it — so the app looked signed-in but empty until a
    // manual reload, and every screen deriving `account.serviceProvider.id`
    // rendered as "nothing here".
    //
    // Setting it to `null` would not help: the key would still shadow the
    // built-in and `null.prototype` throws just the same. The backend does not
    // return this sub-profile at all (ServiceProviderProfileResponse has no
    // licenseNo/teamSize/equipment), and nothing reads it, so it is gone.
  };
}
