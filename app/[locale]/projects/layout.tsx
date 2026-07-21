import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ProjectBreadcrumb } from "@/components/breadcrumb/project-breadcrumb";
import { ModeToggle } from "@/components/ui/theme-toggle";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ProfileGuard } from "@/components/auth/profile-guard";

interface ProjectsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}

/**
 * Shell for every page under `/[locale]/projects/*`. Role is fixed to
 * `DESIGNER` until per-role gating is wired up — at that point this
 * layout will read the role from the auth session and switch the
 * sidebar config dynamically. For now the project-scope sidebar is
 * shared across viewer types and lists:
 *   - Project Info
 *   - Design Work
 *   - Construction Work (contractor items, scoped to the project)
 *   - Messages
 */
export default async function ProjectsLayout({
  children,
  params,
}: ProjectsLayoutProps) {
  const { locale } = await params;
  return (
    <ProfileGuard>
      <SidebarProvider>
        <AppSidebar locale={locale} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/50 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <ProjectBreadcrumb localePrefix={locale} />
            </div>
            <div className="flex items-center gap-2">
              <LocaleSwitcher />
              <ModeToggle />
            </div>
          </header>
          <div className="p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </ProfileGuard>
  );
}