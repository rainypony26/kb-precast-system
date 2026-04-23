import { db } from "@/db";
import { projects, contracts, productionPlans } from "@/db/schema";
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
    startDate: (c.startDate as Date).toISOString(),
    endDate: (c.endDate as Date).toISOString(),
    createdAt: c.createdAt ? (c.createdAt as Date).toISOString() : null,
  })) as {
    id: string; projectId: string; poId: string | null;
    contractNumber: string; contractValue: string;
    startDate: string; endDate: string;
    notes: string | null; createdAt: string | null;
    projectName: string | null; projectCode: string | null; customerName: string | null;
  }[];

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

  const allPlans = rawPlans.map(p => ({
    ...p,
    commenceDate: (p.commenceDate as Date).toISOString(),
    deadlineDate: (p.deadlineDate as Date).toISOString(),
    createdAt: p.createdAt ? (p.createdAt as Date).toISOString() : null,
  })) as {
    id: string; contractId: string; spkNumber: string | null;
    targetVolume: number; unit: string;
    commenceDate: string; deadlineDate: string;
    status: string; notes: string | null; createdAt: string | null;
  }[];

  return (
    <ProductionClient
      kontrakProjects={kontrakProjects}
      initialContracts={allContracts}
      initialPlans={allPlans}
      session={session}
    />
  );
}