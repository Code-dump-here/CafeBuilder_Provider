// ─── Normalized shapes ───────────────────────────────────────────────────────

import type { UserRole } from "@/lib/http/auth";
export type { UserRole } from "@/lib/http/auth";

/**
 * The provider's self-declared capability level.
 * Used internally within the auth/me domain.
 */
export type ProviderCapability = "design" | "construction" | "both";

/**
 * The type of service provider.
 */
export type ProviderType = "individual" | "company";

export interface NormalizedShopOwnerProfile {
  id: number;
  fullName: string;
  shopName: string;
  phone: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NormalizedDesignerProfile {
  specialties: string[] | null;
  softwareSkills: string[] | null;
  designStyle: string | null;
  minProjectBudget: number | null;
}

export interface NormalizedConstructorProfile {
  licenseNo: string | null;
  teamSize: string | null;
  equipment: string[] | null;
  maxProjectValue: number | null;
  warrantyPolicy: string | null;
}

export interface NormalizedServiceProviderProfile {
  id: number;
  displayName: string;
  providerType: ProviderType;
  capability: ProviderCapability;
  bio: string;
  companyTaxCode: string | null;
  yearsExperience: number | null;
  portfolioHeadline: string | null;
  isVerified: boolean;
  avgRating: number | null;
  createdAt: Date;
  updatedAt: Date;
  designer: NormalizedDesignerProfile | null;
  /**
   * No `constructor` field: naming a property `constructor` shadows the
   * built-in, and React Query's structural sharing reads
   * `data.constructor.prototype` when diffing a refetch — which throws and
   * makes the query error out, silently discarding the account.
   * See the note in `normalizeAccount`.
   */
}

export interface NormalizedAccount {
  id: number;
  email: string;
  phone: string | null;
  role: UserRole;
  status: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  shopOwner: NormalizedShopOwnerProfile | null;
  serviceProvider: NormalizedServiceProviderProfile | null;
}

// ─── Raw API shapes ───────────────────────────────────────────────────────────

export interface AccountWithProfile {
  id: number;
  email: string;
  phone: string | null;
  role: UserRole;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  shopOwner: ShopOwnerProfile | null;
  serviceProvider: ServiceProviderProfile | null;
}

export interface ShopOwnerProfile {
  id: number;
  fullName: string;
  shopName: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface DesignerProfile {
  specialties: string[] | null;
  softwareSkills: string[] | null;
  designStyle: string | null;
  minProjectBudget: number | null;
}

export interface ConstructorProfile {
  licenseNo: string | null;
  teamSize: string | null;
  equipment: string[] | null;
  maxProjectValue: number | null;
  warrantyPolicy: string | null;
}

export interface ServiceProviderProfile {
  id: number;
  displayName: string;
  providerType: ProviderType;
  capability: ProviderCapability;
  bio: string;
  companyTaxCode: string | null;
  yearsExperience: number | null;
  portfolioHeadline: string | null;
  isVerified: boolean;
  avgRating: number | null;
  createdAt: string;
  updatedAt: string;
  designer: DesignerProfile | null;
  constructor: ConstructorProfile | null;
}
