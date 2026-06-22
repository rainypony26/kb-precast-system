import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rabs, bomMaterials, manpowerPlans, contracts, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const rabData = await db
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
      .where(eq(rabs.id, id))
      .limit(1);

    if (!rabData.length) return NextResponse.json({ error: "RAB tidak ditemukan" }, { status: 404 });

    const boms = await db.select().from(bomMaterials).where(eq(bomMaterials.rabId, id));
    const mps = await db.select().from(manpowerPlans).where(eq(manpowerPlans.rabId, id));

    return NextResponse.json({
      ...rabData[0],
      bomItems: boms,
      manpowerItems: mps,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    // Periksa status RAB
    const current = await db.select().from(rabs).where(eq(rabs.id, id)).limit(1);
    if (!current.length) return NextResponse.json({ error: "RAB tidak ditemukan" }, { status: 404 });

    if (current[0].status !== "DRAFT" && session.role === "staff") {
      return NextResponse.json({ error: "RAB yang sudah disetujui/ditolak tidak dapat diubah oleh Staff!" }, { status: 403 });
    }

    const update: Record<string, any> = { updatedAt: new Date() };
    if (body.targetVolume !== undefined) update.targetVolume = Number(body.targetVolume);
    if (body.unit !== undefined)         update.unit = body.unit;
    if (body.depreciationMethod !== undefined) update.depreciationMethod = body.depreciationMethod;
    if (body.depreciationValue !== undefined)   update.depreciationValue = body.depreciationValue.toString();
    if (body.fixedCostMethod !== undefined)     update.fixedCostMethod = body.fixedCostMethod;
    if (body.fixedCostValue !== undefined)       update.fixedCostValue = body.fixedCostValue.toString();
    if (body.overheadHo !== undefined)           update.overheadHo = body.overheadHo.toString();
    if (body.notes !== undefined)                update.notes = body.notes || null;
    if (body.status !== undefined)              update.status = body.status;

    const [updatedRab] = await db.update(rabs).set(update).where(eq(rabs.id, id)).returning();

    // Update BOM jika dikirim
    if (body.bomItems) {
      await db.delete(bomMaterials).where(eq(bomMaterials.rabId, id));
      const validBom = body.bomItems.filter((b: any) => b.materialName && b.estimatedQty);
      if (validBom.length > 0) {
        const bomData = validBom.map((item: any) => ({
          rabId: id,
          materialId: item.materialId || null,
          materialName: item.materialName,
          estimatedQty: item.estimatedQty.toString(),
          unit: item.unit,
          procurementType: item.procurementType || "BELI_BARU",
          unitPrice: item.unitPrice?.toString() || "0",
          notes: item.notes || null
        }));
        await db.insert(bomMaterials).values(bomData);
      }
    }

    // Update Manpower jika dikirim
    if (body.manpowerItems) {
      await db.delete(manpowerPlans).where(eq(manpowerPlans.rabId, id));
      const validMp = body.manpowerItems.filter((m: any) => m.roleDescription && m.headcount);
      if (validMp.length > 0) {
        const mpData = validMp.map((mp: any) => ({
          rabId: id,
          sourceType: mp.sourceType || "INTERNAL",
          headcount: Number(mp.headcount),
          roleDescription: mp.roleDescription,
          dailyRate: mp.dailyRate?.toString() || "0",
          notes: mp.notes || null
        }));
        await db.insert(manpowerPlans).values(mpData);
      }
    }

    const finalBoms = await db.select().from(bomMaterials).where(eq(bomMaterials.rabId, id));
    const finalMps = await db.select().from(manpowerPlans).where(eq(manpowerPlans.rabId, id));

    return NextResponse.json({ ...updatedRab, bomItems: finalBoms, manpowerItems: finalMps });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal update RAB", details: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "staff") return NextResponse.json({ error: "Hanya Admin/Manager yang bisa menghapus RAB!" }, { status: 403 });

  const { id } = await params;

  try {
    await db.delete(bomMaterials).where(eq(bomMaterials.rabId, id));
    await db.delete(manpowerPlans).where(eq(manpowerPlans.rabId, id));
    await db.delete(rabs).where(eq(rabs.id, id));

    return NextResponse.json({ success: true, message: "RAB Berhasil Dihapus Bersih!" });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal hapus RAB", details: err.message }, { status: 500 });
  }
}
