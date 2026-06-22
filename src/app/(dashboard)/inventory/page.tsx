import { db } from "@/db";
import { finishedGoods, fgOutbound, productionPlans, contracts, projects } from "@/db/schema";
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

  // 1. Ambil data stok Finished Goods (FG) di Gudang Proyek
  const fgStock = await db
    .select({
      id: finishedGoods.id,
      productName: finishedGoods.productName,
      stock: finishedGoods.stock,
      unit: finishedGoods.unit,
      spkNumber: productionPlans.spkNumber,
      targetVolume: productionPlans.targetVolume,
      projectName: projects.projectName,
      projectCode: projects.projectCode,
    })
    .from(finishedGoods)
    .leftJoin(productionPlans, eq(finishedGoods.planId, productionPlans.id))
    .leftJoin(contracts, eq(productionPlans.contractId, contracts.id))
    .leftJoin(projects, eq(contracts.projectId, projects.id))
    .orderBy(desc(finishedGoods.createdAt));

  // 2. Ambil log pengiriman / pengeluaran FG
  const fgOutboundLogs = await db
    .select({
      id: fgOutbound.id,
      fgId: fgOutbound.fgId,
      deliveryNumber: fgOutbound.deliveryNumber,
      recipient: fgOutbound.recipient,
      qty: fgOutbound.qty,
      exitDate: fgOutbound.exitDate,
      notes: fgOutbound.notes,
      productName: finishedGoods.productName,
      projectName: projects.projectName,
      projectCode: projects.projectCode,
      spkNumber: productionPlans.spkNumber,
    })
    .from(fgOutbound)
    .innerJoin(finishedGoods, eq(fgOutbound.fgId, finishedGoods.id))
    .leftJoin(productionPlans, eq(finishedGoods.planId, productionPlans.id))
    .leftJoin(contracts, eq(productionPlans.contractId, contracts.id))
    .leftJoin(projects, eq(contracts.projectId, projects.id))
    .orderBy(desc(fgOutbound.exitDate));

  return (
    <InventoryClient 
      fgStock={fgStock} 
      deliveryLogs={fgOutboundLogs} 
      session={session} 
    />
  );
}