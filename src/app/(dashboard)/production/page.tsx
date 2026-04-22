import { db } from "@/db";
import { projects, contracts, productionPlans } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import ProductionClient from "@/components/crm/production-client";

export default async function ProductionPage() {
  const session = await getSession();

  // Proyek yang sudah KONTRAK
  const kontrakProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.status, "KONTRAK"))
    .orderBy(desc(projects.createdAt));

  // Semua contracts beserta project info
  const allContracts = await db
    .select({
      id: contracts.id,
      projectId: contracts.projectId,
      poId: contracts.poId,
      contractNumber: contracts.contractNumber,
      contractValue: contracts.contractValue,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      notes: contracts.notes,
      createdAt: contracts.createdAt,
      projectName: projects.projectName,
      projectCode: projects.projectCode,
      customerName: projects.customerName,
    })
    .from(contracts)
    .leftJoin(projects, eq(contracts.projectId, projects.id))
    .orderBy(desc(contracts.createdAt));

  // Semua SPK / production plans
  const allPlans = await db
    .select({
      id: productionPlans.id,
      contractId: productionPlans.contractId,
      spkNumber: productionPlans.spkNumber,
      targetVolume: productionPlans.targetVolume,
      unit: productionPlans.unit,
      commenceDate: productionPlans.commenceDate,
      deadlineDate: productionPlans.deadlineDate,
      status: productionPlans.status,
      notes: productionPlans.notes,
      createdAt: productionPlans.createdAt,
    })
    .from(productionPlans)
    .orderBy(desc(productionPlans.createdAt));

  return (
    <ProductionClient
      kontrakProjects={kontrakProjects}
      initialContracts={allContracts}
      initialPlans={allPlans}
      session={session}
    />
  );
}