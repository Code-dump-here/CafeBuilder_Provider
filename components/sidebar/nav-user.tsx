"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
  Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { useLogoutMutation } from "@/features/auth/hooks";
import { Link } from "@/i18n/navigation";

/**
 * User footer pinned to the bottom of the sidebar. Click the avatar to
 * open the account menu — the "Log out" item calls `useLogoutMutation`,
 * fires a toast, and routes back to the marketing/landing page.
 */
export function NavUser({
  user,
}: {
  user: {
    name: string;
    nameVi?: string;
    email: string;
    avatar?: string;
  };
}) {
  const t = useTranslations("Sidebar.navUser");

  // The avatar fallback was the literal "CN" from the shadcn demo, so every
  // signed-in user saw the same two letters on all 15 workspace routes.
  // `app-sidebar` hardcodes `avatar: undefined` (the account API has no
  // avatar field yet), which means this fallback is what ALWAYS renders --
  // it is the whole avatar, not a fallback. Split on whitespace and on the
  // punctuation found in emails so it degrades sensibly when the display
  // name is missing entirely.
  const initials = React.useMemo(() => {
    const source = user.name?.trim() || user.email || "";
    return (
      source
        .split(/[s@._-]+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?"
    );
  }, [user.name, user.email]);
  const { isMobile } = useSidebar();
  const logoutMutation = useLogoutMutation();

  const handleSignOut = React.useCallback(() => {
    // Cache flush + redirect to "/" both happen inside useLogoutMutation
    // itself now, so every consumer gets them regardless of what it passes
    // here.
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("signOutSuccess"));
      },
      onError: () => {
        toast.error(t("signOutError"));
      },
    });
  }, [logoutMutation, t]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/*
              These four items shipped from the shadcn demo with no onSelect
              and no href, so the menu looked complete but did nothing: only
              "Log out" ever worked. Each survivor now points at a route that
              actually exists. "Billing" is deleted rather than wired — there
              is no billing page to send anyone to, and inventing a
              destination is worse than removing a control nobody could use.
            */}
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/pricing">
                  <Sparkles />
                  {t("upgradeToPro")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <BadgeCheck />
                  {t("account")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/notifications">
                  <Bell />
                  {t("notifications")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={(event) => {
                event.preventDefault();
                handleSignOut();
              }}
              disabled={logoutMutation.isPending}
            >
              <LogOut />
              {logoutMutation.isPending ? t("signingOut") : t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}