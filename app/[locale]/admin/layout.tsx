import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  LayoutDashboard,
} from "lucide-react";

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
          </div>
          <div className="flex items-center gap-2">
            {/* "/workspace" never existed as a route — points at "/" now,
                matching the same "back to home" convention used by the
                sidebar's own brand header (see app-sidebar.tsx). */}
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft aria-hidden />
                Back to client view
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon-sm">
              <Link href="/notifications" aria-label="Notifications">
                <Bell aria-hidden />
              </Link>
            </Button>
          </div>
        </header>
        <div className="p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
    </AdminGuard>
  );
}