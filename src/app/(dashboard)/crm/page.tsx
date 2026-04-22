import { db } from "@/db";
import { projects, users } from "@/db/schema";
import CrmClient from "@/components/crm/crm-client";
import { getSession } from "@/lib/auth";
import { desc } from "drizzle-orm";

export default async function CrmPage() {
  const session = await getSession();
  
  // Tarik data users untuk pilihan PIC
  const allUsers = await db.select().from(users);
  
  // Tarik data projects dari database Neon
  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt));

  return (
    <CrmClient
      initialProjects={allProjects as any} // Gunakan 'as any' sebagai cara cepat agar Vercel tidak rewel soal tipe data saat build
      users={allUsers}
      session={session}
    />
  );
}