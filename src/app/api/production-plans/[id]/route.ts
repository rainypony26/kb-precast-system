export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productionPlans, bomMaterials, manpowerPlans, dailyReports, finishedGoods, operationalExpenses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status !== undefined)       update.status = body.status;
    if (body.spkNumber !== undefined)    update.spkNumber = body.spkNumber;
    if (body.targetVolume !== undefined) update.targetVolume = Number(body.targetVolume);
    if (body.unit !== undefined)         update.unit = body.unit;
    if (body.rabId !== undefined)        update.rabId = body.rabId || null; // 🔥 Hubungkan ke RAB acuan
    if (body.overheadPercentage !== undefined) update.overheadPercentage = Number(body.overheadPercentage);
    if (body.notes !== undefined)        update.notes = body.notes || null;

    if (body.actualMaterial !== undefined) update.actualMaterial = Number(body.actualMaterial);
    if (body.actualManpower !== undefined) update.actualManpower = Number(body.actualManpower);
    if (body.actualOverhead !== undefined) update.actualOverhead = Number(body.actualOverhead);

    const currentSpk = await db.select({ rabId: productionPlans.rabId }).from(productionPlans).where(eq(productionPlans.id, id)).limit(1);
    const rabIdVal = body.rabId !== undefined ? (body.rabId || null) : (currentSpk[0]?.rabId || null);

    const [updatedPlan] = await db.update(productionPlans).set(update).where(eq(productionPlans.id, id)).returning();

    if (body.bomItems) {
      await db.delete(bomMaterials).where(eq(bomMaterials.planId, id));
      const validBom = body.bomItems.filter((b: any) => b.materialId && b.estimatedQty);
      if (validBom.length > 0) {
        const bomData = validBom.map((item: any) => ({
          planId: id,
          rabId: rabIdVal, // 🔥 Hubungkan BOM ke RAB acuan jika ada
          materialId: item.materialId || null,
          materialName: item.materialName,
          estimatedQty: item.estimatedQty.toString(),
          unit: item.unit,
          procurementType: item.procurementType,
          unitPrice: item.unitPrice?.toString() || "0",
          notes: item.notes || null
        }));
        await db.insert(bomMaterials).values(bomData);
      }
    }

    if (body.manpowerItems) {
      await db.delete(manpowerPlans).where(eq(manpowerPlans.planId, id));
      const validMp = body.manpowerItems.filter((m: any) => m.roleDescription && m.headcount);
      if (validMp.length > 0) {
        const mpData = validMp.map((mp: any) => ({
          planId: id,
          rabId: rabIdVal, // 🔥 Hubungkan Manpower ke RAB acuan jika ada
          sourceType: mp.sourceType,
          headcount: Number(mp.headcount),
          roleDescription: mp.roleDescription,
          dailyRate: mp.dailyRate?.toString() || "0",
          notes: mp.notes || null
        }));
        await db.insert(manpowerPlans).values(mpData);
      }
    }

    const finalBoms = await db.select().from(bomMaterials).where(eq(bomMaterials.planId, id));
    const finalMps = await db.select().from(manpowerPlans).where(eq(manpowerPlans.planId, id));

    return NextResponse.json({ ...updatedPlan, bomItems: finalBoms, manpowerItems: finalMps });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal update SPK", details: err.message }, { status: 500 });
  }
}

// 🔥 MODE NUKLIR BYPASS (SUDAH DITAMBAH BUKU KAS) 🔥
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Hanya Admin yang bisa menghapus SPK!" }, { status: 403 });

  const { id } = await params;

  try {
    try { await db.delete(bomMaterials).where(eq(bomMaterials.planId, id)); } catch(e) {}
    try { await db.delete(manpowerPlans).where(eq(manpowerPlans.planId, id)); } catch(e) {}
    try { await db.delete(dailyReports).where(eq(dailyReports.planId, id)); } catch(e) {}
    try { await db.delete(finishedGoods).where(eq(finishedGoods.planId, id)); } catch(e) {}
    // 🔥 BUKU KAS IKUT DIHAPUS
    try { await db.delete(operationalExpenses).where(eq(operationalExpenses.planId, id)); } catch(e) {}

    await db.delete(productionPlans).where(eq(productionPlans.id, id));
    
    return NextResponse.json({ success: true, message: "SPK Berhasil Dihapus Bersih!" });
  } catch (err: any) {
    const realError = err.detail || err.hint || err.message;
    return NextResponse.json({ error: "SPK Induk ditolak oleh Database!", details: realError }, { status: 500 });
  }
}