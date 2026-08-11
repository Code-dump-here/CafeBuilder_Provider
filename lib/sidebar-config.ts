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
  /**
   * Hide this item once the user's engagement on the project has ended
   * (Engagement status === "completed"). Defaults to `true` so the
   * "completed" sidebar shrinks to just `collaboration` items (overview
   * + messages); set to `false` on items that should remain available
   * after completion (e.g. messages, archived contracts). Owner-visible
   * items that we want to keep post-completion tag themselves with
   * `keepOnCompletion: true`.
   */
  keepOnCompletion?: boolean;
}

export interface NavSection {
  labelKey: string;
  items: NavItem[];
  /**
   * Visibility tag — drives the project-scoped membership filter in
   * `AppSidebar`. A section tagged with a category is rendered only when
   * the current user has an engagement on the active project whose
   * `contractType` covers that category.
   *
   *   - `undefined` (default): always visible. Use for project info
   *     (every project member needs it) and for global sections.
   *   - `"design"`: render only for users whose engagement contractType
   *     is `design` or `both`.
   *   - `"construction"`: render only for `construction` or `both`.
   *   - `"member"`: render only when the user has an active engagement
   *     on the current project (any contractType, status !== completed
   *     / terminated / declined) OR is the project owner. Drop-in
   *     shorthand for project-only sections that don't depend on
   *     capability.
   *
   * Stacked tags are OR-combined: a section with `["design", "member"]`
   * is visible to design-capable members OR any active member.
   */
  projectScope?:
    | "design"
    | "construction"
    | "member"
    | Array<"design" | "construction" | "member">;
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
  projectScope: "member",
  items: [
    {
      titleKey: "Sidebar.designer.overview",
      url: "",
      icon: LayoutDashboard,
      scope: "project",
      match: "exact",
      keepOnCompletion: true,
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
  // Design scope only. `DesignService` rejects a design on a 'construction'
  // engagement, so showing these to a constructor offered work the server
  // would refuse. A 'both' engagement still matches — see `filterSection`.
  projectScope: ["design"],
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
  projectScope: "member",
  items: [
    {
      titleKey: "Sidebar.designer.messages",
      url: "/messages",
      icon: MessageCircle,
      badge: 3,
      scope: "project",
      keepOnCompletion: true,
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
  // Construction scope only. `ConstructionItemService` rejects items on a
  // 'design' engagement, so a designer clicking Milestones could fill in a
  // phase and only then be refused by the server.
  projectScope: ["construction"],
  items: [
    {
      titleKey: "Sidebar.contractor.constructionOverview",
      url: "/construction-overview",
      icon: LayoutDashboard,
      scope: "project",
    },
    {
      titleKey: "Sidebar.contractor.milestones",
      url: "/milestones",
      icon: ClipboardCheck,
      scope: "project",
    },
  ],
};

// ─── Issues ──────────────────────────────────────────────────────────────────
//
// Its own section rather than part of the construction workspace, because
// issues aren't construction-only: `Issue.ConstructionItemId` is nullable and
// `IssueService` has no contract-type gate, so a design-only provider can
// raise one against their engagement. Folding it into the construction
// section would have hidden a feature that genuinely works for them.

const ISSUES_SECTION: NavSection = {
  labelKey: "Sidebar.contractor.issuesAndRFI",
  projectScope: ["design", "construction"],
  items: [
    {
      titleKey: "Sidebar.contractor.issuesAndRFI",
      url: "/issues",
      icon: AlertTriangle,
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
  projectScope: "member",
  items: [
    {
      titleKey: "Sidebar.shopOwner.overview",
      url: "",
      icon: LayoutDashboard,
      scope: "project",
      match: "exact",
      keepOnCompletion: true,
    },
    {
      titleKey: "Sidebar.shopOwner.messages",
      url: "/messages",
      icon: MessageSquare,
      scope: "project",
      keepOnCompletion: true,
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
      ISSUES_SECTION,
      DESIGNER_MESSAGES,
    ],
    projects: [],
    secondaryItems: [],
  },
  CONTRACTOR: {
    brand: { name: "Smart Cafe", labelKey: "Roles.contractor" },
    // Mirrors DESIGNER today: constructor-only providers see both the
    // design work and construction workspace. The capability-aware
    // behavior is handled inside each section via `projectScope`.
    sections: [
      DESIGNER_PROJECT_INFO,
      DESIGNER_DESIGN_WORK,
      CONSTRUCTION_WORK_SECTION,
      ISSUES_SECTION,
      DESIGNER_MESSAGES,
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

// ─── Project-scoped section filter ──────────────────────────────────────────
//
// `AppSidebar` calls `filterSectionsByProjectMembership` with the current
// user's project membership and the section list it just looked up. The
// helper hides sections whose `projectScope` requires a capability or
// membership the viewer doesn't have.
//
// The rules:
//   1. `projectScope` undefined → always visible.
//   2. `"design"` → visible when membership.contractType ∈ {design, both}.
//   3. `"construction"` → visible when contractType ∈ {construction, both}.
//   4. `"member"` → visible when `membership.isActive === true`
//      (i.e. the user owns the project, or has an engagement whose
//      status is not completed/terminated/declined/rejected).
//   5. When `projectScope` is an array, the section is visible if ANY
//      of its tags passes (OR semantics). Use this to let a section
//      accept either "design-capable" or "any member".
//
// On global pages (no `projectShopOwnerId`), pass `membership: null`
// and only sections without a `projectScope` will be visible — exactly
// what we want when the user hasn't picked a project yet.

export type ProjectMembership = {
  /** True when user is owner of the project, or has an engagement on it. */
  isMember: boolean;
  /**
   * True when the membership is "live" — owner of an open project, or a
   * provider whose engagement status is requested/accepted/active.
   * Drives the `member` gate (hides sections when engagement is over).
   */
  isActive: boolean;
  /**
   * True when the engagement has been marked completed. Distinct from
   * `!isActive` because "completed" keeps collaboration items visible
   * (overview + messages) while terminal-but-not-completed states
   * (rejected / terminated) collapse everything.
   */
  isCompleted: boolean;
  /** Engagement contractType when applicable, else null. */
  contractType: "design" | "construction" | "both" | null;
} | null;

export function filterSectionsByProjectMembership(
  sections: NavSection[],
  membership: ProjectMembership,
): NavSection[] {
  if (membership == null) {
    // No project picked yet — hide every project-scoped section.
    return sections.filter((s) => s.projectScope == null);
  }

  return sections
    .map((section) => filterSection(section, membership))
    .filter((section): section is NavSection => section != null);
}

/**
 * Apply the project-scope gates to a single section.
 *
 * Returns `null` when the section should be hidden entirely. Otherwise
 * returns a (possibly shrunken) copy of the section with non-collaborative
 * items stripped when the engagement is completed.
 */
function filterSection(
  section: NavSection,
  membership: NonNullable<ProjectMembership>,
): NavSection | null {
  const scopes = normalizeScopes(section.projectScope);
  if (scopes.length > 0) {
    // Engagement completed: the sidebar collapses to collaboration-only
    // (overview + messages). Every non-`member` project-scoped section
    // is dropped here so designers/constructors don't see their build
    // tools after the work is done.
    if (membership.isCompleted) {
      const hasMemberTag = scopes.includes("member");
      if (!hasMemberTag) return null;
    }

    const visibleByScope = scopes.some((scope) => {
      switch (scope) {
        case "design":
          return (
            membership.contractType === "design" ||
            membership.contractType === "both"
          );
        case "construction":
          return (
            membership.contractType === "construction" ||
            membership.contractType === "both"
          );
        case "member":
          return membership.isActive || membership.isCompleted;
        default: {
          const _exhaustive: never = scope;
          return _exhaustive;
        }
      }
    });
    if (!visibleByScope) return null;
  }

  // When the engagement is completed, keep only items explicitly tagged
  // `keepOnCompletion: true` (overview + messages). For an active or
  // pre-completed engagement we render every item as configured.
  const items = membership.isCompleted
    ? section.items.filter((item) => item.keepOnCompletion === true)
    : section.items;

  // If filtering empties the section out, drop it so we don't render
  // an empty group label.
  if (items.length === 0) return null;

  return { ...section, items };
}

function normalizeScopes(
  scope: NavSection["projectScope"],
): Array<"design" | "construction" | "member"> {
  if (scope == null) return [];
  return Array.isArray(scope) ? scope : [scope];
}

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
