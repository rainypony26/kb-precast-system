export const dynamic = 'force-dynamic';

import { db } from "@/db";
import { projects, contracts, productionPlans, bomMaterials, manpowerPlans, materials, rabs } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
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

  // 🔥 FETCH DATA RAB 🔥
  const rawRabs = await db
    .select({
      id: rabs.id,
      contractId: rabs.contractId,
      rabNumber: rabs.rabNumber,
      targetVolume: rabs.targetVolume,
      unit: rabs.unit,
      depreciationMethod: rabs.depreciationMethod,
      depreciationValue: rabs.depreciationValue,
      fixedCostMethod: rabs.fixedCostMethod,
      fixedCostValue: rabs.fixedCostValue,
      overheadHo: rabs.overheadHo,
      status: rabs.status,
      notes: rabs.notes,
      createdAt: rabs.createdAt,
      projectName: projects.projectName,
      projectCode: projects.projectCode,
      customerName: projects.customerName,
    })
    .from(rabs)
    .leftJoin(contracts, eq(rabs.contractId, contracts.id))
    .leftJoin(projects, eq(contracts.projectId, projects.id))
    .orderBy(desc(rabs.createdAt));

  const allRabBoms = await db.select().from(bomMaterials).where(sql`rab_id is not null`);
  const allRabMps = await db.select().from(manpowerPlans).where(sql`rab_id is not null`);

  const allRabs = rawRabs.map(r => ({
    ...r,
    createdAt: r.createdAt ? (r.createdAt as Date).toISOString() : null,
    bomItems: allRabBoms.filter(b => b.rabId === r.id),
    manpowerItems: allRabMps.filter(m => m.rabId === r.id)
  })) as any;

  const rawPlans = await db
    .select({
      id: productionPlans.id,
      contractId: productionPlans.contractId,
      rabId: productionPlans.rabId,
      spkNumber: productionPlans.spkNumber,
      targetVolume: productionPlans.targetVolume,
      unit: productionPlans.unit,
      commenceDate: productionPlans.commenceDate,
      deadlineDate: productionPlans.deadlineDate,
      status: productionPlans.status,
      notes: productionPlans.notes,
      createdAt: productionPlans.createdAt,
      projectName: projects.projectName,
      projectCode: projects.projectCode,
    })
    .from(productionPlans)
    .leftJoin(contracts, eq(productionPlans.contractId, contracts.id))
    .leftJoin(projects, eq(contracts.projectId, projects.id))
    .orderBy(desc(productionPlans.createdAt));

  const allBoms = await db.select().from(bomMaterials).where(sql`plan_id is not null`);
  const allMps = await db.select().from(manpowerPlans).where(sql`plan_id is not null`);
  
  // 🔥 AMBIL DATA MASTER MATERIAL DARI GUDANG PUSAT 🔥
  const masterMaterials = await db.select().from(materials).orderBy(desc(materials.name));

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
      initialRabs={allRabs} // Kirim ke Client UI
      masterMaterials={masterMaterials} // Kirim ke Client UI
      session={session}
    />
  );
}