"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  AppWindow,
  Bell,
  CreditCard,
  FolderKanban,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { RoleSidebarNav } from "@/components/sidebar/role-sidebar-nav";
import type { NavSection } from "@/lib/sidebar-config";

interface AdminSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

/**
 * Sidebar for `/admin/*`. Reuses the same `Sidebar*` UI primitives as
 * the contractor / customer sidebars so hover behaviour, the trigger
 * button, and the inset border treatment are identical.
 *
 * Admin is the only role whose sidebar is purely global (no
 * project-scoped section) — admin pages don't sit under
 * `/projects/{id}` so `activeProjectId` is always null.
 */
export function AdminSidebar({ user, ...props }: AdminSidebarProps) {
  const params = useParams();
  const locale = (params?.locale as string | undefined) ?? "en";

  const resolvedUser = user ?? {
    name: locale === "vi" ? "Quản trị viên" : "Admin",
    email: "admin@aicoffee.io",
    avatar: undefined,
  };

  const sections: NavSection[] = React.useMemo(() => ADMIN_NAV, []);

  return (
    <TooltipProvider>
      <Sidebar variant="inset" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/admin">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <AppWindow className="size-4" aria-hidden />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">AICoffee Admin</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {locale === "vi" ? "Bảng điều khiển nội bộ" : "Internal console"}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <RoleSidebarNav sections={sections} activeProjectId={null} />
        </SidebarContent>

        <SidebarFooter>
          <AdminSidebarActions />
          <AdminUserChip user={resolvedUser} />
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}

const ADMIN_NAV: NavSection[] = [
  {
    labelKey: "Sidebar.admin.operations",
    items: [
      {
        titleKey: "Sidebar.admin.dashboard",
        url: "/admin",
        icon: ShieldCheck,
        match: "exact",
      },
      {
        titleKey: "Sidebar.admin.activity",
        url: "/admin/activity",
        icon: Activity,
      },
    ],
  },
  {
    labelKey: "Sidebar.admin.management",
    items: [
      {
        titleKey: "Sidebar.admin.accounts",
        url: "/admin/accounts",
        icon: Users,
      },
      {
        titleKey: "Sidebar.admin.projects",
        url: "/admin/projects",
        icon: FolderKanban,
      },
      {
        titleKey: "Sidebar.admin.revenue",
        url: "/admin/revenue",
        icon: Wallet,
      },
    ],
  },
  {
    labelKey: "Sidebar.admin.platform",
    items: [
      {
        titleKey: "Sidebar.admin.billing",
        url: "/admin/billing",
        icon: CreditCard,
      },
      {
        titleKey: "Sidebar.admin.settings",
        url: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

function AdminSidebarActions() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Support">
          <Link href="/admin/support">
            <LifeBuoy className="size-4" aria-hidden /> Support
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Notifications">
          <Link href="/admin/notifications">
            <Bell className="size-4" aria-hidden /> Notifications
            <span className="ml-auto inline-flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              5
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function AdminUserChip({
  user,
}: {
  user: { name: string; email: string; avatar?: string };
}) {
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md border border-border/40 bg-card/50 px-2 py-1.5 text-left text-sm hover:bg-card"
        >
          <Avatar className="size-8">
            {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium">{user.name}</div>
            <div className="truncate text-[10px] text-muted-foreground">{user.email}</div>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Admin actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>View audit log</DropdownMenuItem>
        <DropdownMenuItem>Switch role…</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}