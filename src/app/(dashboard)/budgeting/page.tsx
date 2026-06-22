export const dynamic = 'force-dynamic';

import { db } from "@/db";
import { productionPlans, contracts, projects, bomMaterials, manpowerPlans, operationalExpenses, purchaseRequests, rabs, dailyReports } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import BudgetingClient from "@/components/crm/budgeting-client";

export default async function BudgetingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    // 1. Ambil semua RAB yang APPROVED beserta info kontrak & proyek
    const approvedRabs = await db
      .select({
        id: rabs.id,
        rabNumber: rabs.rabNumber,
        targetVolume: rabs.targetVolume,
        unit: rabs.unit,
        depreciationMethod: rabs.depreciationMethod,
        depreciationValue: rabs.depreciationValue,
        fixedCostMethod: rabs.fixedCostMethod,
        fixedCostValue: rabs.fixedCostValue,
        overheadHo: rabs.overheadHo,
        status: rabs.status,
        projectId: projects.id,
        projectName: projects.projectName,
        projectCode: projects.projectCode,
        customerName: projects.customerName,
        contractValue: contracts.contractValue,
        startDate: contracts.startDate,
        endDate: contracts.endDate,
      })
      .from(rabs)
      .innerJoin(contracts, eq(rabs.contractId, contracts.id))
      .innerJoin(projects, eq(contracts.projectId, projects.id))
      .where(eq(rabs.status, "APPROVED"))
      .orderBy(desc(rabs.createdAt));

    // 2. Ambil seluruh SPK (Production Plans)
    const rawPlans = await db
      .select({
        id: productionPlans.id,
        spkNumber: productionPlans.spkNumber,
        status: productionPlans.status,
        targetVolume: productionPlans.targetVolume,
        overheadPercentage: productionPlans.overheadPercentage,
        actualMaterial: productionPlans.actualMaterial, 
        actualManpower: productionPlans.actualManpower, 
        actualOverhead: productionPlans.actualOverhead, 
        projectId: projects.id,
        projectName: projects.projectName,
        projectCode: projects.projectCode,
        customerName: projects.customerName,
        contractValue: contracts.contractValue,
        startDate: contracts.startDate,
        endDate: contracts.endDate,
        rabId: productionPlans.rabId,
      })
      .from(productionPlans)
      .innerJoin(contracts, eq(productionPlans.contractId, contracts.id))
      .innerJoin(projects, eq(contracts.projectId, projects.id))
      .orderBy(desc(productionPlans.createdAt));

    // 3. Ambil data pendukung (BOM, Manpower, Expenses, PR)
    const allBoms = await db.select().from(bomMaterials);
    const allMps = await db.select().from(manpowerPlans);
    const allExpenses = await db.select().from(operationalExpenses).orderBy(desc(operationalExpenses.expenseDate));
    const allPRs = await db.select().from(purchaseRequests).orderBy(desc(purchaseRequests.requestDate));
    const allReports = await db.select().from(dailyReports);

    const financialData: any[] = [];

    // 4. Proses data berdasarkan RAB Approved
    approvedRabs.forEach(rab => {
      // Hitung budget Bahan Baku (BOM)
      const rabBoms = allBoms.filter(b => b.rabId === rab.id);
      const rabMaterial = rabBoms.reduce((sum, item) => {
        const qty = parseFloat(item.estimatedQty || "0");
        const price = parseFloat(item.unitPrice || "0");
        return sum + (qty * price);
      }, 0);

      // Hitung budget Tenaga Kerja (Manpower)
      const rabMps = allMps.filter(m => m.rabId === rab.id);
      const rabManpower = rabMps.reduce((sum, item) => {
        const headcount = parseFloat(String(item.headcount) || "0");
        const rate = parseFloat(item.dailyRate || "0");
        return sum + (headcount * rate * 30);
      }, 0);

      // Hitung Biaya Operasional / Overhead terstruktur
      const vol = rab.targetVolume || 1;
      const ohHo = parseFloat(rab.overheadHo || "0");

      let depreciation = 0;
      const depVal = parseFloat(rab.depreciationValue || "0");
      if (rab.depreciationMethod === "DIRECT") {
        depreciation = depVal;
      } else {
        let days = 30;
        if (rab.startDate && rab.endDate) {
          const diff = new Date(rab.endDate).getTime() - new Date(rab.startDate).getTime();
          days = Math.ceil(diff / (1000 * 60 * 60 * 24)) || 30;
        }
        depreciation = depVal * days;
      }

      let fixedCost = 0;
      const fcVal = parseFloat(rab.fixedCostValue || "0");
      if (rab.fixedCostMethod === "DIRECT") {
        fixedCost = fcVal;
      } else {
        fixedCost = fcVal * vol;
      }

      const rabOverhead = ohHo + depreciation + fixedCost;
      const totalRab = rabMaterial + rabManpower + rabOverhead;

      // Cari SPK yang terhubung dengan RAB ini
      const associatedPlans = rawPlans.filter(p => p.rabId === rab.id);
      
      let actualMaterial = 0;
      let actualManpower = 0;
      let actualOverhead = 0;
      let expenses: any[] = [];
      let purchaseRequests: any[] = [];
      const spks: any[] = [];
      let isRabActive = false;
      let totalFG = 0;

      associatedPlans.forEach(plan => {
        actualMaterial += Number(plan.actualMaterial) || 0;
        actualManpower += Number(plan.actualManpower) || 0;
        actualOverhead += Number(plan.actualOverhead) || 0;

        if (plan.status === "AKTIF") {
          isRabActive = true;
        }

        const planExpenses = allExpenses
          .filter(e => e.planId === plan.id)
          .map(e => ({ ...e, spkNumber: plan.spkNumber }));
        expenses = [...expenses, ...planExpenses];

        const planPRs = allPRs
          .filter(pr => pr.planId === plan.id)
          .map(pr => ({ ...pr, spkNumber: plan.spkNumber }));
        purchaseRequests = [...purchaseRequests, ...planPRs];

        // Hitung realisasi FG dari dailyReports
        const planReports = allReports.filter(r => r.planId === plan.id);
        const planFG = planReports.reduce((sum, r) => sum + (Number(r.fgQty) || 0), 0);
        totalFG += planFG;

        spks.push({
          id: plan.id,
          spkNumber: plan.spkNumber || "-",
          targetVolume: plan.targetVolume,
          totalRab: 0, 
          totalActual: (Number(plan.actualMaterial) || 0) + (Number(plan.actualManpower) || 0) + (Number(plan.actualOverhead) || 0),
          fgQty: planFG
        });
      });

      // Urutkan histori kas & PR
      expenses.sort((a, b) => new Date(b.expenseDate || 0).getTime() - new Date(a.expenseDate || 0).getTime());
      purchaseRequests.sort((a, b) => new Date(b.requestDate || 0).getTime() - new Date(a.requestDate || 0).getTime());

      financialData.push({
        id: rab.id,
        rabNumber: rab.rabNumber,
        projectName: rab.projectCode ? `[${rab.projectCode}] - ${rab.projectName}` : rab.projectName,
        customerName: rab.customerName,
        status: isRabActive ? "AKTIF" : "SELESAI",
        targetVolume: rab.targetVolume,
        unit: rab.unit,
        rabMaterial,
        rabManpower,
        rabOverhead,
        totalRab,
        actualMaterial,
        actualManpower,
        actualOverhead,
        totalActual: actualMaterial + actualManpower + actualOverhead,
        expenses,
        purchaseRequests,
        spks,
        totalFG
      });
    });

    // 5. Proses SPK Manual / Lama (yang tidak memiliki rabId)
    // Dikelompokkan per proyek sebagai fallback
    const manualPlansGroup: Record<string, any> = {};

    const manualPlans = rawPlans.filter(p => !p.rabId);
    manualPlans.forEach(plan => {
      const pId = plan.projectId;
      if (!manualPlansGroup[pId]) {
        manualPlansGroup[pId] = {
          id: `manual-${pId}`,
          rabNumber: "MANUAL",
          projectName: plan.projectCode ? `[${plan.projectCode}] - ${plan.projectName}` : plan.projectName,
          customerName: plan.customerName,
          status: "SELESAI",
          targetVolume: 0,
          unit: "pcs",
          rabMaterial: 0,
          rabManpower: 0,
          rabOverhead: 0,
          totalRab: 0,
          actualMaterial: 0,
          actualManpower: 0,
          actualOverhead: 0,
          totalActual: 0,
          expenses: [],
          purchaseRequests: [],
          spks: [],
          totalFG: 0
        };
      }

      const grp = manualPlansGroup[pId];
      if (plan.status === "AKTIF") {
        grp.status = "AKTIF";
      }

      grp.targetVolume += plan.targetVolume || 0;
      grp.actualMaterial += Number(plan.actualMaterial) || 0;
      grp.actualManpower += Number(plan.actualManpower) || 0;
      grp.actualOverhead += Number(plan.actualOverhead) || 0;
      grp.totalActual = grp.actualMaterial + grp.actualManpower + grp.actualOverhead;

      // Hitung budget manual jika ada BOM/manpower tertera pada SPK (tanpa RAB)
      const planBoms = allBoms.filter(b => b.planId === plan.id && !b.rabId);
      const planMps = allMps.filter(m => m.planId === plan.id && !m.rabId);

      const rMat = planBoms.reduce((sum, item) => sum + (parseFloat(item.estimatedQty || "0") * parseFloat(item.unitPrice || "0")), 0);
      const rMan = planMps.reduce((sum, item) => sum + (parseFloat(String(item.headcount) || "0") * parseFloat(item.dailyRate || "0") * 30), 0);
      grp.rabMaterial += rMat;
      grp.rabManpower += rMan;
      grp.totalRab = grp.rabMaterial + grp.rabManpower + grp.rabOverhead;

      const planExpenses = allExpenses
        .filter(e => e.planId === plan.id)
        .map(e => ({ ...e, spkNumber: plan.spkNumber }));
      grp.expenses = [...grp.expenses, ...planExpenses];

      const planPRs = allPRs
        .filter(pr => pr.planId === plan.id)
        .map(pr => ({ ...pr, spkNumber: plan.spkNumber }));
      grp.purchaseRequests = [...grp.purchaseRequests, ...planPRs];

      // Hitung realisasi FG dari dailyReports
      const planReports = allReports.filter(r => r.planId === plan.id);
      const planFG = planReports.reduce((sum, r) => sum + (Number(r.fgQty) || 0), 0);
      grp.totalFG += planFG;

      grp.spks.push({
        id: plan.id,
        spkNumber: plan.spkNumber || "-",
        targetVolume: plan.targetVolume,
        totalRab: rMat + rMan,
        totalActual: (Number(plan.actualMaterial) || 0) + (Number(plan.actualManpower) || 0) + (Number(plan.actualOverhead) || 0),
        fgQty: planFG
      });
    });

    // Urutkan histori & gabungkan ke financialData
    Object.values(manualPlansGroup).forEach((grp: any) => {
      grp.expenses.sort((a: any, b: any) => new Date(b.expenseDate || 0).getTime() - new Date(a.expenseDate || 0).getTime());
      grp.purchaseRequests.sort((a: any, b: any) => new Date(b.requestDate || 0).getTime() - new Date(a.requestDate || 0).getTime());
      financialData.push(grp);
    });

    return (
      <div className="p-8">
        <BudgetingClient initialData={financialData} session={session} />
      </div>
    );
  } catch (error: any) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-500/10 border border-red-500 p-6 rounded-2xl max-w-2xl mx-auto mt-10">
          <h1 className="text-xl font-black text-red-500 mb-2">ERROR DATABASE!</h1>
          <p className="text-red-700">{error.message}</p>
        </div>
      </div>
    );
  }
}