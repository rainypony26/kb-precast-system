import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rabs, contracts, projects, bomMaterials, manpowerPlans } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const allRabs = await db
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
        updatedAt: rabs.updatedAt,
        contractNumber: contracts.contractNumber,
        contractValue: contracts.contractValue,
        projectName: projects.projectName,
        projectCode: projects.projectCode,
        customerName: projects.customerName,
      })
      .from(rabs)
      .innerJoin(contracts, eq(rabs.contractId, contracts.id))
      .innerJoin(projects, eq(contracts.projectId, projects.id))
      .orderBy(desc(rabs.createdAt));

    return NextResponse.json(allRabs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.contractId || !body.targetVolume) {
      return NextResponse.json({ error: "Data RAB tidak lengkap!" }, { status: 400 });
    }

    // Generate rabNumber otomatis: RAB-YYYY-XXXX
    const year = new Date().getFullYear();
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(rabs);
    const count = result[0]?.count || 0;
    const rabNumber = `RAB-${year}-${String(count + 1).padStart(4, "0")}`;

    const [newRab] = await db.insert(rabs).values({
      contractId: body.contractId,
      rabNumber: rabNumber,
      targetVolume: Number(body.targetVolume),
      unit: body.unit || "pcs",
      depreciationMethod: body.depreciationMethod || "DIRECT",
      depreciationValue: body.depreciationValue?.toString() || "0",
      fixedCostMethod: body.fixedCostMethod || "DIRECT",
      fixedCostValue: body.fixedCostValue?.toString() || "0",
      overheadHo: body.overheadHo?.toString() || "0",
      status: "DRAFT",
      notes: body.notes || null,
    }).returning();

    // Simpan BOM
    const bomItems = body.bomItems || [];
    if (bomItems.length > 0) {
      const bomData = bomItems.map((item: any) => ({
        rabId: newRab.id,
        materialId: item.materialId || null,
        materialName: item.materialName,
        estimatedQty: item.estimatedQty.toString(),
        unit: item.unit,
        procurementType: item.procurementType || "BELI_BARU",
        unitPrice: item.unitPrice?.toString() || "0",
        notes: item.notes || null,
      }));
      await db.insert(bomMaterials).values(bomData);
    }

    // Simpan Manpower
    const manpowerItems = body.manpowerItems || [];
    if (manpowerItems.length > 0) {
      const mpData = manpowerItems.map((mp: any) => ({
        rabId: newRab.id,
        sourceType: mp.sourceType || "INTERNAL",
        headcount: Number(mp.headcount),
        roleDescription: mp.roleDescription,
        dailyRate: mp.dailyRate?.toString() || "0",
        notes: mp.notes || null,
      }));
      await db.insert(manpowerPlans).values(mpData);
    }

    const finalBoms = await db.select().from(bomMaterials).where(eq(bomMaterials.rabId, newRab.id));
    const finalMps = await db.select().from(manpowerPlans).where(eq(manpowerPlans.rabId, newRab.id));

    return NextResponse.json({
      ...newRab,
      bomItems: finalBoms,
      manpowerItems: finalMps
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
