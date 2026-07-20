"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

import type { NavItem, NavSection } from "@/lib/sidebar-config";

interface RoleSidebarNavProps {
  sections: NavSection[];
  /**
   * Required by `NavItem.scope === "project"`: the active project id
   * is appended after `/projects/`. Pass `null` if not in a project.
   */
  activeProjectId?: string | null;
}

/**
 * Renders a list of nav sections using the same `Sidebar*` primitives
 * the customer/contractor sidebars use.
 *
 * Each section renders as a collapsible group; the group is expanded
 * automatically when one of its items is the active route, so the
 * current item is always visible. Items respect `scope: "project"`
 * (linked as `/projects/{id}{url}`) vs `scope: "global"`.
 */
export function RoleSidebarNav({ sections, activeProjectId }: RoleSidebarNavProps) {
  return (
    <>
      {sections.map((section) => (
        <RoleSidebarNavSection
          key={section.labelKey}
          section={section}
          activeProjectId={activeProjectId}
        />
      ))}
    </>
  );
}

function RoleSidebarNavSection({
  section,
  activeProjectId,
}: {
  section: NavSection;
  activeProjectId?: string | null;
}) {
  const t = useTranslations();
  const pathname = usePathname();

  // Resolve the absolute href for every item so we can determine the
  // active state up-front.
  const items = section.items.map((item) => ({
    item,
    href: resolveHref(item, activeProjectId),
    active: isActive(pathname ?? "", item, activeProjectId),
  }));

  // Auto-open the group if it has the active item, otherwise default
  // open (most groups are only a couple of items tall).
  const initiallyOpen = items.some((x) => x.active);

  return (
    <Collapsible defaultOpen={initiallyOpen} className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            <span>{t(section.labelKey)}</span>
            <ChevronRight className="size-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" aria-hidden />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(({ item, href, active }) => (
                <SidebarMenuItem key={`${item.titleKey}-${href}`}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={t(item.titleKey)}
                  >
                    <Link href={href as never}>
                      <item.icon aria-hidden />
                      <span>{t(item.titleKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge != null ? (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

/**
 * Convert a `NavItem` to its absolute href, applying the project scope
 * when relevant.
 */
function resolveHref(item: NavItem, activeProjectId?: string | null): string {
  if (item.scope === "project" && activeProjectId) {
    return `/projects/${activeProjectId}${item.url}`;
  }
  return item.url;
}

/**
 * Decide whether `item` is the active one on the current pathname.
 * Honors `match: "exact"` for project roots.
 */
function isActive(
  pathname: string,
  item: NavItem,
  activeProjectId?: string | null
): boolean {
  const href = resolveHref(item, activeProjectId);
  if (!href) return false;
  if (item.match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Pull the active project id off `[locale]/projects/{id}/...` style
 * URLs. Returns `null` if the user is on a global route.
 *
 * Used by `RoleSidebarShell` so callers don't have to thread the id
 * through manually.
 */
export function useActiveProjectId(): string | null {
  const params = useParams();
  const id = (params?.id as string | undefined) ?? null;
  return id || null;
}