import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";

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
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/50 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-lg font-semibold">Designer Workspace</h1>
        </header>
        <div className="p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
