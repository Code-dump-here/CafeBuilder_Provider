import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ProjectBreadcrumb } from "@/components/breadcrumb/project-breadcrumb";
import { ModeToggle } from "@/components/ui/theme-toggle";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

interface DesignerLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}

export default async function DesignerLayout({
  children,
  params,
}: DesignerLayoutProps) {
  const { locale } = await params;
  return (
    <SidebarProvider>
      <AppSidebar role="DESIGNER" locale={locale} />
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
  );
}
