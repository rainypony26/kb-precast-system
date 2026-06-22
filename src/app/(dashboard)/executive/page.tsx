export const dynamic = 'force-dynamic';

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ExecutiveClient from "@/components/crm/executive-client";

export default async function ExecutivePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Hanya Direksi / Manager / Admin yang boleh mengakses Laporan Eksekutif ini
  if (session.role === "staff") {
    redirect("/");
  }

  return (
    <div className="p-8 min-h-screen text-slate-800">
      <ExecutiveClient session={session} />
    </div>
  );
}
