import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* --- PALU GODAM: SURUH TYPESCRIPT DIAM --- */}
      {/* @ts-ignore */}
      <Sidebar session={session} />
      
      <main className="flex-1 min-h-screen"> 
        {children}
      </main>
    </div>
  );
}