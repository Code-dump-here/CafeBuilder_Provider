import {
  MessageSquare,
  FileText,
  DollarSign,
  TrendingUp,
  ClipboardCheck,
  FolderOpen,
  Users,
  LayoutDashboard,
  Receipt,
  Building2,
  BarChart3,
  AlertTriangle,
  FileCheck,
  Construction,
  Layers,
  Camera,
  Pencil,
  RefreshCw,
  MessageCircle,
  BarChart,
  Wrench,
  Map,
  Ruler,
  CheckCircle,
  Package,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

export type UserRole = "SHOP_OWNER" | "DESIGNER" | "CONTRACTOR" | "ADMIN";

export interface NavItem {
  titleKey: string;
  /**
   * URL relative to the routing root.
   *
   * - For `scope: "global"` (default): absolute path, e.g. `"/workspace"`.
   * - For `scope: "project"`: suffix appended to `/projects/{id}`,
   *   e.g. `""` → `/projects/{id}`, `"/briefs"` → `/projects/{id}/briefs`.
   */
  url: string;
  icon: LucideIcon;
  badge?: string | number;
  /**
   * Where this item lives in the URL space.
   *
   * - `"global"` (default): URL is used as-is.
   * - `"project"`: URL is appended under the current `/projects/{id}`
   *   segment so that sidebar links stay inside the active project.
   */
  scope?: "global" | "project";
  /**
   * How the item is considered "active" against the current pathname.
   *
   * - `"prefix"` (default): active when `pathname === href` or starts with `href + "/"`.
   * - `"exact"`: active only when `pathname === href`. Use for project roots
   *   (e.g. `/projects/{id}`) so child routes don't double-highlight.
   */
  match?: "exact" | "prefix";
}

export interface NavSection {
  labelKey: string;
  items: NavItem[];
}

export interface SidebarProject {
  nameKey: string;
  url: string;
  icon: LucideIcon;
}

export interface SidebarBrand {
  name: string;
  labelKey: string;
}

export interface RoleSidebarConfig {
  brand: SidebarBrand;
  sections: NavSection[];
  projects: SidebarProject[];
  secondaryItems: NavItem[];
}

// ─── Designer Section ─────────────────────────────────────────────────────────

const DESIGNER_PROJECT_INFO: NavSection = {
  labelKey: "Sidebar.designer.projectInfo",
  items: [
    {
      titleKey: "Sidebar.designer.overview",
      url: "",
      icon: LayoutDashboard,
      scope: "project",
      match: "exact",
    },
    {
      titleKey: "Sidebar.designer.survey",
      url: "/survey",
      icon: Map,
      scope: "project",
    },
    {
      titleKey: "Sidebar.designer.contracts",
      url: "/contracts",
      icon: FileCheck,
      scope: "project",
    },
  ],
};

// (project-segment title-key registry lives at the bottom of the file
//  so it can read the assembled ROLE_SIDEBAR_CONFIG — see end of file.)

const DESIGNER_DESIGN_WORK: NavSection = {
  labelKey: "Sidebar.designer.designWork",
  items: [
    {
      titleKey: "Sidebar.designer.designManagement",
      url: "/design-management",
      icon: Pencil,
      scope: "project",
    },
    {
      titleKey: "Sidebar.designer.technicalDrawings",
      url: "/technical-drawings",
      icon: Ruler,
      scope: "project",
    },
  ],
};

const DESIGNER_MESSAGES: NavSection = {
  labelKey: "Sidebar.designer.messages",
  items: [
    {
      titleKey: "Sidebar.designer.messages",
      url: "/messages",
      icon: MessageCircle,
      badge: 3,
      scope: "project",
    },
    { titleKey: "Sidebar.designer.progress", url: "/progress", icon: BarChart },
    {
      titleKey: "Sidebar.designer.constructionSupport",
      url: "/workspace/construction-support",
      icon: Wrench,
    },
  ],
};

// ─── Construction Work Section (project-scoped) ──────────────────────────────
//
// Inlined under the project scope so designers, owners, and contractors
// share the same sidebar while in `/projects/{id}/*`. Sits between
// `DESIGNER_DESIGN_WORK` and `DESIGNER_MESSAGES` so the order reads
// "project facts → design → build → communicate".

const CONSTRUCTION_WORK_SECTION: NavSection = {
  labelKey: "Sidebar.contractor.workspace",
  items: [
    {
      titleKey: "Sidebar.contractor.constructionOverview",
      url: "/construction-overview",
      icon: LayoutDashboard,
      scope: "project",
    },
    {
      titleKey: "Sidebar.contractor.constructionLog",
      url: "/construction-log",
      icon: Construction,
      scope: "project",
    },
    {
      titleKey: "Sidebar.contractor.milestones",
      url: "/milestones",
      icon: ClipboardCheck,
      scope: "project",
    },
    {
      titleKey: "Sidebar.contractor.dailyReports",
      url: "/daily-reports",
      icon: FileCheck,
      scope: "project",
    },
    {
      titleKey: "Sidebar.contractor.issuesAndRFI",
      url: "/issues",
      icon: AlertTriangle,
      badge: 3,
      scope: "project",
    },
    {
      titleKey: "Sidebar.contractor.materialsTracking",
      url: "/materials",
      icon: Package,
      scope: "project",
    },
    {
      titleKey: "Sidebar.contractor.handover",
      url: "/handover",
      icon: ClipboardCheck,
      scope: "project",
    },
  ],
};

// ─── Contractor Section ───────────────────────────────────────────────────────
//
// Standalone contractor config kept for completeness — currently unused
// because role-based sidebar switching is paused, but the data is here
// when it's wired back in.

const CONTRACTOR_SECTION: NavSection = {
  labelKey: "Sidebar.contractor.workspace",
  items: [
    {
      titleKey: "Sidebar.contractor.constructionLog",
      url: "/construction-log",
      icon: Construction,
      scope: "project",
    },
    {
      titleKey: "Sidebar.contractor.dailyReports",
      url: "/daily-reports",
      icon: FileCheck,
      scope: "project",
    },
    {
      titleKey: "Sidebar.contractor.issuesAndRFI",
      url: "/issues",
      icon: AlertTriangle,
      badge: 3,
      scope: "project",
    },
    {
      titleKey: "Sidebar.contractor.materialsTracking",
      url: "/materials",
      icon: Package,
      scope: "project",
    },
    {
      titleKey: "Sidebar.contractor.handover",
      url: "/handover",
      icon: ClipboardCheck,
      scope: "project",
    },
  ],
};

// ─── Shop Owner Section ───────────────────────────────────────────────────────

const OWNER_WORKSPACE_SECTION: NavSection = {
  labelKey: "Sidebar.shopOwner.workspace",
  items: [
    {
      titleKey: "Sidebar.shopOwner.overview",
      url: "/workspace",
      icon: LayoutDashboard,
    },
  ],
};

const OWNER_PROJECT_SECTION: NavSection = {
  labelKey: "Sidebar.shopOwner.projectManagement",
  items: [
    {
      titleKey: "Sidebar.shopOwner.overview",
      url: "",
      icon: LayoutDashboard,
      scope: "project",
      match: "exact",
    },
    {
      titleKey: "Sidebar.shopOwner.messages",
      url: "/messages",
      icon: MessageSquare,
      scope: "project",
    },
    {
      titleKey: "Sidebar.shopOwner.contracts",
      url: "/contracts",
      icon: FileCheck,
      scope: "project",
    },
    {
      titleKey: "Sidebar.shopOwner.documents",
      url: "/documents",
      icon: FileText,
      scope: "project",
    },
    {
      titleKey: "Sidebar.shopOwner.quotations",
      url: "/quotation-selection",
      icon: DollarSign,
      badge: 2,
    },
    {
      titleKey: "Sidebar.shopOwner.approvals",
      url: "/progress",
      icon: CheckCircle,
      badge: 3,
    },
    {
      titleKey: "Sidebar.shopOwner.progress",
      url: "/progress",
      icon: TrendingUp,
    },
    {
      titleKey: "Sidebar.shopOwner.handover",
      url: "/handover",
      icon: ClipboardCheck,
    },
  ],
};

const OWNER_CONTRACTS_SECTION: NavSection = {
  labelKey: "Sidebar.shopOwner.contracts",
  items: [
    {
      titleKey: "Sidebar.shopOwner.createContract",
      url: "/contract-create",
      icon: FileCheck,
    },
    {
      titleKey: "Sidebar.shopOwner.contractHistory",
      url: "/workspace/contracts",
      icon: FileText,
    },
  ],
};

// ─── Admin Section ────────────────────────────────────────────────────────────
//
// Admin is global-only (no project-scoped items). These keys feed the
// legacy nav in the customer/contractor sidebar fallback as well as the
// AdminSidebar's own nav registry, which lives in
// `components/admin/admin-sidebar.tsx`.

const ADMIN_OVERVIEW_SECTION: NavSection = {
  labelKey: "Sidebar.admin.operations",
  items: [
    {
      titleKey: "Sidebar.admin.legacyDashboard",
      url: "/admin",
      icon: LayoutDashboard,
      match: "exact",
    },
    {
      titleKey: "Sidebar.admin.activity",
      url: "/admin/activity",
      icon: BarChart3,
    },
  ],
};

const ADMIN_MANAGEMENT_SECTION: NavSection = {
  labelKey: "Sidebar.admin.management",
  items: [
    { titleKey: "Sidebar.admin.legacyUsers", url: "/admin/accounts", icon: Users },
    { titleKey: "Sidebar.admin.projects", url: "/admin/projects", icon: FolderOpen },
  ],
};

const ADMIN_PLATFORM_SECTION: NavSection = {
  labelKey: "Sidebar.admin.platform",
  items: [
    {
      titleKey: "Sidebar.admin.legacyDisputes",
      url: "/admin/disputes",
      icon: AlertTriangle,
      badge: 2,
    },
    {
      titleKey: "Sidebar.admin.legacyAnalytics",
      url: "/admin/analytics",
      icon: BarChart3,
    },
  ],
};

// ─── Role Configurations ─────────────────────────────────────────────────────

export const ROLE_SIDEBAR_CONFIG: Record<UserRole, RoleSidebarConfig> = {
  SHOP_OWNER: {
    brand: { name: "Smart Cafe", labelKey: "Roles.shopOwner" },
    sections: [
      OWNER_WORKSPACE_SECTION,
      OWNER_PROJECT_SECTION,
      OWNER_CONTRACTS_SECTION,
    ],
    projects: [],
    secondaryItems: [],
  },
  DESIGNER: {
    brand: { name: "Smart Cafe", labelKey: "Roles.designer" },
    sections: [
      DESIGNER_PROJECT_INFO,
      DESIGNER_DESIGN_WORK,
      CONSTRUCTION_WORK_SECTION,
      DESIGNER_MESSAGES,
    ],
    projects: [],
    secondaryItems: [],
  },
  CONTRACTOR: {
    brand: { name: "Smart Cafe", labelKey: "Roles.contractor" },
    sections: [CONTRACTOR_SECTION],
    projects: [],
    secondaryItems: [],
  },
  ADMIN: {
    brand: { name: "Smart Cafe", labelKey: "Roles.admin" },
    sections: [
      ADMIN_OVERVIEW_SECTION,
      ADMIN_MANAGEMENT_SECTION,
      ADMIN_PLATFORM_SECTION,
    ],
    projects: [],
    secondaryItems: [],
  },
};

// ─── Project-segment title key registry ──────────────────────────────────────
//
// Resolves a URL suffix inside `/projects/{id}/*` to the i18n key used
// by both the sidebar and the breadcrumb. Built from every
// `scope: "project"` `<NavItem>` across `ROLE_SIDEBAR_CONFIG`, so adding
// a new project-sub-page only requires dropping an item into a section
// — the breadcrumb picks the title up automatically.
//
// Lives at the bottom of the file because it reads the assembled
// `ROLE_SIDEBAR_CONFIG` constant.
function buildProjectSegmentTitleKey(): Record<string, string> {
  const acc: Record<string, string> = {};
  for (const role of Object.values(ROLE_SIDEBAR_CONFIG)) {
    for (const section of role.sections) {
      for (const item of section.items) {
        if (item.scope !== "project") continue;
        acc[item.url] = item.titleKey;
      }
    }
  }
  return acc;
}

export const PROJECT_SEGMENT_TITLE_KEY: Record<string, string> =
  buildProjectSegmentTitleKey();
