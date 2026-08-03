"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/user-context";

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
 * `useCurrentUser()` reads from the UserContext which fetches the user
 * via `GET /api/auth/me`, so this component auto-updates on login / logout.
 */
export function AuthControls({ variant, className }: AuthControlsProps) {
  const t = useTranslations("Navbar.cta");
  const { isAuthenticated } = useCurrentUser();

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