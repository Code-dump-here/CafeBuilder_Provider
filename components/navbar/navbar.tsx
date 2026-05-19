"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ModeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "./logo";
import { NavMenu } from "./nav-menu";
import { NavigationSheet } from "./navigation-sheet";

const Navbar = () => {
  const t = useTranslations("Navbar.cta");

  return (
    <nav className="h-16 border-b bg-background">
      <div className="mx-auto flex h-full max-w-(--breakpoint-xl) items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ── Left: Logo + Desktop Nav ── */}
        <div className="flex items-center gap-10">
          <Link href="/">
            <Logo />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <NavMenu />
          </div>
        </div>

        {/* ── Right: Actions ── */}
        <div className="flex items-center gap-1.5">
          <LocaleSwitcher />
          <ModeToggle />

          <div className="hidden sm:flex sm:items-center sm:gap-1.5">
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
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <NavigationSheet />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
