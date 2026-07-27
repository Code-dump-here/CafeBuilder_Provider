"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AppWindow,
  Bell,
  ChevronsUpDown,
  CreditCard,
  Keyboard,
  Languages,
  LifeBuoy,
  LogOut,
  Moon,
  Send,
  Settings,
  Sun,
  UserPlus,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

import { RoleSidebarNav, useActiveProjectId } from "@/components/sidebar/role-sidebar-nav";
import {
  ROLE_SIDEBAR_CONFIG,
  filterSectionsByProjectMembership,
  type UserRole,
} from "@/lib/sidebar-config";
import { useCurrentUser } from "@/lib/auth/user-context";
import { useActiveProjectMembership } from "@/hooks/use-active-project-membership";
import { useUnreadCountQuery } from "@/lib/notifications/hooks";

import { NavProjects } from "@/components/sidebar/nav-projects";
import { NavUser } from "@/components/sidebar/nav-user";

// ─── Role Mapping ─────────────────────────────────────────────────────────────

/**
 * Maps API role format to sidebar config format.
 * API returns: "owner", "provider", "admin"
 * Sidebar config uses: "SHOP_OWNER", "DESIGNER", "CONTRACTOR", "ADMIN"
 */
function mapRoleToConfigRole(apiRole: string): UserRole {
  switch (apiRole) {
    case "owner":
      return "SHOP_OWNER";
    case "provider":
      // For provider, check capability to determine DESIGNER vs CONTRACTOR
      // Default to DESIGNER if we can't determine
      return "DESIGNER";
    case "admin":
      return "ADMIN";
    default:
      return "SHOP_OWNER";
  }
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  role?: UserRole;
  user?: {
    name: string;
    nameVi?: string;
    email: string;
    avatar?: string;
  };
  /** Overrides locale from params when provided */
  locale?: string;
}

/**
 * Project-scoped sidebar. Renders the role-specific nav sections for
 * the active project on `/projects/{id}/*`. The chrome (sidebar
 * container, header, footer, user chip) is the same shell admin uses —
 * only the nav + project list differ.
 */
export function AppSidebar({
  locale: localeOverride,
  ...props
}: Omit<AppSidebarProps, "role" | "user">) {
  const params = useParams();
  const locale = localeOverride ?? (params?.locale as string | undefined);
  const t = useTranslations();
  const { account, isLoading } = useCurrentUser();
  const { count: unreadCount } = useUnreadCountQuery();

  const role: UserRole = (account?.role ?? "owner") as UserRole;
  // Map API role format to sidebar config format
  const mappedRole = mapRoleToConfigRole(role);
  const config = ROLE_SIDEBAR_CONFIG[mappedRole];
  const activeProjectId = useActiveProjectId();
  const { membership } = useActiveProjectMembership(activeProjectId);

  // Project-scoped sections are filtered through `membership` so users
  // who aren't part of the project — or whose engagement is over — see
  // an empty project nav (the footer stays). Capability gating on
  // `design` vs `construction` vs `both` lives inside the helper.
  const visibleSections = React.useMemo(
    () => filterSectionsByProjectMembership(config.sections, membership),
    [config.sections, membership],
  );

  // Build user object from account data
  const resolvedUser = React.useMemo(() => {
    if (!account) {
      return {
        name: locale === "vi" ? "Người dùng Smart Cafe" : "Smart Cafe User",
        email: "user@smartcafe.vn",
        avatar: undefined,
      };
    }

    // Get display name based on role
    let name = account.email;
    if (account.role === "provider" && account.serviceProvider) {
      name = account.serviceProvider.displayName;
    } else if (account.role === "owner" && account.shopOwner) {
      name = account.shopOwner.fullName || account.email;
    }

    return {
      name,
      email: account.email,
      avatar: undefined,
    };
  }, [account, locale]);

  const secondaryItems = [
    { title: t("Sidebar.common.shortcuts"), url: "/shortcuts", icon: Keyboard },
    {
      title: t("Sidebar.common.notifications"),
      url: "/notifications",
      icon: Bell,
      // Live unread count — sidebar polls via the same
      // unread-count query that powers the navbar bell so the two
      // stay in sync without an extra request.
      badge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined,
    },
    { title: t("Sidebar.common.settings"), url: "/settings", icon: Settings },
  ];

  return (
    <TooltipProvider>
      <Sidebar variant="inset" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/workspace">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <AppWindow className="size-4" aria-hidden />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{config.brand.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {t(config.brand.labelKey)}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <RoleSidebarNav sections={visibleSections} activeProjectId={activeProjectId} />
          {config.projects.length > 0 ? (
            <NavProjects projects={config.projects} />
          ) : null}
        </SidebarContent>

        <SidebarFooter>
          <SecondaryMenu items={secondaryItems} />
          <NavUser user={resolvedUser} />
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}

/**
 * Lightweight replacement for the old `NavSecondary` that renders an
 * inline compact menu (no `SidebarMenu` wrapper) so the user chip can
 * sit flush beneath it in the footer.
 */
function SecondaryMenu({
  items,
}: {
  items: { title: string; url: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; badge?: number | string }[];
}) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild tooltip={item.title}>
            <Link href={item.url as never}>
              <item.icon className="size-4" aria-hidden />
              <span>{item.title}</span>
              {item.badge != null ? (
                <span className="ml-auto inline-flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

// re-exported because the delete path could be removing types above.
// (kept here intentionally minimal)
