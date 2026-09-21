/**
 * Mock data for the admin console.
 *
 * Held separately from contractor / customer mock data so the admin
 * shape stays consistent. Everything in this file is placeholder —
 * replace with real queries (e.g. SWR hooks) when the backend lands.
 */

export type AccountRole = "admin" | "contractor" | "customer";
export type AccountStatus = "active" | "invited" | "suspended";

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  /** Joined timestamp, ISO. */
  joinedAt: string;
  /** Last activity timestamp, ISO. */
  lastActiveAt: string;
  /** Number of projects this account owns (customers) or runs (contractors). */
  projectCount: number;
  /** Optional avatar URL. */
  avatar?: string;
}

export interface AdminProject {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  contractorId: string;
  contractorName: string;
  status: "active" | "on_hold" | "completed" | "draft";
  /** 0..100. */
  progress: number;
  budget: number;
  spent: number;
  /** ISO. */
  updatedAt: string;
  city: string;
}

export interface AdminMetric {
  id: "users" | "contractors" | "projects" | "revenue" | "active_builds" | "new_signups";
  label: string;
  value: string;
  /** Period-over-period change, e.g. "+8.2%" vs previous 30d. */
  delta: number;
  inverse?: boolean;
  icon: "users" | "hard-hat" | "folder" | "trending-up" | "hammer" | "user-plus";
}

export interface AdminActivity {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  /**
   * Key under `Admin.activity.events`, with its placeholder values. The row
   * used to hold a finished English sentence, which meant the Vietnamese
   * activity page was written in English.
   */
  textKey: string;
  values: Record<string, string>;
  icon: "user-plus" | "pencil" | "trash-2" | "check-circle-2" | "pause";
  href?: string;
}

/** ISO timestamp `daysAgo` days back; fractions are allowed, so a row can
 *  read "3 hours ago" rather than "1 second ago". */
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

export const ADMIN_METRICS: AdminMetric[] = [
  { id: "users", label: "Total users", value: "4,231", delta: 8.2, icon: "users" },
  { id: "contractors", label: "Active contractors", value: "168", delta: 4.6, icon: "hard-hat" },
  { id: "projects", label: "Projects", value: "942", delta: 12.4, icon: "folder" },
  { id: "active_builds", label: "Active builds", value: "73", delta: -2.1, inverse: true, icon: "hammer" },
  { id: "revenue", label: "Monthly revenue", value: "$84.2k", delta: 14.8, icon: "trending-up" },
  { id: "new_signups", label: "New signups (7d)", value: "112", delta: 22.4, icon: "user-plus" },
];

export const ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    id: "u_001",
    name: "Mai Nguyen",
    email: "mai.nguyen@aicoffee.io",
    role: "admin",
    status: "active",
    joinedAt: iso(412),
    lastActiveAt: iso(0),
    projectCount: 0,
  },
  {
    id: "u_002",
    name: "Hung Tran",
    email: "hung.tran@aicoffee.io",
    role: "contractor",
    status: "active",
    joinedAt: iso(285),
    lastActiveAt: iso(0),
    projectCount: 12,
  },
  {
    id: "u_003",
    name: "Dat Le",
    email: "dat.le@aicoffee.io",
    role: "contractor",
    status: "active",
    joinedAt: iso(220),
    lastActiveAt: iso(1),
    projectCount: 8,
  },
  {
    id: "u_004",
    name: "Phuong Vu",
    email: "phuong.vu@gmail.com",
    role: "customer",
    status: "active",
    joinedAt: iso(120),
    lastActiveAt: iso(2),
    projectCount: 1,
  },
  {
    id: "u_005",
    name: "Khoi Pham",
    email: "khoi.pham@gmail.com",
    role: "contractor",
    status: "active",
    joinedAt: iso(160),
    lastActiveAt: iso(0),
    projectCount: 5,
  },
  {
    id: "u_006",
    name: "Hai Bui",
    email: "hai.bui@gmail.com",
    role: "contractor",
    status: "invited",
    joinedAt: iso(5),
    lastActiveAt: iso(5),
    projectCount: 0,
  },
  {
    id: "u_007",
    name: "Minh Do",
    email: "minh.do@gmail.com",
    role: "customer",
    status: "suspended",
    joinedAt: iso(310),
    lastActiveAt: iso(45),
    projectCount: 0,
  },
  {
    id: "u_008",
    name: "Lan Hoang",
    email: "lan.hoang@gmail.com",
    role: "customer",
    status: "active",
    joinedAt: iso(80),
    lastActiveAt: iso(0),
    projectCount: 2,
  },
  {
    id: "u_009",
    name: "Quan Vu",
    email: "quan.vu@gmail.com",
    role: "contractor",
    status: "active",
    joinedAt: iso(190),
    lastActiveAt: iso(2),
    projectCount: 14,
  },
  {
    id: "u_010",
    name: "Trang Phan",
    email: "trang.phan@outlook.com",
    role: "customer",
    status: "active",
    joinedAt: iso(60),
    lastActiveAt: iso(1),
    projectCount: 1,
  },
];

export const ADMIN_PROJECTS: AdminProject[] = [
  {
    id: "p_demo",
    name: "Nhà Nâu Coffee",
    ownerId: "u_004",
    ownerName: "Trần Minh Anh",
    contractorId: "u_002",
    contractorName: "Xưởng Mộc Bình Minh",
    status: "active",
    progress: 68,
    budget: 289_000_000,
    spent: 196_500_000,
    updatedAt: iso(0.2),
    city: "Hồ Chí Minh",
  },
  {
    id: "p_001",
    name: "Góc Sân Cà Phê",
    ownerId: "u_008",
    ownerName: "Lê Quốc Huy",
    contractorId: "u_003",
    contractorName: "Xây dựng Nam Việt",
    status: "active",
    progress: 24,
    budget: 174_000_000,
    spent: 41_800_000,
    updatedAt: iso(1),
    city: "Hồ Chí Minh",
  },
  {
    id: "p_002",
    name: "Cà phê Phố Cổ",
    ownerId: "u_010",
    ownerName: "Phạm Thu Hà",
    contractorId: "u_005",
    contractorName: "Thiết kế An Tiên",
    status: "on_hold",
    progress: 42,
    budget: 143_000_000,
    spent: 60_200_000,
    updatedAt: iso(2),
    city: "Hà Nội",
  },
  {
    id: "p_003",
    name: "Kiosk Biển Mỹ Khê",
    ownerId: "u_008",
    ownerName: "Lê Quốc Huy",
    contractorId: "u_009",
    contractorName: "Nội thất Aurora",
    status: "active",
    progress: 86,
    budget: 96_000_000,
    spent: 81_400_000,
    updatedAt: iso(0.6),
    city: "Đà Nẵng",
  },
  {
    id: "p_004",
    name: "Bếp Nhà Lúa",
    ownerId: "u_004",
    ownerName: "Trần Minh Anh",
    contractorId: "u_002",
    contractorName: "Xưởng Mộc Bình Minh",
    status: "completed",
    progress: 100,
    budget: 412_000_000,
    spent: 398_600_000,
    updatedAt: iso(12),
    city: "Hồ Chí Minh",
  },
  {
    id: "p_005",
    name: "Vườn Xưa Rang Xay",
    ownerId: "u_010",
    ownerName: "Đỗ Gia Bảo",
    contractorId: "u_009",
    contractorName: "Nội thất Aurora",
    status: "draft",
    progress: 0,
    budget: 68_000_000,
    spent: 0,
    updatedAt: iso(8),
    city: "Huế",
  },
];

export const ADMIN_ACTIVITY: AdminActivity[] = [
  { id: "a_01", at: iso(0.12), actorId: "u_004", actorName: "Trần Minh Anh", textKey: "photosUploaded", values: { project: "Nhà Nâu Coffee" }, icon: "check-circle-2", href: "/projects/p_demo/design-management" },
  { id: "a_02", at: iso(0.3), actorId: "u_005", actorName: "Xây dựng Nam Việt", textKey: "joinedProject", values: { project: "Nhà Nâu Coffee" }, icon: "user-plus" },
  { id: "a_03", at: iso(1), actorId: "u_010", actorName: "Phạm Thu Hà", textKey: "milestoneSignedOff", values: { milestone: "2", project: "Cà phê Phố Cổ" }, icon: "check-circle-2" },
  { id: "a_04", at: iso(1), actorId: "u_008", actorName: "Lê Quốc Huy", textKey: "projectPaused", values: { project: "Cà phê Phố Cổ" }, icon: "pause" },
  { id: "a_05", at: iso(2), actorId: "u_006", actorName: "Thiết kế An Tiên", textKey: "providerInvited", values: {}, icon: "user-plus" },
  { id: "a_06", at: iso(3), actorId: "u_002", actorName: "Xưởng Mộc Bình Minh", textKey: "designVersionCreated", values: { version: "3.0", project: "Nhà Nâu Coffee" }, icon: "pencil", href: "/projects/p_demo/design-management" },
  { id: "a_07", at: iso(4), actorId: "u_007", actorName: "Nội thất Aurora", textKey: "accountBanned", values: { admin: "Quản trị viên" }, icon: "trash-2" },
];

/** Last 30d "active builds per day" — drives the chart. */
export const ADMIN_BUILDS_TIMELINE: { day: number; builds: number }[] = [
  { day: 1, builds: 48 }, { day: 2, builds: 52 }, { day: 3, builds: 47 }, { day: 4, builds: 51 },
  { day: 5, builds: 56 }, { day: 6, builds: 60 }, { day: 7, builds: 55 }, { day: 8, builds: 58 },
  { day: 9, builds: 62 }, { day: 10, builds: 64 }, { day: 11, builds: 60 }, { day: 12, builds: 66 },
  { day: 13, builds: 68 }, { day: 14, builds: 70 }, { day: 15, builds: 67 }, { day: 16, builds: 72 },
  { day: 17, builds: 74 }, { day: 18, builds: 70 }, { day: 19, builds: 75 }, { day: 20, builds: 78 },
  { day: 21, builds: 76 }, { day: 22, builds: 80 }, { day: 23, builds: 82 }, { day: 24, builds: 79 },
  { day: 25, builds: 84 }, { day: 26, builds: 86 }, { day: 27, builds: 83 }, { day: 28, builds: 88 },
  { day: 29, builds: 90 }, { day: 30, builds: 92 },
];