"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  type LucideIcon,
  Command,
  type Sidebar as SidebarIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

import { RoleSidebarNav, useActiveProjectId } from "@/components/sidebar/role-sidebar-nav";
import { NavSecondary } from "@/components/sidebar/nav-secondary";
import type { NavItem } from "@/lib/sidebar-config";
import { NavUser } from "@/components/sidebar/nav-user";

import type { NavSection, SidebarBrand } from "@/lib/sidebar-config";

interface RoleSidebarShellProps {
  brand: SidebarBrand;
  /** Optional override; defaults to the URL-detected value. */
  activeProjectId?: string | null;
  /**
   * Rendered in the sidebar content. Pass one or more nav sections
   * here. The shell wires up `RoleSidebarNav` so callers don't have
   * to know how scopes resolve.
   */
  sections: NavSection[];
  /**
   * Secondary actions pinned to the bottom of the sidebar (Settings,
   * Help, Sign out, etc.).
   */
  secondaryItems?: NavItem[];
  /** User shown in the sidebar footer. */
  user: {
    name: string;
    nameVi?: string;
    email: string;
    avatar?: string;
  };
  /**
   * Top-of-page breadcrumbs + actions row. Rendered into `<SidebarInset>`'s
   * header so the sidebar trigger stays glued to it.
   */
  header?: React.ReactNode;
  /** Locale switcher / theme toggle / etc., anchored to the right of the inset header. */
  headerActions?: React.ReactNode;
  /** Children of the page body — wrapped in `<SidebarInset>`. */
  children: React.ReactNode;
  /**
   * Optional "back to main app" link rendered in the header (used by
   * admin to surface "Return to client view").
   */
  returnHref?: { href: string; icon?: LucideIcon; labelKey: string };
}

/**
 * Reusable shell that renders the standard "sidebar + topbar with
 * breadcrumb slot + page content" layout used by every authenticated
 * area of the app.
 *
 * Customer / contractor / designer / admin areas all share this shell
 * — only `brand`, `sections`, and chrome differ. Keeping the chrome
 * in one place makes sure hover states, ripple behaviour, the
 * trigger button, and the inset border-treatments all stay
 * consistent.
 */
export function RoleSidebarShell({
  brand,
  sections,
  secondaryItems = [],
  user,
  header,
  headerActions,
  children,
  activeProjectId: activeProjectIdOverride,
  returnHref,
}: RoleSidebarShellProps) {
  const detectedProjectId = useActiveProjectId();
  const activeProjectId = activeProjectIdOverride ?? detectedProjectId;

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <BrandHeader brand={brand} />
        </SidebarHeader>

        <SidebarContent>
          <RoleSidebarNav sections={sections} activeProjectId={activeProjectId} />
          {secondaryItems.length > 0 ? (
            <NavSecondary items={secondaryItems} className="mt-auto" />
          ) : null}
        </SidebarContent>

        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/50 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            {header}
          </div>
          <div className="flex items-center gap-2">
            {returnHref ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={returnHref.href as never}>
                  {returnHref.icon ? <returnHref.icon aria-hidden /> : <ArrowLeft aria-hidden />}
                  {returnHref.labelKey}
                </Link>
              </Button>
            ) : null}
            {headerActions}
          </div>
        </header>
        <div className="p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

interface BrandHeaderProps {
  brand: SidebarBrand;
}

function BrandHeader({ brand }: BrandHeaderProps) {
  const t = useTranslations();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link href="/workspace">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <BrandIconPlaceholder className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{brand.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {t(brand.labelKey)}
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/**
 * Tiny shim so BrandHeader doesn't need to know which Lucide icon the
 * callers want — defaults to `Command` (the existing sidebar's choice)
 * but can be overridden by setting a brand icon in the config later.
 */
function BrandIconPlaceholder({ className }: { className?: string }) {
  return <Command className={className} aria-hidden />;
}

/**
 * Provider-only wrapper — handy when callers already have their own
 * Inset/Header and don't want the layout around the inner content.
 * Not used by `RoleSidebarShell` itself.
 */
export function RoleSidebarShellProviders({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>;
}

// re-export the underlying icon resolver so callers can read it back
export type { SidebarIcon };