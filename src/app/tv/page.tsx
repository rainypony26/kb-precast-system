export const dynamic = 'force-dynamic';

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { dailyReports, finishedGoods, fgOutbound, productionPlans, contracts, projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import TVClient from "@/components/tv/tv-client";

export default async function TVPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // 1. Ambil seluruh data produksi harian (BKH) untuk hitung statistik global
  const bkhList = await db.select().from(dailyReports);
  
  let totalGood = 0;
  let totalDamaged = 0;
  let totalReturn = 0;
  
  bkhList.forEach(r => {
    totalGood += r.fgQty || 0;
    totalDamaged += r.damagedQty || 0;
    totalReturn += r.returnQty || 0;
  });

  const totalProduced = totalGood + totalDamaged;
  const defectRate = totalProduced > 0 ? parseFloat(((totalDamaged / totalProduced) * 100).toFixed(2)) : 0;

  // 2. Ambil data SPK Aktif dan kemajuannya
  const activePlans = await db
    .select({
      id: productionPlans.id,
      spkNumber: productionPlans.spkNumber,
      targetVolume: productionPlans.targetVolume,
      unit: productionPlans.unit,
      status: productionPlans.status,
      projectName: projects.projectName,
      projectCode: projects.projectCode,
    })
    .from(productionPlans)
    .leftJoin(contracts, eq(productionPlans.contractId, contracts.id))
    .leftJoin(projects, eq(contracts.projectId, projects.id))
    .where(eq(productionPlans.status, "AKTIF"))
    .orderBy(desc(productionPlans.createdAt));

  // Petakan pencapaian produksi harian per SPK aktif
  const activeProjectsData = activePlans.map(plan => {
    const planReports = bkhList.filter(r => r.planId === plan.id);
    let planGood = 0;
    let planDamaged = 0;
    planReports.forEach(r => {
      planGood += r.fgQty || 0;
      planDamaged += r.damagedQty || 0;
    });

    return {
      id: plan.id,
      spkNumber: plan.spkNumber || "SPK-TEMP",
      projectName: plan.projectName ? (plan.projectCode ? `[${plan.projectCode}] - ${plan.projectName}` : plan.projectName) : "Proyek Tanpa Nama",
      targetVolume: plan.targetVolume,
      unit: plan.unit,
      producedGood: planGood,
      producedDamaged: planDamaged,
      progressPercent: plan.targetVolume > 0 ? Math.min(100, Math.round((planGood / plan.targetVolume) * 100)) : 0
    };
  });

  // Hitung monthly target & progress untuk SPK aktif secara global
  let monthlyTarget = 0;
  let monthlyProgress = 0;
  activeProjectsData.forEach(p => {
    monthlyTarget += p.targetVolume;
    monthlyProgress += p.producedGood;
  });

  // 3. Ambil Log Pengiriman DO Terkini (Limit 10 entri)
  const recentDOs = await db
    .select({
      id: fgOutbound.id,
      deliveryNumber: fgOutbound.deliveryNumber,
      recipient: fgOutbound.recipient,
      qty: fgOutbound.qty,
      exitDate: fgOutbound.exitDate,
      notes: fgOutbound.notes,
      productName: finishedGoods.productName,
      projectName: projects.projectName,
      projectCode: projects.projectCode,
      spkNumber: productionPlans.spkNumber,
    })
    .from(fgOutbound)
    .innerJoin(finishedGoods, eq(fgOutbound.fgId, finishedGoods.id))
    .leftJoin(productionPlans, eq(finishedGoods.planId, productionPlans.id))
    .leftJoin(contracts, eq(productionPlans.contractId, contracts.id))
    .leftJoin(projects, eq(contracts.projectId, projects.id))
    .orderBy(desc(fgOutbound.exitDate))
    .limit(10);

  const formattedDOs = recentDOs.map(doLog => ({
    id: doLog.id,
    deliveryNumber: doLog.deliveryNumber || "DO-TEMP",
    recipient: doLog.recipient,
    qty: doLog.qty,
    exitDate: doLog.exitDate.toISOString(), // Pastikan terserialisasi aman untuk client component props
    productName: doLog.productName,
    projectName: doLog.projectName ? (doLog.projectCode ? `[${doLog.projectCode}] - ${doLog.projectName}` : doLog.projectName) : "Proyek Tanpa Nama",
    spkNumber: doLog.spkNumber || "SPK-TEMP",
    notes: doLog.notes || "-"
  }));

  const initialData = {
    globalStats: {
      totalGood,
      totalDamaged,
      totalReturn,
      defectRate,
      monthlyTarget,
      monthlyProgress,
      monthlyProgressPercent: monthlyTarget > 0 ? Math.min(100, Math.round((monthlyProgress / monthlyTarget) * 100)) : 0
    },
    activeProjects: activeProjectsData,
    recentDeliveries: formattedDOs
  };

  return <TVClient initialData={initialData} />;
}
