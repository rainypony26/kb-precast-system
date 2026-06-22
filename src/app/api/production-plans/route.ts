import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productionPlans, contracts, bomMaterials, manpowerPlans } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.contractId || !body.targetVolume) {
      return NextResponse.json({ error: "Data SPK tidak lengkap!" }, { status: 400 });
    }

    const contractData = await db
      .select({ startDate: contracts.startDate, endDate: contracts.endDate })
      .from(contracts)
      .where(eq(contracts.id, body.contractId))
      .limit(1);

    if (!contractData.length) return NextResponse.json({ error: "Kontrak tidak ditemukan!" }, { status: 404 });

    const { startDate, endDate } = contractData[0];
    const year = new Date().getFullYear();
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(productionPlans);
    const count = result[0]?.count || 0;
    const spkNumber = `SPK-${year}-${String(count + 1).padStart(4, "0")}`;

    const [plan] = await db.insert(productionPlans).values({
      contractId: body.contractId,
      rabId: body.rabId || null, // 🔥 Hubungkan ke RAB acuan
      spkNumber: spkNumber,
      targetVolume: Number(body.targetVolume),
      unit: body.unit || "pcs",
      commenceDate: new Date(startDate),
      deadlineDate: new Date(endDate),
      status: "AKTIF",
      notes: body.notes || null,
    }).returning();

    // 🔥 SIMPAN MATERIAL ID DARI GUDANG PUSAT 🔥
    const items = body.bomItems || body.bom;
    if (items && items.length > 0) {
      const bomData = items.map((item: any) => ({
        planId: plan.id,
        rabId: body.rabId || null, // 🔥 Hubungkan BOM ke RAB acuan jika ada
        materialId: item.materialId || null, // <--- TERSAMBUNG KE GUDANG
        materialName: item.materialName,
        estimatedQty: item.estimatedQty?.toString() || item.qty?.toString(),
        unit: item.unit,
        procurementType: item.procurementType,
        unitPrice: item.unitPrice?.toString() || item.price?.toString() || "0",
        notes: item.notes || null
      }));
      await db.insert(bomMaterials).values(bomData);
    }

    const crews = body.manpowerItems || body.manpower;
    if (crews && crews.length > 0) {
      const mpData = crews.map((mp: any) => ({
        planId: plan.id,
        rabId: body.rabId || null, // 🔥 Hubungkan Manpower ke RAB acuan jika ada
        sourceType: mp.sourceType,
        headcount: Number(mp.headcount),
        roleDescription: mp.roleDescription,
        dailyRate: mp.dailyRate?.toString() || mp.rate?.toString() || "0",
        notes: mp.notes || null
      }));
      await db.insert(manpowerPlans).values(mpData);
    }

    const finalBoms = await db.select().from(bomMaterials).where(eq(bomMaterials.planId, plan.id));
    const finalMps = await db.select().from(manpowerPlans).where(eq(manpowerPlans.planId, plan.id));

    return NextResponse.json({
      ...plan,
      bomItems: finalBoms,
      manpowerItems: finalMps
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}