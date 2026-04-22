import { db } from "@/db";
import { projects, users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import CrmClient from "@/components/crm/crm-client";

export default async function CrmPage() {
  const session = await getSession();

  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt));

  const allUsers = await db
    .select()
    .from(users);

  return (
    <CrmClient
      initialProjects={allProjects}
      users={allUsers}
      session={session}
    />
  );
}
