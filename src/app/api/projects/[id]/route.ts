export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, contracts, productionPlans, bomMaterials, manpowerPlans, dailyReports, finishedGoods, operationalExpenses } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
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
    const update: any = { updatedAt: new Date() };
    if (body.projectName !== undefined)    update.projectName = body.projectName;
    if (body.customerName !== undefined)   update.customerName = body.customerName;
    if (body.picName !== undefined)        update.picName = body.picName;
    if (body.status !== undefined)         update.status = body.status;
    if (body.projectValue !== undefined)   update.projectValue = body.projectValue ? String(body.projectValue) : null;
    if (body.location !== undefined)       update.location = body.location;
    if (body.notes !== undefined)          update.notes = body.notes;

    if (body.tenderDate)      update.tenderDate = new Date(body.tenderDate);
    if (body.estimatedFinish) update.estimatedFinish = new Date(body.estimatedFinish);

    const [updated] = await db.update(projects).set(update).where(eq(projects.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Proyek tidak ditemukan!" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal update proyek", details: err.message }, { status: 500 });
  }
}

// 🔥 MODE NUKLIR PROYEK (SUDAH DITAMBAH BUKU KAS) 🔥
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Hanya Admin yang bisa menghapus proyek!" }, { status: 403 });

  const { id } = await params;

  try {
    const contractList = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.projectId, id));
    
    if (contractList.length > 0) {
      const contractIds = contractList.map(c => c.id);
      const planList = await db.select({ id: productionPlans.id }).from(productionPlans).where(inArray(productionPlans.contractId, contractIds));
      
      if (planList.length > 0) {
        const planIds = planList.map(p => p.id);
        
        await db.delete(bomMaterials).where(inArray(bomMaterials.planId, planIds));
        await db.delete(manpowerPlans).where(inArray(manpowerPlans.planId, planIds));
        await db.delete(dailyReports).where(inArray(dailyReports.planId, planIds));
        await db.delete(finishedGoods).where(inArray(finishedGoods.planId, planIds));
        
        // 🔥 BUKU KAS IKUT DIHAPUS 🔥
        await db.delete(operationalExpenses).where(inArray(operationalExpenses.planId, planIds));
        
        await db.delete(productionPlans).where(inArray(productionPlans.id, planIds));
      }
      
      await db.delete(contracts).where(inArray(contracts.id, contractIds));
    }

    await db.delete(projects).where(eq(projects.id, id));
    
    return NextResponse.json({ success: true, message: "Proyek & Seluruh Isinya Berhasil Dihapus!" });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal menghapus Proyek!", details: err.message }, { status: 500 });
  }
}