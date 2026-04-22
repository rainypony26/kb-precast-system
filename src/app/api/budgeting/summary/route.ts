import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productionPlans, budgetRab, budgetRealization, contracts, projects } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Ambil data SPK
    const plans = await db
      .select({
        id: productionPlans.id,
        spkNumber: productionPlans.spkNumber,
        projectName: projects.projectName,
        customerName: projects.customerName,
        status: productionPlans.status,
      })
      .from(productionPlans)
      .leftJoin(contracts, eq(productionPlans.contractId, contracts.id))
      .leftJoin(projects, eq(contracts.projectId, projects.id))
      .orderBy(desc(productionPlans.createdAt));

    // 2. Ambil RAB Detail
    const allRab = await db.select().from(budgetRab);
    
    // 3. Ambil Realisasi Detail
    const allRealizations = await db
      .select({
        id: budgetRealization.id,
        rabId: budgetRealization.rabId,
        amount: budgetRealization.realizedAmount,
        date: budgetRealization.realizationDate,
        notes: budgetRealization.notes,
        planId: budgetRab.planId
      })
      .from(budgetRealization)
      .leftJoin(budgetRab, eq(budgetRealization.rabId, budgetRab.id))
      .orderBy(desc(budgetRealization.realizationDate));

    // 4. Mapping Data Terperinci
    const formattedData = plans.map(plan => {
      const planRab = allRab.filter(r => r.planId === plan.id);
      const planReal = allRealizations.filter(re => re.planId === plan.id);

      const totalPlanned = planRab.reduce((s, r) => s + Number(r.plannedAmount), 0);
      const totalRealized = planReal.reduce((s, r) => s + Number(r.amount), 0);

      // Breakdown per kategori
      const categories = ["MATERIAL", "MANPOWER", "EQUIPMENT", "OVERHEAD", "LAINNYA"].map(cat => {
        const catPlanned = planRab.filter(r => r.category === cat).reduce((s, r) => s + Number(r.plannedAmount), 0);
        const catRealized = planReal.filter(re => {
          const rabItem = planRab.find(r => r.id === re.rabId);
          return rabItem?.category === cat;
        }).reduce((s, r) => s + Number(r.amount), 0);

        return { category: cat, planned: catPlanned, realized: catRealized };
      });

      return {
        ...plan,
        totalPlanned,
        totalRealized,
        usagePercent: totalPlanned > 0 ? (totalRealized / totalPlanned) * 100 : 0,
        remaining: totalPlanned - totalRealized,
        categories,
        history: planReal.slice(0, 5), // 5 transaksi terakhir
        rabItems: planRab // Untuk pilihan di form realisasi
      };
    });

    return NextResponse.json(formattedData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}