"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/hooks";

import { UserMenu } from "./user-menu";

type AuthControlsVariant = "desktop" | "sheet";

interface AuthControlsProps {
  variant: AuthControlsVariant;
  className?: string;
}

/**
 * Right-aligned CTA block in the navbar. Renders:
 *   - The `UserMenu` (avatar + dropdown) when the user is authenticated.
 *   - The "Sign in / Start free" button pair otherwise.
 *
 * `useAuthSession()` reads the persisted token at module-load time and
 * subscribes to subsequent login/logout events, so this component
 * auto-flipping between the two states without manual refresh.
 */
export function AuthControls({ variant, className }: AuthControlsProps) {
  const t = useTranslations("Navbar.cta");
  const { isAuthenticated } = useAuthSession();

  if (variant === "desktop") {
    return (
      <div className={className}>
        {isAuthenticated ? (
          <UserMenu />
        ) : (
          <>
            <Button variant="ghost" size="lg" asChild>
              <Link href="/login" className="text-base">
                {t("signIn")}
              </Link>
            </Button>
            <Button size="lg" asChild>
              <Link href="/register" className="text-base">
                {t("signUp")}
              </Link>
            </Button>
          </>
        )}
      </div>
    );
  }

  // Mobile (sheet) variant — full-width stacked buttons.
  return (
    <div className={className}>
      {isAuthenticated ? (
        <div className="flex flex-col gap-2">
          <UserMenu />
        </div>
      ) : (
        <>
          <Button variant="outline" className="w-full text-base" asChild>
            <Link href="/login">{t("signIn")}</Link>
          </Button>
          <Button className="w-full text-base" asChild>
            <Link href="/register">{t("signUp")}</Link>
          </Button>
        </>
      )}
    </div>
  );
}