"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useTranslations } from "next-intl";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useCurrentUser } from "@/features/auth/user-context";

export const NavMenu = (props: ComponentProps<typeof NavigationMenu>) => {
  const t = useTranslations("Navbar.nav");
  const { isAuthenticated } = useCurrentUser();

  // Public items — visible to everyone (signed in or not).
  const publicItems = [
    { label: t("features"), href: "/#features" },
    { label: t("about"), href: "/#about" },
    { label: t("pricing"), href: "/pricing" },
    { label: t("projects"), href: "/marketplace" },
  ] as const;

  // Authenticated-only item — shows the user's own project-workings.
  // Rendered as a sibling list item so the highlight state matches the
  // other nav items.
  const authItems = isAuthenticated
    ? [{ label: t("myProjects"), href: "/my-projects" }]
    : [];

  return (
    <NavigationMenu {...props}>
      <NavigationMenuList className="data-[orientation=vertical]:-ms-2 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-start data-[orientation=vertical]:justify-start">
        {[...publicItems, ...authItems].map((item) => (
          <NavigationMenuItem key={item.href}>
            <NavigationMenuLink
              asChild
              className={navigationMenuTriggerStyle()}
            >
              <Link href={item.href} className="text-base">
                {item.label}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
};