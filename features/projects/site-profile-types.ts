/**
 * Site profile types — mirrors the wire contract for `api/site-profiles`.
 *
 * The *physical* premises, as opposed to `projects.areaM2`, which is the
 * single number the owner typed when they created the project. This record is
 * the surveyed one: it can be filled in gradually, it carries per-floor detail,
 * and it lists the openings (doors, windows, balconies) that decide where a
 * counter or a seating run can actually go.
 *
 * One profile per project (`ix_site_profiles_project_id` is unique), so there
 * is no list endpoint — you look it up by project and get one or a 404.
 */

/** Compass bearing of the frontage, or of a single opening. */
export type Orientation =
  | "north"
  | "northeast"
  | "east"
  | "southeast"
  | "south"
  | "southwest"
  | "west"
  | "northwest";

export const ORIENTATIONS: readonly Orientation[] = [
  "north",
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
] as const;

/** What kind of opening a row describes. */
export type SiteOpeningType =
  | "main_door"
  | "secondary_door"
  | "service_door"
  | "window"
  | "balcony"
  | "terrace"
  | "skylight";

export const SITE_OPENING_TYPES: readonly SiteOpeningType[] = [
  "main_door",
  "secondary_door",
  "service_door",
  "window",
  "balcony",
  "terrace",
  "skylight",
] as const;

/** One storey. */
export interface SiteFloor {
  id: string;
  siteProfileId: string;
  /**
   * 1 = ground, 2 = first floor up, and so on. Negative for basements,
   * 0 reserved for a mezzanine. Unique per profile.
   */
  floorNo: number;
  name: string | null;
  areaM2: number | null;
  ceilingHeightM: number | null;
  purpose: string | null;
  note: string | null;
}

/** One door / window / balcony / terrace / skylight. */
export interface SiteOpening {
  id: string;
  siteProfileId: string;
  /** Null when the opening has not been pinned to a specific floor yet. */
  siteFloorId: string | null;
  type: SiteOpeningType;
  orientation: Orientation | null;
  widthM: number | null;
  heightM: number | null;
  /** Identical openings collapsed onto one row (4 matching windows = qty 4). */
  quantity: number;
  note: string | null;
  sortOrder: number;
}

export interface SiteProfile {
  id: string;
  projectShopOwnerId: string;
  lengthM: number | null;
  widthM: number | null;
  frontageWidthM: number | null;
  ceilingHeightM: number | null;
  roadWidthM: number | null;
  orientation: Orientation | null;
  floorCount: number | null;
  hasMezzanine: boolean;
  structureNote: string | null;
  existingConditionNote: string | null;
  /** length × width, computed server-side. Null unless both are present. */
  derivedFootprintM2: number | null;
  /** Sum of the per-floor areas. Null when no floor declares one. */
  totalFloorAreaM2: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  floors: SiteFloor[];
  openings: SiteOpening[];
}

export interface SiteFloorPayload {
  floorNo: number;
  name?: string;
  areaM2?: number;
  ceilingHeightM?: number;
  purpose?: string;
  note?: string;
}

export interface SiteOpeningPayload {
  type: SiteOpeningType;
  /** Attach to a floor by id, or by its number — the server resolves either. */
  siteFloorId?: string;
  floorNo?: number;
  orientation?: Orientation;
  widthM?: number;
  heightM?: number;
  quantity?: number;
  note?: string;
  sortOrder?: number;
}

export interface CreateSiteProfilePayload {
  projectShopOwnerId: string;
  lengthM?: number;
  widthM?: number;
  frontageWidthM?: number;
  ceilingHeightM?: number;
  roadWidthM?: number;
  orientation?: Orientation;
  floorCount?: number;
  hasMezzanine?: boolean;
  structureNote?: string;
  existingConditionNote?: string;
  floors?: SiteFloorPayload[];
  openings?: SiteOpeningPayload[];
}

export interface UpdateSiteProfilePayload {
  lengthM?: number;
  widthM?: number;
  frontageWidthM?: number;
  ceilingHeightM?: number;
  roadWidthM?: number;
  orientation?: Orientation;
  floorCount?: number;
  hasMezzanine?: boolean;
  structureNote?: string;
  existingConditionNote?: string;
}
