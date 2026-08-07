export const dynamic = "force-dynamic";

import { db } from "@/db";
import { materials, projects, contracts, materialOutbound, productionPlans } from "@/db/schema";
import { desc, eq, isNotNull } from "drizzle-orm";
import AlokasiClient from "@/components/crm/alokasi-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AlokasiMaterialPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    // 1. Fetch all materials (for dropdown)
    const allMaterials = await db.select().from(materials).orderBy(materials.name);

    // 2. Fetch projects that have contracts (allocatable targets)
    const projectsWithContracts = await db
      .select({
        id: projects.id,
        projectName: projects.projectName,
        projectCode: projects.projectCode,
        contractNumber: contracts.contractNumber,
        contractValue: contracts.contractValue,
      })
      .from(projects)
      .innerJoin(contracts, eq(contracts.projectId, projects.id))
      .orderBy(desc(projects.createdAt));

    // 3. Fetch existing allocation history
    const allocationHistory = await db
      .select({
        id: materialOutbound.id,
        materialId: materialOutbound.materialId,
        materialName: materials.name,
        unit: materials.unit,
        qty: materialOutbound.qty,
        unitPrice: materialOutbound.unitPrice,
        projectId: materialOutbound.projectId,
        projectName: projects.projectName,
        exitDate: materialOutbound.exitDate,
        notes: materialOutbound.notes,
        createdAt: materialOutbound.createdAt,
      })
      .from(materialOutbound)
      .leftJoin(materials, eq(materialOutbound.materialId, materials.id))
      .leftJoin(projects, eq(materialOutbound.projectId, projects.id))
      .where(isNotNull(materialOutbound.projectId))
      .orderBy(desc(materialOutbound.createdAt));

    return (
      <div className="p-8 min-h-screen text-slate-800 dark:text-slate-100 bg-background font-sans">
        <AlokasiClient
          initialMaterials={allMaterials}
          initialProjects={projectsWithContracts}
          initialHistory={allocationHistory}
          session={session}
        />
      </div>
    );
  } catch (error: any) {
    return (
      <div className="p-8 text-center text-slate-800 dark:text-slate-100 min-h-screen bg-background font-sans">
        <div className="bg-card border border-red-200/50 dark:border-red-900/30 p-6 rounded-2xl max-w-2xl mx-auto mt-10 shadow-sm">
          <h1 className="text-xl font-black text-red-600 dark:text-red-400 mb-2">Error!</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">{error.message}</p>
        </div>
      </div>
    );
  }
}
