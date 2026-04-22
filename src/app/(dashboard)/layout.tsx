import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  // Jika tidak ada session, lempar ke login
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* --- PAKAI 'as any' DISINI UNTUK TEMBUS VERCEL --- */}
      <Sidebar session={session as any} />
      
      <main className="flex-1 min-h-screen"> 
        {children}
      </main>
    </div>
  );
}