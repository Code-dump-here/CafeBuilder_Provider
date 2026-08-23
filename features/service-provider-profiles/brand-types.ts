/**
 * Provider brand types — mirrors the wire contract for `api/provider-brands`.
 *
 * The parts of a provider's identity an owner reads *before* hiring: the logo
 * and cover, an intro video, the story, where they work, and what they are
 * certified to do. Separate from `service-provider-profiles`, which holds the
 * account-shaped facts (display name, capability, type).
 *
 * Every `*ViewUrl` is the server's resolved, displayable form of the `*Url`
 * beside it. Render the view URL; keep the raw one for editing.
 */

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "zalo"
  | "website"
  | "other";

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "zalo",
  "website",
  "other",
] as const;

export type CertificateKind =
  | "license"
  | "certificate"
  | "award"
  | "membership"
  | "other";

export const CERTIFICATE_KINDS: readonly CertificateKind[] = [
  "license",
  "certificate",
  "award",
  "membership",
  "other",
] as const;

export interface ProviderSocialLink {
  id: string;
  serviceProviderProfileId: string;
  /** One row per platform — the server rejects a duplicate with 409. */
  platform: SocialPlatform;
  url: string;
  label: string | null;
  sortOrder: number;
}

export interface ProviderServiceArea {
  id: string;
  serviceProviderProfileId: string;
  province: string;
  district: string | null;
  note: string | null;
  sortOrder: number;
}

export interface ProviderCertificate {
  id: string;
  serviceProviderProfileId: string;
  kind: CertificateKind;
  name: string;
  issuer: string | null;
  certificateNo: string | null;
  /** `yyyy-MM-dd` — the API speaks `DateOnly` here, not an instant. */
  issuedAt: string | null;
  expiresAt: string | null;
  fileUrl: string | null;
  fileViewUrl: string | null;
  /** Only an admin can set this; the owning provider cannot self-verify. */
  isVerified: boolean;
  /** Null when there is no expiry date to compare against. */
  isExpired: boolean | null;
  sortOrder: number;
}

export interface ProviderBrand {
  serviceProviderProfileId: string;
  displayName: string;
  logoUrl: string | null;
  logoViewUrl: string | null;
  coverImageUrl: string | null;
  coverImageViewUrl: string | null;
  introVideoUrl: string | null;
  introVideoViewUrl: string | null;
  website: string | null;
  brandStory: string | null;
  companyAddress: string | null;
  foundedYear: number | null;
  employeeCount: number | null;
  yearsExperience: number | null;
  isVerified: boolean;
  avgRating: number;
  reviewCount: number;
  socialLinks: ProviderSocialLink[];
  serviceAreas: ProviderServiceArea[];
  certificates: ProviderCertificate[];
}

export interface UpdateProviderBrandPayload {
  logoUrl?: string;
  coverImageUrl?: string;
  introVideoUrl?: string;
  website?: string;
  brandStory?: string;
  companyAddress?: string;
  foundedYear?: number;
  employeeCount?: number;
}

export interface ProviderSocialLinkPayload {
  platform: SocialPlatform;
  url: string;
  label?: string;
  sortOrder?: number;
}

export interface ProviderServiceAreaPayload {
  province: string;
  district?: string;
  note?: string;
  sortOrder?: number;
}

export interface ProviderCertificatePayload {
  kind: CertificateKind;
  name: string;
  issuer?: string;
  certificateNo?: string;
  issuedAt?: string;
  expiresAt?: string;
  fileUrl?: string;
  sortOrder?: number;
}
