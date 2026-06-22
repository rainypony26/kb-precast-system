export const dynamic = 'force-dynamic';

import { db } from "@/db";
import { materials, materialInbound, materialOutbound, productionPlans, bomMaterials, finishedGoods, fgOutbound } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import MasterInventoryClient from "@/components/crm/master-inventory-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MasterInventoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    // --- 1. DATA BAHAN BAKU (RAW MATERIAL) ---
    const allMaterials = await db.select().from(materials).orderBy(desc(materials.createdAt));
    const inbounds = await db.select().from(materialInbound).orderBy(desc(materialInbound.entryDate));
    const outbounds = await db.select().from(materialOutbound).orderBy(desc(materialOutbound.exitDate));
    
    const activePlans = await db.select({ id: productionPlans.id }).from(productionPlans).where(eq(productionPlans.status, 'AKTIF'));
    const activePlanIds = activePlans.map(p => p.id);
    
    let allBoms: any[] = [];
    if (activePlanIds.length > 0) {
      allBoms = await db.select().from(bomMaterials);
    }

    const rawMaterialData = allMaterials.map(mat => {
      const totalBooked = allBoms
        .filter(bom => activePlanIds.includes(bom.planId) && bom.materialId === mat.id)
        .reduce((sum, bom) => sum + Number(bom.estimatedQty || 0), 0);

      const matInbounds = inbounds.filter(i => i.materialId === mat.id);
      const matOutbounds = outbounds.filter(o => o.materialId === mat.id);

      return {
        ...mat,
        stock: Number(mat.stock),
        bookedAmount: totalBooked,
        availableAmount: Number(mat.stock) - totalBooked,
        inbounds: matInbounds,
        outbounds: matOutbounds
      };
    });

    // --- 2. DATA BARANG JADI (FINISHED GOODS) ---
    const rawFg = await db.select({
       id: finishedGoods.id,
       productName: finishedGoods.productName,
       stock: finishedGoods.stock,
       unit: finishedGoods.unit,
       planId: finishedGoods.planId,
       spkNumber: productionPlans.spkNumber
    })
    .from(finishedGoods)
    .leftJoin(productionPlans, eq(finishedGoods.planId, productionPlans.id))
    .orderBy(desc(finishedGoods.createdAt));

    const allFgOutbounds = await db.select().from(fgOutbound).orderBy(desc(fgOutbound.exitDate));

    const finishedGoodsData = rawFg.map(fg => {
        const outbounds = allFgOutbounds.filter(o => o.fgId === fg.id);
        return {
            ...fg,
            outbounds
        };
    });

   return (
      <div className="p-8 bg-[#0f172a] min-h-screen text-white">
        <MasterInventoryClient 
          initialMaterials={rawMaterialData} 
          inboundHistory={inbounds}
          outboundHistory={outbounds}
          finishedGoods={finishedGoodsData} 
          session={session} // 🔥 INI DIA YANG KETINGGALAN BOSSKU! 🔥
        />
      </div>
    );
  } catch (error: any) {
    return (
      <div className="p-8 text-center text-white bg-[#0f172a] min-h-screen">
        <div className="bg-red-500/10 border border-red-500 p-6 rounded-2xl max-w-2xl mx-auto mt-10">
          <h1 className="text-xl font-black text-red-500 mb-2">ERROR DATABASE!</h1>
          <p className="text-slate-400">{error.message}</p>
        </div>
      </div>
    );
  }
}