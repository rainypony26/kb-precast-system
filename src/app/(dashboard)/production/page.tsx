import { db } from "@/db";
import { projects, contracts, productionPlans, bomMaterials, manpowerPlans } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import ProductionClient from "@/components/crm/production-client";

export default async function ProductionPage() {
  const session = await getSession();

  const kontrakProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.status, "KONTRAK"))
    .orderBy(desc(projects.createdAt));

  const rawContracts = await db
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

  const allContracts = rawContracts.map(c => ({
    ...c,
    startDate: c.startDate ? (c.startDate as Date).toISOString() : null,
    endDate: c.endDate ? (c.endDate as Date).toISOString() : null,
    createdAt: c.createdAt ? (c.createdAt as Date).toISOString() : null,
  })) as any;

  const rawPlans = await db
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

  // TARIK DATA BOM & MANPOWER UNTUK DITAMPILKAN DI DETAIL/EDIT SPK
  const allBoms = await db.select().from(bomMaterials);
  const allMps = await db.select().from(manpowerPlans);

  const allPlans = rawPlans.map(p => ({
    ...p,
    commenceDate: p.commenceDate ? (p.commenceDate as Date).toISOString() : null,
    deadlineDate: p.deadlineDate ? (p.deadlineDate as Date).toISOString() : null,
    createdAt: p.createdAt ? (p.createdAt as Date).toISOString() : null,
    bomItems: allBoms.filter(b => b.planId === p.id),
    manpowerItems: allMps.filter(m => m.planId === p.id)
  })) as any;

  return (
    <ProductionClient
      kontrakProjects={kontrakProjects}
      initialContracts={allContracts}
      initialPlans={allPlans}
      session={session}
    />
  );
}