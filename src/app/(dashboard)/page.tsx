import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, dailyReports, finishedGoods, fgOutbound, productionPlans, contracts } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import DashboardClient from "@/components/crm/dashboard-client";
import { redirect } from "next/navigation";

async function getStats() {
  try {
    const result = await db
      .select({ status: projects.status, count: sql<number>`count(*)::int` })
      .from(projects)
      .groupBy(projects.status);

    const stats = { 
      TENDER: 0, 
      PENAWARAN: 0, 
      NEGO: 0, 
      PO: 0, 
      KONTRAK: 0, 
      SELESAI: 0, 
      BATAL: 0 
    };

    result.forEach((r) => { 
      if (r.status in stats) {
        stats[r.status as keyof typeof stats] = r.count; 
      }
    });

    return stats;
  } catch (error) { 
    console.error("Error fetching stats:", error);
    return null; 
  }
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // 1. Ambil status proyek untuk pipeline
  const stats = await getStats();

  // 2. Ambil summary produksi dari daily_reports
  const reportsSummary = await db
    .select({
      totalFg: sql<number>`sum(${dailyReports.fgQty})::int`,
      totalDamaged: sql<number>`sum(${dailyReports.damagedQty})::int`,
    })
    .from(dailyReports);
  
  const totalFg = reportsSummary[0]?.totalFg ?? 0;
  const totalDamaged = reportsSummary[0]?.totalDamaged ?? 0;
  const defectRate = (totalFg + totalDamaged) > 0 ? (totalDamaged / (totalFg + totalDamaged)) * 100 : 0;

  // 3. Ambil total realisasi biaya aktual & target volume dari production_plans (SPK)
  const actualSummary = await db
    .select({
      material: sql<number>`sum(${productionPlans.actualMaterial})::float`,
      manpower: sql<number>`sum(${productionPlans.actualManpower})::float`,
      overhead: sql<number>`sum(${productionPlans.actualOverhead})::float`,
      totalTargetSpk: sql<number>`sum(${productionPlans.targetVolume})::int`,
    })
    .from(productionPlans);

  const totalActual = (actualSummary[0]?.material ?? 0) + (actualSummary[0]?.manpower ?? 0) + (actualSummary[0]?.overhead ?? 0);
  const totalTargetSpk = actualSummary[0]?.totalTargetSpk ?? 0;

  // 4. Ambil 5 laporan harian BKH terbaru
  const recentBkh = await db
    .select({
      id: dailyReports.id,
      reportDate: dailyReports.reportDate,
      fgQty: dailyReports.fgQty,
      damagedQty: dailyReports.damagedQty,
      notes: dailyReports.notes,
      spkNumber: productionPlans.spkNumber,
      projectName: projects.projectName,
    })
    .from(dailyReports)
    .innerJoin(productionPlans, eq(dailyReports.planId, productionPlans.id))
    .innerJoin(contracts, eq(productionPlans.contractId, contracts.id))
    .innerJoin(projects, eq(contracts.projectId, projects.id))
    .orderBy(desc(dailyReports.reportDate))
    .limit(5);

  // 5. Ambil 5 pengiriman (DO) terbaru
  const recentDeliveries = await db
    .select({
      id: fgOutbound.id,
      deliveryNumber: fgOutbound.deliveryNumber,
      recipient: fgOutbound.recipient,
      qty: fgOutbound.qty,
      exitDate: fgOutbound.exitDate,
      productName: finishedGoods.productName,
      projectName: projects.projectName,
    })
    .from(fgOutbound)
    .innerJoin(finishedGoods, eq(fgOutbound.fgId, finishedGoods.id))
    .leftJoin(productionPlans, eq(finishedGoods.planId, productionPlans.id))
    .leftJoin(contracts, eq(productionPlans.contractId, contracts.id))
    .leftJoin(projects, eq(contracts.projectId, projects.id))
    .orderBy(desc(fgOutbound.exitDate))
    .limit(5);

  // 6. Ambil data cetak 7 hari terakhir untuk grafik
  let chartData: { date: string; fgQty: number; damagedQty: number }[] = [];
  try {
    const dailyProduction = await db
      .select({
        date: sql<string>`to_char(${dailyReports.reportDate}, 'DD Mon')`,
        fgQty: sql<number>`sum(${dailyReports.fgQty})::int`,
        damagedQty: sql<number>`sum(${dailyReports.damagedQty})::int`,
      })
      .from(dailyReports)
      .groupBy(sql`to_char(${dailyReports.reportDate}, 'DD Mon')`)
      .limit(7);

    chartData = dailyProduction.map(d => ({
      date: d.date || "-",
      fgQty: d.fgQty || 0,
      damagedQty: d.damagedQty || 0
    }));
  } catch (err) {
    console.error("Error fetching daily production for chart:", err);
  }

  // No fallback to keep chart empty if no production reports exist

  return (
    <DashboardClient
      stats={stats}
      totalFg={totalFg}
      totalDamaged={totalDamaged}
      defectRate={defectRate}
      totalActual={totalActual}
      totalTargetSpk={totalTargetSpk}
      recentBkh={recentBkh}
      recentDeliveries={recentDeliveries}
      chartData={chartData}
      session={session}
    />
  );
}