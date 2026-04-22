import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import MonitoringClient from "@/components/crm/monitoring-client";

export default async function MonitoringPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <MonitoringClient
      userId={session.userId}
      userRole={session.role}
    />
  );
}