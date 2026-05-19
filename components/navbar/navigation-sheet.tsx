"use client";

import Link from "next/link";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "./logo";
import { NavMenu } from "./nav-menu";

export const NavigationSheet = () => {
  const t = useTranslations("Navbar.cta");

  return (
    <Sheet>
      <VisuallyHidden>
        <SheetTitle>Navigation Menu</SheetTitle>
      </VisuallyHidden>

      <SheetTrigger asChild>
        <Button size="icon" variant="outline">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <Logo />
          <LocaleSwitcher />
        </div>

        <NavMenu className="[&>div]:h-full" orientation="vertical" />

        {/* Mobile auth buttons */}
        <div className="flex flex-col gap-2.5 pt-2">
          <Button variant="outline" className="w-full text-base" asChild>
            <Link href="/login">{t("signIn")}</Link>
          </Button>
          <Button className="w-full text-base" asChild>
            <Link href="/register">{t("signUp")}</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
