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
  StickyNote,
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
  url: string;
  icon: LucideIcon;
  badge?: string | number;
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
      url: "/workspace/overview",
      icon: LayoutDashboard,
    },
    {
      titleKey: "Sidebar.designer.brief",
      url: "/workspace/brief",
      icon: StickyNote,
    },
    {
      titleKey: "Sidebar.designer.survey",
      url: "/workspace/survey",
      icon: Map,
    },
  ],
};

const DESIGNER_DESIGN_WORK: NavSection = {
  labelKey: "Sidebar.designer.designWork",
  items: [
    {
      titleKey: "Sidebar.designer.concept",
      url: "/workspace/concept",
      icon: Pencil,
    },
    {
      titleKey: "Sidebar.designer.layout2d",
      url: "/workspace/layout-2d",
      icon: Layers,
    },
    {
      titleKey: "Sidebar.designer.3dDesign",
      url: "/workspace/3d-design",
      icon: Camera,
    },
    {
      titleKey: "Sidebar.designer.technicalDrawings",
      url: "/workspace/technical-drawings",
      icon: Ruler,
    },
    {
      titleKey: "Sidebar.designer.revisions",
      url: "/workspace/revisions",
      icon: RefreshCw,
      badge: 2,
    },
  ],
};

const DESIGNER_COLLABORATION: NavSection = {
  labelKey: "Sidebar.designer.collaboration",
  items: [
    {
      titleKey: "Sidebar.designer.messages",
      url: "/collaboration",
      icon: MessageCircle,
      badge: 3,
    },
    { titleKey: "Sidebar.designer.progress", url: "/progress", icon: BarChart },
    {
      titleKey: "Sidebar.designer.constructionSupport",
      url: "/workspace/construction-support",
      icon: Wrench,
    },
  ],
};

// ─── Contractor Section ───────────────────────────────────────────────────────

const CONTRACTOR_WORKSPACE_SECTION: NavSection = {
  labelKey: "Sidebar.contractor.workspace",
  items: [
    {
      titleKey: "Sidebar.contractor.overview",
      url: "/workspace",
      icon: LayoutDashboard,
    },
    {
      titleKey: "Sidebar.contractor.constructionLog",
      url: "/workspace/construction-log",
      icon: Construction,
    },
    {
      titleKey: "Sidebar.contractor.dailyReports",
      url: "/workspace/daily-reports",
      icon: FileCheck,
    },
    {
      titleKey: "Sidebar.contractor.issuesAndRFI",
      url: "/workspace/issues",
      icon: AlertTriangle,
      badge: 3,
    },
  ],
};

const CONTRACTOR_PROJECTS_SECTION: NavSection = {
  labelKey: "Sidebar.contractor.myProjects",
  items: [
    {
      titleKey: "Sidebar.contractor.quotations",
      url: "/quotation-selection",
      icon: Receipt,
    },
    {
      titleKey: "Sidebar.contractor.activeProjects",
      url: "/workspace/active-projects",
      icon: Building2,
    },
    {
      titleKey: "Sidebar.contractor.completedProjects",
      url: "/workspace/completed-projects",
      icon: CheckCircle,
    },
  ],
};

const CONTRACTOR_MATERIALS_SECTION: NavSection = {
  labelKey: "Sidebar.contractor.materialsAndHandover",
  items: [
    {
      titleKey: "Sidebar.contractor.materialsTracking",
      url: "/workspace/materials",
      icon: Package,
    },
    {
      titleKey: "Sidebar.contractor.handover",
      url: "/handover",
      icon: ClipboardCheck,
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
    {
      titleKey: "Sidebar.shopOwner.discussion",
      url: "/collaboration",
      icon: MessageSquare,
    },
  ],
};

const OWNER_PROJECT_SECTION: NavSection = {
  labelKey: "Sidebar.shopOwner.projectManagement",
  items: [
    {
      titleKey: "Sidebar.shopOwner.documents",
      url: "/documents",
      icon: FileText,
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

const ADMIN_OVERVIEW_SECTION: NavSection = {
  labelKey: "Sidebar.admin.overview",
  items: [
    {
      titleKey: "Sidebar.admin.dashboard",
      url: "/admin",
      icon: LayoutDashboard,
    },
    {
      titleKey: "Sidebar.admin.systemAlerts",
      url: "/admin/alerts",
      icon: AlertTriangle,
      badge: 2,
    },
  ],
};

const ADMIN_MANAGEMENT_SECTION: NavSection = {
  labelKey: "Sidebar.admin.management",
  items: [
    { titleKey: "Sidebar.admin.users", url: "/admin/users", icon: Users },
    {
      titleKey: "Sidebar.admin.providers",
      url: "/admin/providers",
      icon: Building2,
    },
    {
      titleKey: "Sidebar.admin.projects",
      url: "/admin/projects",
      icon: FolderOpen,
    },
  ],
};

const ADMIN_PLATFORM_SECTION: NavSection = {
  labelKey: "Sidebar.admin.platform",
  items: [
    {
      titleKey: "Sidebar.admin.disputes",
      url: "/admin/disputes",
      icon: AlertTriangle,
      badge: 2,
    },
    {
      titleKey: "Sidebar.admin.analytics",
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
      DESIGNER_COLLABORATION,
    ],
    projects: [],
    secondaryItems: [],
  },
  CONTRACTOR: {
    brand: { name: "Smart Cafe", labelKey: "Roles.contractor" },
    sections: [
      CONTRACTOR_WORKSPACE_SECTION,
      CONTRACTOR_PROJECTS_SECTION,
      CONTRACTOR_MATERIALS_SECTION,
    ],
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
