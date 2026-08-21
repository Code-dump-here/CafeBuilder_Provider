// Admin API Types

// ─── Overview / Statistics ─────────────────────────────────────────────────────

export interface AccountStatistics {
  total: number;
  owners: number;
  providers: number;
  admins: number;
  active: number;
  inactive: number;
  banned: number;
  pending: number;
  emailVerified: number;
  newThisMonth: number;
  /** Index signature — every numeric field above is a status bucket that
   *  `StatusBreakdown` can render. Keeping it explicit makes
   *  `Record<string, number>` consumers (e.g. `admin-dashboard`) happy. */
  [status: string]: number;
}

export interface CountByStatus {
  [status: string]: number;
}

export interface StatusCounts {
  total: number;
  byStatus: CountByStatus;
}

export interface RevenueData {
  currency: string;
  total: number;
  thisMonth: number;
  paidTransactions: number;
}

export interface AdminOverview {
  accounts: AccountStatistics;
  projects: StatusCounts;
  posts: StatusCounts;
  applications: StatusCounts;
  engagements: StatusCounts;
  contracts: StatusCounts;
  activeSubscriptions: number;
  revenue: RevenueData;
}

// ─── Revenue ─────────────────────────────────────────────────────────────────

export interface RevenueByPurpose {
  purpose: "subscription" | "post_boost";
  amount: number;
  count: number;
}

export interface RevenuePeriodPoint {
  period: string;
  amount: number;
  count: number;
}

export interface RevenueReport {
  from: string;
  to: string;
  groupBy: "day" | "month";
  currency: string;
  totalRevenue: number;
  transactionCount: number;
  byPurpose: RevenueByPurpose[];
  series: RevenuePeriodPoint[];
}

export type TransactionStatus = "pending" | "paid" | "cancelled" | "failed";
export type TransactionPurpose = "subscription" | "post_boost";

export interface Transaction {
  id: string;
  accountId: string;
  purpose: TransactionPurpose;
  status: TransactionStatus;
  platform: "web" | "mobile";
  orderCode: number;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface TransactionListResponse {
  items: Transaction[];
  totalItems: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// ─── Account Management ────────────────────────────────────────────────────────

export type AccountRole = "owner" | "provider" | "admin";
export type AccountStatus = "active" | "inactive" | "banned" | "pending";

export interface Account {
  id: string;
  email: string;
  phone: string | null;
  role: AccountRole;
  status: AccountStatus;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // Role-specific data
  shopOwner?: {
    id: string;
    displayName: string;
    businessName: string | null;
  } | null;
  serviceProvider?: {
    id: string;
    displayName: string;
    providerType: string;
    capability: string;
    isVerified: boolean;
    avgRating: number | null;
  } | null;
}

export interface AccountListResponse {
  items: Account[];
  totalItems: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface UpdateAccountStatusPayload {
  status: AccountStatus;
}

// ─── API Parameters ───────────────────────────────────────────────────────────

export interface AccountListParams {
  pageNumber?: number;
  pageSize?: number;
  role?: AccountRole | null;
  status?: AccountStatus | null;
  search?: string | null;
  includeDeleted?: boolean;
}

export interface RevenueParams {
  from?: string | null;
  to?: string | null;
  groupBy?: "day" | "month";
}

export interface TransactionListParams {
  pageNumber?: number;
  pageSize?: number;
  status?: TransactionStatus | null;
  purpose?: TransactionPurpose | null;
  from?: string | null;
  to?: string | null;
}
