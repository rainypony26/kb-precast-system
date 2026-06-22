import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Sidebar shell layout */}
      <Sidebar session={session} />
      
      <main className="flex-1 h-screen overflow-y-auto bg-background relative">
        {/* Subtle structural top indicator line */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-primary/20 pointer-events-none" />
        
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}