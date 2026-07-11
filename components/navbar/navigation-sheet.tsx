"use client";

import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { Logo } from "./logo";
import { NavMenu } from "./nav-menu";
import { AuthControls } from "./auth-controls";

export const NavigationSheet = () => {
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
        <AuthControls variant="sheet" className="flex flex-col gap-2.5 pt-2" />
      </SheetContent>
    </Sheet>
  );
};