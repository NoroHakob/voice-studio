import { cookies } from "next/headers";

import { 
  SidebarInset, 
  SidebarProvider
} from "@/components/ui/sidebar";
import { SupportDeskScript } from "@/components/support-desk-script";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { SupportVoiceButton } from "@/features/support/components/support-voice-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen} className="h-svh">
      <DashboardSidebar />
      <SidebarInset className="min-h-0 min-w-0">
        <main className="flex min-h-0 flex-1 flex-col">
          {children}
        </main>
      </SidebarInset>
      <SupportDeskScript />
      {process.env.NEXT_PUBLIC_SUPPORTDESK_WORKSPACE_ID && <SupportVoiceButton />}
    </SidebarProvider>
  )
};