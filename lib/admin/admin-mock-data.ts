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
  text: string;
  icon: "user-plus" | "pencil" | "trash-2" | "check-circle-2" | "pause";
  href?: string;
}

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
    name: "Quan 3 Roastery",
    ownerId: "u_004",
    ownerName: "Phuong Vu",
    contractorId: "u_002",
    contractorName: "Hung Tran",
    status: "active",
    progress: 68,
    budget: 145_000,
    spent: 92_500,
    updatedAt: iso(0),
    city: "Ho Chi Minh",
  },
  {
    id: "p_001",
    name: "Thao Dien Brew Lab",
    ownerId: "u_008",
    ownerName: "Lan Hoang",
    contractorId: "u_003",
    contractorName: "Dat Le",
    status: "active",
    progress: 24,
    budget: 88_000,
    spent: 18_200,
    updatedAt: iso(1),
    city: "Ho Chi Minh",
  },
  {
    id: "p_002",
    name: "Hanoi Old Quarter Cafe",
    ownerId: "u_010",
    ownerName: "Trang Phan",
    contractorId: "u_005",
    contractorName: "Khoi Pham",
    status: "on_hold",
    progress: 42,
    budget: 72_000,
    spent: 30_400,
    updatedAt: iso(2),
    city: "Hanoi",
  },
  {
    id: "p_003",
    name: "Da Nang Beach Kiosk",
    ownerId: "u_008",
    ownerName: "Lan Hoang",
    contractorId: "u_009",
    contractorName: "Quan Vu",
    status: "active",
    progress: 86,
    budget: 56_000,
    spent: 47_200,
    updatedAt: iso(0),
    city: "Da Nang",
  },
  {
    id: "p_004",
    name: "Sai Gon Coffee Co.",
    ownerId: "u_004",
    ownerName: "Phuong Vu",
    contractorId: "u_002",
    contractorName: "Hung Tran",
    status: "completed",
    progress: 100,
    budget: 210_000,
    spent: 198_400,
    updatedAt: iso(12),
    city: "Ho Chi Minh",
  },
  {
    id: "p_005",
    name: "Hue Garden Roastery",
    ownerId: "u_010",
    ownerName: "Trang Phan",
    contractorId: "u_009",
    contractorName: "Quan Vu",
    status: "draft",
    progress: 0,
    budget: 34_000,
    spent: 0,
    updatedAt: iso(8),
    city: "Hue",
  },
];

export const ADMIN_ACTIVITY: AdminActivity[] = [
  { id: "a_01", at: iso(0), actorId: "u_004", actorName: "Phuong Vu", text: "uploaded 3 photos to Quan 3 Roastery", icon: "check-circle-2", href: "/projects/p_demo/design-management" },
  { id: "a_02", at: iso(0), actorId: "u_005", actorName: "Khoi Pham", text: "joined the project Framing on Quan 3 Roastery", icon: "user-plus" },
  { id: "a_03", at: iso(1), actorId: "u_010", actorName: "Trang Phan", text: "signed off on Milestone 2 for Hanoi Old Quarter Cafe", icon: "check-circle-2" },
  { id: "a_04", at: iso(1), actorId: "u_008", actorName: "Lan Hoang", text: "paused Thao Dien Brew Lab pending permit review", icon: "pause" },
  { id: "a_05", at: iso(2), actorId: "u_006", actorName: "Hai Bui", text: "invited as a contractor — pending email confirmation", icon: "user-plus" },
  { id: "a_06", at: iso(3), actorId: "u_002", actorName: "Hung Tran", text: "created a new version Quan 3 Roastery v3 design", icon: "pencil", href: "/projects/p_demo/design-management" },
  { id: "a_07", at: iso(4), actorId: "u_007", actorName: "Minh Do", text: "was suspended by Mai Nguyen", icon: "trash-2" },
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