import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productionPlans, bomMaterials, manpowerPlans } from "@/db/schema";
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
    if (body.commenceDate !== undefined) update.commenceDate = body.commenceDate;
    if (body.deadlineDate !== undefined) update.deadlineDate = body.deadlineDate;
    if (body.notes !== undefined)        update.notes = body.notes || null;

    const [updated] = await db
      .update(productionPlans)
      .set(update)
      .where(eq(productionPlans.id, id))
      .returning();

    // JIKA FORM EDIT MENGIRIM BOM BARU (HAPUS YANG LAMA, MASUKKAN YANG BARU)
    if (body.bomItems) {
      await db.delete(bomMaterials).where(eq(bomMaterials.planId, id));
      const validBom = body.bomItems.filter((b: any) => b.materialName && b.estimatedQty);
      if (validBom.length > 0) {
        const bomData = validBom.map((item: any) => ({
          planId: id,
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

    // JIKA FORM EDIT MENGIRIM MANPOWER BARU
    if (body.manpowerItems) {
      await db.delete(manpowerPlans).where(eq(manpowerPlans.planId, id));
      const validMp = body.manpowerItems.filter((m: any) => m.roleDescription && m.headcount);
      if (validMp.length > 0) {
        const mpData = validMp.map((mp: any) => ({
          planId: id,
          sourceType: mp.sourceType,
          headcount: Number(mp.headcount),
          roleDescription: mp.roleDescription,
          dailyRate: mp.dailyRate?.toString() || "0",
          notes: mp.notes || null
        }));
        await db.insert(manpowerPlans).values(mpData);
      }
    }

    // Kembalikan data lengkap
    const finalBoms = await db.select().from(bomMaterials).where(eq(bomMaterials.planId, id));
    const finalMps = await db.select().from(manpowerPlans).where(eq(manpowerPlans.planId, id));

    return NextResponse.json({ ...updated, bomItems: finalBoms, manpowerItems: finalMps });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal update SPK" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.delete(productionPlans).where(eq(productionPlans.id, id));
  return NextResponse.json({ success: true });
}