import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { operationalExpenses, productionPlans, budgetRab, contracts, projects } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { sendTelegramNotification } from "@/lib/telegram";

function formatNumber(num: number) {
  return new Intl.NumberFormat("id-ID").format(num);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { planId, expenseType, amount, notes, expenseDate } = body;

    if (!planId || !expenseType || !amount) {
      return NextResponse.json({ error: "Data pengeluaran tidak lengkap!" }, { status: 400 });
    }

    // 1. CATAT KE BUKU KAS (Histori)
    const [newExpense] = await db.insert(operationalExpenses).values({
      planId,
      expenseType, // Wajib: "MATERIAL", "MANPOWER", atau "OVERHEAD"
      amount: Number(amount),
      notes: notes || null,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
    }).returning();

    // 2. OTOMATIS TAMBAHKAN TOTALNYA KE INDUK SPK
    if (expenseType === "MATERIAL") {
      await db.update(productionPlans).set({ actualMaterial: sql`${productionPlans.actualMaterial} + ${Number(amount)}` }).where(eq(productionPlans.id, planId));
    } else if (expenseType === "MANPOWER") {
      await db.update(productionPlans).set({ actualManpower: sql`${productionPlans.actualManpower} + ${Number(amount)}` }).where(eq(productionPlans.id, planId));
    } else if (expenseType === "OVERHEAD") {
      await db.update(productionPlans).set({ actualOverhead: sql`${productionPlans.actualOverhead} + ${Number(amount)}` }).where(eq(productionPlans.id, planId));
    }

    // 3. 🔥 CEK OVER-BUDGET (Pagu Anggaran SPK dari budget_rab)
    try {
      const budgetResult = await db
        .select({ totalPlanned: sql<number>`sum(${budgetRab.plannedAmount})::float` })
        .from(budgetRab)
        .where(eq(budgetRab.planId, planId));

      const totalPlanned = budgetResult[0]?.totalPlanned || 0;

      if (totalPlanned > 0) {
        // Query data terupdate
        const updatedPlans = await db
          .select({
            actualMaterial: productionPlans.actualMaterial,
            actualManpower: productionPlans.actualManpower,
            actualOverhead: productionPlans.actualOverhead,
            spkNumber: productionPlans.spkNumber,
            projectName: projects.projectName,
          })
          .from(productionPlans)
          .innerJoin(contracts, eq(productionPlans.contractId, contracts.id))
          .innerJoin(projects, eq(contracts.projectId, projects.id))
          .where(eq(productionPlans.id, planId))
          .limit(1);

        if (updatedPlans.length > 0) {
          const plan = updatedPlans[0];
          const totalSpent = (plan.actualMaterial || 0) + (plan.actualManpower || 0) + (plan.actualOverhead || 0);
          const ratio = totalSpent / totalPlanned;
          
          if (ratio >= 0.90) {
            const percentStr = (ratio * 100).toFixed(1);
            const message = `🚨 <b>WARNING BUDGET SPK!</b>\n\nPengeluaran aktual SPK <b>${plan.spkNumber}</b> untuk proyek <b>${plan.projectName}</b> telah mencapai <b>${percentStr}%</b> dari pagu anggaran RAB.\n\n<b>Pagu Anggaran:</b> Rp ${formatNumber(totalPlanned)}\n<b>Total Pengeluaran:</b> Rp ${formatNumber(totalSpent)}`;
            await sendTelegramNotification(message);
          }
        }
      }
    } catch (budgetErr) {
      console.error("Gagal melakukan pengecekan budget:", budgetErr);
    }

    return NextResponse.json(newExpense, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal catat pengeluaran: " + err.message }, { status: 500 });
  }
}