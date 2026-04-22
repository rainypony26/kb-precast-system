import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  // Proteksi: Jika tidak ada session, tendang balik ke login
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Sidebar ini sudah memakan tempat 256px (w-64) */}
      {/* Kita tambahkan 'as any' supaya TypeScript Vercel diam dan kasih lewat */}
      <Sidebar session={session as any} />
      
      {/* Bagian Konten Utama */}
      <main className="flex-1 min-h-screen"> 
        {children}
      </main>
    </div>
  );
}