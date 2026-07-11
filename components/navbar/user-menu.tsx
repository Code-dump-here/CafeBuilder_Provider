"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { LogOut, LayoutDashboard } from "lucide-react";
import { toast } from "react-toastify";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthSession, useLogoutMutation } from "@/features/auth/hooks";
import type { UserRole } from "@/features/auth/api";

/**
 * Small avatar + dropdown that replaces the "Sign in / Sign up" buttons
 * when the user is already authenticated. Reads auth state via
 * `useAuthSession()` so it auto-updates on login / logout.
 *
 * Layout note: the trigger is rendered as a circular icon button so it
 * fits in the same right-aligned slot as the existing CTA buttons.
 */
export function UserMenu() {
  const t = useTranslations("Navbar.userMenu");
  const router = useRouter();
  const { account } = useAuthSession();
  const logoutMutation = useLogoutMutation();

  const fallback = React.useMemo(() => {
    const email = account?.email ?? "";
    const letter = email.trim().charAt(0).toUpperCase();
    return letter || "?";
  }, [account?.email]);

  const homePath = React.useMemo(
    () => roleHomePath(account?.role),
    [account?.role],
  );

  const handleSignOut = React.useCallback(() => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("signOutSuccess"));
        router.replace("/");
      },
    });
  }, [logoutMutation, router, t]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("triggerAria")}
          className="size-9 rounded-full p-0"
        >
          <Avatar size="default" className="size-9">
            <AvatarFallback className="text-sm font-medium">
              {fallback}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5 py-1">
            <p className="text-sm font-medium text-foreground">
              {account?.email ?? t("signedInAs")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(`role.${account?.role ?? "guest"}`)}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={homePath}>
            <LayoutDashboard className="size-3.5" />
            {t("workspace")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault();
            handleSignOut();
          }}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="size-3.5" />
          {logoutMutation.isPending ? t("signingOut") : t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Mirror of `roleHomePath` from the registration form. Kept local so this
 * component has zero coupling to the registration flow — when the role →
 * home mapping becomes data-driven (e.g. from the API) swap to the
 * shared source.
 */
function roleHomePath(role: UserRole | undefined): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "owner":
    case "provider":
    default:
      return "/workspace";
  }
}