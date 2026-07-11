"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Command } from "lucide-react";

import { NavMain } from "./nav-main";
import { NavProjects } from "./nav-projects";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
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
import { ROLE_SIDEBAR_CONFIG, type UserRole } from "@/lib/sidebar-config";
import Link from "next/link";

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

export function AppSidebar({
  role = "SHOP_OWNER",
  user,
  locale: localeOverride,
  ...props
}: AppSidebarProps) {
  const params = useParams();
  const locale = localeOverride ?? (params?.locale as string | undefined);
  const t = useTranslations();

  const config = ROLE_SIDEBAR_CONFIG[role];

  const resolvedUser = user ?? {
    name: locale === "vi" ? "Người dùng Smart Cafe" : "Smart Cafe User",
    email: "user@smartcafe.vn",
    avatar: undefined,
  };

  return (
    <TooltipProvider>
      <Sidebar variant="inset" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/workspace">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {config.brand.name}
                    </span>
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
          <NavMain sections={config.sections} />
          {config.projects.length > 0 && (
            <NavProjects projects={config.projects} />
          )}
          {config.secondaryItems.length > 0 && (
            <NavSecondary items={config.secondaryItems} className="mt-auto" />
          )}
        </SidebarContent>

        <SidebarFooter>
          <NavUser user={resolvedUser} />
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
