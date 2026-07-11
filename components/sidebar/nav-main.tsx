"use client";

import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Collapsible } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import type { NavItem, NavSection } from "@/lib/sidebar-config";

interface NavMainProps {
  sections: NavSection[];
}

function resolveItemUrl(item: NavItem, projectId: string | undefined): string {
  if (item.scope === "project") {
    if (!projectId) return item.url;
    return `/projects/${projectId}${item.url}`;
  }
  return item.url;
}

export function NavMain({ sections }: NavMainProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const projectId = params?.id;

  return (
    <>
      {sections.map((section) => (
        <SidebarGroup key={section.labelKey}>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
            {t(section.labelKey)}
          </SidebarGroupLabel>
          <SidebarMenu>
            {section.items.map((item) => {
              const href = resolveItemUrl(item, projectId);
              const isActive =
                item.match === "exact"
                  ? pathname === href
                  : pathname === href || pathname.startsWith(href + "/");

              return (
                <Collapsible key={item.titleKey} asChild defaultOpen={isActive}>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip={t(item.titleKey)}
                      isActive={isActive}
                    >
                      <a href={href}>
                        <item.icon className="size-4" />
                        <span className="flex-1">{t(item.titleKey)}</span>
                        {item.badge != null && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-4 min-w-4 items-center justify-center px-1 text-[9px]"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
