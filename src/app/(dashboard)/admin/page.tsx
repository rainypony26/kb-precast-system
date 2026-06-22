import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminClient from "@/components/admin/admin-client";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Hanya admin, manager, & assistant_manager yang boleh masuk
  const allowed = ["admin", "manager", "assistant_manager"];
  if (!allowed.includes(session.role)) {
    redirect("/");
  }

  return <AdminClient session={session} />;
}
