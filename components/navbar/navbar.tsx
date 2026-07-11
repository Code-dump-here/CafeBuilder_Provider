"use client";

import Link from "next/link";
import { Logo } from "./logo";
import { NavMenu } from "./nav-menu";
import { NavigationSheet } from "./navigation-sheet";
import { AuthControls } from "./auth-controls";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ModeToggle } from "@/components/ui/theme-toggle";

const Navbar = () => {
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

          <AuthControls
            variant="desktop"
            className="hidden sm:flex sm:items-center sm:gap-1.5"
          />

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