/**
 * Types for GET /api/auth/me response.
 *
 * This endpoint returns the currently authenticated account with their
 * associated profile (shopOwner or serviceProvider).
 */

import type { UserRole } from "@/lib/http/auth";

// ─── Service Provider Profile Types ──────────────────────────────────────────

export type ProviderType = "individual" | "company";
export type ProviderCapability = "design" | "construction" | "both";

export interface DesignerProfile {
  specialties: string | null;
  softwareSkills: string | null;
  designStyle: string | null;
  minProjectBudget: number | null;
}

export interface ConstructorProfile {
  licenseNo: string | null;
  teamSize: number | null;
  equipment: string | null;
  maxProjectValue: number | null;
  warrantyPolicy: string | null;
}

export interface ServiceProviderProfile {
  id: number;
  displayName: string;
  providerType: ProviderType;
  capability: ProviderCapability;
  bio: string | null;
  companyTaxCode: string | null;
  yearsExperience: number | null;
  portfolioHeadline: string | null;
  isVerified: boolean;
  avgRating: number | null;
  createdAt: string;
  updatedAt: string;
  /** Only present if capability includes design */
  designer: DesignerProfile | null;
  /** Only present if capability includes construction */
  constructor: ConstructorProfile | null;
}

// ─── Shop Owner Profile ────────────────────────────────────────────────────────

export interface ShopOwnerProfile {
  id: number;
  fullName: string;
  shopName: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Account with Profile ─────────────────────────────────────────────────────

/**
 * Full account response from GET /api/auth/me.
 *
 * The response shape varies based on role:
 * - owner: has shopOwner, serviceProvider is null
 * - provider: has serviceProvider (with designer and/or constructor), shopOwner is null
 * - admin: both are null
 */
export interface AccountWithProfile {
  id: number;
  email: string;
  phone: string | null;
  role: UserRole;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only present for owner role */
  shopOwner: ShopOwnerProfile | null;
  /** Only present for provider role */
  serviceProvider: ServiceProviderProfile | null;
}

// ─── Normalized (app-facing) types ───────────────────────────────────────────

export interface NormalizedDesignerProfile {
  specialties: string | null;
  softwareSkills: string | null;
  designStyle: string | null;
  minProjectBudget: number | null;
}

export interface NormalizedConstructorProfile {
  licenseNo: string | null;
  teamSize: number | null;
  equipment: string | null;
  maxProjectValue: number | null;
  warrantyPolicy: string | null;
}

export interface NormalizedServiceProviderProfile {
  id: number;
  displayName: string;
  providerType: ProviderType;
  capability: ProviderCapability;
  bio: string | null;
  companyTaxCode: string | null;
  yearsExperience: number | null;
  portfolioHeadline: string | null;
  isVerified: boolean;
  avgRating: number | null;
  createdAt: Date;
  updatedAt: Date;
  designer: NormalizedDesignerProfile | null;
  constructor: NormalizedConstructorProfile | null;
}

export interface NormalizedShopOwnerProfile {
  id: number;
  fullName: string;
  shopName: string | null;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Normalized account with parsed dates.
 */
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
