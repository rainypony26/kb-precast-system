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
      {/* Sidebar ini sudah memakan tempat 256px (w-64) */}
      <Sidebar session={session} />
      
      {/* HAPUS 'ml-64' di bawah ini! */}
      <main className="flex-1 min-h-screen"> 
        {children}
      </main>
    </div>
  );
}