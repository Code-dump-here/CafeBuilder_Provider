import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  LayoutDashboard,
  Search,
  Settings,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { AdminGuard } from "@/components/auth/admin-guard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/50 px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <div className="relative hidden sm:block sm:w-72">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                placeholder="Search accounts, projects…"
                className="h-9 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Removed: "/workspace" has no matching page under
                app/[locale]/ — keeping the button here (not deleting) so
                it's easy to re-enable once that page exists.
            <Button asChild variant="ghost" size="sm">
              <Link href="/workspace">
                <ArrowLeft aria-hidden />
                Back to client view
              </Link>
            </Button>
            */}
            <Button variant="ghost" size="icon-sm" aria-label="Notifications">
              <Bell aria-hidden />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Settings">
              <Settings aria-hidden />
            </Button>
          </div>
        </header>
        <div className="p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
    </AdminGuard>
  );
}