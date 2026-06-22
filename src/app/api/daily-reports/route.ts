export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports, finishedGoods, productionPlans, contracts, projects, fgItems } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc, sql } from "drizzle-orm";

// FUNGSI MENGAMBIL DATA MONITORING
export async function GET() {
  try {
    const plans = await db.select({
      id: productionPlans.id,
      spkNumber: productionPlans.spkNumber,
      targetVolume: productionPlans.targetVolume,
      unit: productionPlans.unit,
      commenceDate: productionPlans.commenceDate,
      deadlineDate: productionPlans.deadlineDate,
      status: productionPlans.status,
      contractId: productionPlans.contractId,
    }).from(productionPlans).orderBy(desc(productionPlans.createdAt));

    const allReports = await db.select().from(dailyReports);
    const allContracts = await db.select().from(contracts);
    const allProjects = await db.select().from(projects);
    const allFgItems = await db.select().from(fgItems).orderBy(desc(fgItems.createdAt));

    const result = plans.map(plan => {
      const planReports = allReports.filter(r => r.planId === plan.id);
      const planFgItems = allFgItems.filter(i => i.planId === plan.id);
      const contract = allContracts.find(c => c.id === plan.contractId);
      const project = contract ? allProjects.find(p => p.id === contract.projectId) : null;
      return { 
        ...plan, 
        projectName: project ? (project.projectCode ? `[${project.projectCode}] - ${project.projectName}` : project.projectName) : "Proyek Tanpa Nama",
        dailyReports: planReports, 
        fgItems: planFgItems,
        contract: { project: project } 
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🔥 FUNGSI MENYIMPAN BKH & OTOMATIS MASUK GUDANG FG & GENERATE FG_ITEMS INDIVIDUAL 🔥
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // 1. Simpan Laporan BKH
    const [report] = await db.insert(dailyReports).values({
      planId: body.planId,
      reportedBy: session.userId,
      reportDate: new Date(body.reportDate),
      fgQty: Number(body.fgQuantity),
      damagedQty: Number(body.damagedQuantity),
      returnQty: Number(body.returnQuantity),
      notes: body.notes || null,
    }).returning();

    // Cari info SPK dan Proyeknya
    const planInfo = await db.select({
      spkNumber: productionPlans.spkNumber,
      unit: productionPlans.unit,
      projectName: projects.projectName
    })
    .from(productionPlans)
    .innerJoin(contracts, eq(productionPlans.contractId, contracts.id))
    .innerJoin(projects, eq(contracts.projectId, projects.id))
    .where(eq(productionPlans.id, body.planId))
    .limit(1);

    // 2. OTOMATIS TAMBAH STOK BARANG JADI (FG) KE GUDANG PUSAT
    if (Number(body.fgQuantity) > 0 && planInfo.length > 0) {
      const info = planInfo[0];
      const productName = `Precast - ${info.projectName} (${info.spkNumber})`;

      // Cek apakah SPK ini sudah punya slot di Gudang Barang Jadi
      const existingFg = await db.select().from(finishedGoods).where(eq(finishedGoods.planId, body.planId)).limit(1);

      if (existingFg.length > 0) {
        // Kalau sudah ada, Update Stoknya (Ditambah)
        await db.update(finishedGoods)
          .set({ stock: existingFg[0].stock + Number(body.fgQuantity) })
          .where(eq(finishedGoods.id, existingFg[0].id));
      } else {
        // Kalau belum ada, Buat Slot Gudang Baru
        await db.insert(finishedGoods).values({
          planId: body.planId,
          productName: productName,
          stock: Number(body.fgQuantity),
          unit: info.unit
        });
      }
    }

    // 3. 🔥 OTOMATIS GENERATE DATA BARANG PRODUKSI INDIVIDUAL (fgItems) 🔥
    const fgQtyNum = Number(body.fgQuantity) || 0;
    const dmgQtyNum = Number(body.damagedQuantity) || 0;
    const totalItemsToInsert = fgQtyNum + dmgQtyNum;

    if (totalItemsToInsert > 0 && planInfo.length > 0) {
      const info = planInfo[0];
      
      // Ambil count fg_items SPK ini untuk running number
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(fgItems)
        .where(eq(fgItems.planId, body.planId));
      const currentCount = countResult[0]?.count || 0;

      const spkClean = (info.spkNumber || "SPK").replace(/[^a-zA-Z0-9]/g, "");
      const dateClean = new Date(body.reportDate).toISOString().slice(0, 10).replace(/-/g, "");
      
      const newItems = [];
      let running = currentCount + 1;
      
      // Insert Good Items
      for (let i = 0; i < fgQtyNum; i++) {
        const itemCode = `KB-${spkClean}-${dateClean}-${String(running).padStart(4, "0")}`;
        newItems.push({
          planId: body.planId,
          itemCode,
          productName: `Precast - ${info.projectName}`,
          status: "GOOD",
          defectReason: null,
          castingDate: new Date(body.reportDate),
        });
        running++;
      }
      
      // Insert Reject Items
      for (let i = 0; i < dmgQtyNum; i++) {
        const itemCode = `KB-${spkClean}-${dateClean}-${String(running).padStart(4, "0")}`;
        newItems.push({
          planId: body.planId,
          itemCode,
          productName: `Precast - ${info.projectName}`,
          status: "REJECT",
          defectReason: body.notes || "Cacat produksi saat pencetakan",
          castingDate: new Date(body.reportDate),
        });
        running++;
      }
      
      if (newItems.length > 0) {
        await db.insert(fgItems).values(newItems);
      }
    }

    return NextResponse.json(report, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}