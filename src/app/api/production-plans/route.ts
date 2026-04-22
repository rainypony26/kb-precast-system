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

    // 1. Validasi data dasar (Tanpa tanggal karena ditarik otomatis)
    if (!body.contractId || !body.targetVolume) {
      return NextResponse.json({ error: "Data SPK tidak lengkap!" }, { status: 400 });
    }

    // 2. AMBIL TANGGAL DARI KONTRAK (Inheritance Logic)
    const contractData = await db
      .select({
        startDate: contracts.startDate,
        endDate: contracts.endDate,
      })
      .from(contracts)
      .where(eq(contracts.id, body.contractId))
      .limit(1);

    if (!contractData.length) {
      return NextResponse.json({ error: "Kontrak tidak ditemukan!" }, { status: 404 });
    }

    const { startDate, endDate } = contractData[0];

    // 3. Buat Nomor SPK Otomatis
    const year = new Date().getFullYear();
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(productionPlans);
    const count = result[0]?.count || 0;
    const spkNumber = `SPK-${year}-${String(count + 1).padStart(4, "0")}`;

    // 4. Insert Production Plan (Penerapan Tanggal Otomatis)
    const [plan] = await db.insert(productionPlans).values({
      contractId: body.contractId,
      spkNumber: spkNumber,
      targetVolume: Number(body.targetVolume),
      unit: body.unit || "pcs",
      
      // OTOMATIS: Menggunakan tanggal dari kontrak asal
      commenceDate: new Date(startDate),
      deadlineDate: new Date(endDate),
      
      status: "AKTIF",
      notes: body.notes || null,
    }).returning();

    // 5. Simpan BOM Materials (Menyesuaikan key dari frontend: bomItems)
    const items = body.bomItems || body.bom; // Support dua versi key
    if (items && items.length > 0) {
      const bomData = items.map((item: any) => ({
        planId: plan.id,
        materialName: item.materialName,
        estimatedQty: item.estimatedQty?.toString() || item.qty?.toString(),
        unit: item.unit,
        procurementType: item.procurementType,
        unitPrice: item.unitPrice?.toString() || item.price?.toString() || "0",
        notes: item.notes || null
      }));
      await db.insert(bomMaterials).values(bomData);
    }

    // 6. Simpan Manpower (Menyesuaikan key dari frontend: manpowerItems)
    const crews = body.manpowerItems || body.manpower; // Support dua versi key
    if (crews && crews.length > 0) {
      const mpData = crews.map((mp: any) => ({
        planId: plan.id,
        sourceType: mp.sourceType,
        headcount: Number(mp.headcount),
        roleDescription: mp.roleDescription,
        dailyRate: mp.dailyRate?.toString() || mp.rate?.toString() || "0",
        notes: mp.notes || null
      }));
      await db.insert(manpowerPlans).values(mpData);
    }

    return NextResponse.json(plan, { status: 201 });
  } catch (err: any) {
    console.error("SPK ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}