import { db } from "@/db";
import { inventoryLog, bomMaterials, productionPlans, contracts, projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import InventoryClient from "@/components/crm/inventory-client";
import { redirect } from "next/navigation";

export default async function InventoryPage() {
  const session = await getSession();
  
  // Proteksi: Kalau ndak ada session, tendang ke login
  if (!session) {
    redirect("/login");
  }

  // Ambil data log inventory
  const logs = await db
    .select({
      id: inventoryLog.id,
      transactionType: inventoryLog.transactionType,
      qty: inventoryLog.qty,
      unit: inventoryLog.unit,
      transactionDate: inventoryLog.transactionDate,
      notes: inventoryLog.notes,
      materialName: bomMaterials.materialName,
      spkNumber: productionPlans.spkNumber,
      projectName: projects.projectName,
    })
    .from(inventoryLog)
    .leftJoin(bomMaterials, eq(inventoryLog.bomId, bomMaterials.id))
    .leftJoin(productionPlans, eq(inventoryLog.planId, productionPlans.id))
    .leftJoin(contracts, eq(productionPlans.contractId, contracts.id))
    .leftJoin(projects, eq(contracts.projectId, projects.id))
    .orderBy(desc(inventoryLog.transactionDate));

  // Ambil daftar BOM untuk pilihan di Modal
  const allBomItems = await db
    .select({
      id: bomMaterials.id,
      materialName: bomMaterials.materialName,
      planId: bomMaterials.planId,
      unit: bomMaterials.unit,
      spkNumber: productionPlans.spkNumber,
    })
    .from(bomMaterials)
    .leftJoin(productionPlans, eq(bomMaterials.planId, productionPlans.id));

  return (
    <InventoryClient 
      initialLogs={logs} 
      bomItems={allBomItems} 
      session={session} 
    />
  );
}