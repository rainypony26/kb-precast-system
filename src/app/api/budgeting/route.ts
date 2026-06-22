import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { budgetRab, budgetRealization, productionPlans, contracts, projects } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";
import { sendTelegramNotification } from "@/lib/telegram";

function formatNumber(num: number) {
  return new Intl.NumberFormat("id-ID").format(num);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { type } = body; // 'RAB' atau 'REALISASI'

    if (type === "RAB") {
      const [newRab] = await db.insert(budgetRab).values({
        planId: body.planId,
        category: body.category,
        description: body.description,
        plannedAmount: body.amount.toString(),
        notes: body.notes
      }).returning();
      return NextResponse.json(newRab, { status: 201 });
    } 
    
    if (type === "REALISASI") {
      const [newReal] = await db.insert(budgetRealization).values({
        rabId: body.rabId,
        realizedAmount: body.amount.toString(),
        realizationDate: new Date(body.date),
        notes: body.notes
      }).returning();

      // 🔥 CEK OVER-BUDGET SETELAH REALISASI DITAMBAHKAN
      try {
        const [rabItem] = await db
          .select({ planId: budgetRab.planId })
          .from(budgetRab)
          .where(eq(budgetRab.id, body.rabId))
          .limit(1);

        if (rabItem && rabItem.planId) {
          const planId = rabItem.planId;

          const plannedRes = await db
            .select({ totalPlanned: sql<number>`sum(${budgetRab.plannedAmount})::float` })
            .from(budgetRab)
            .where(eq(budgetRab.planId, planId));

          const realizedRes = await db
            .select({ totalRealized: sql<number>`sum(${budgetRealization.realizedAmount})::float` })
            .from(budgetRealization)
            .leftJoin(budgetRab, eq(budgetRealization.rabId, budgetRab.id))
            .where(eq(budgetRab.planId, planId));

          const totalPlanned = plannedRes[0]?.totalPlanned || 0;
          const totalRealized = realizedRes[0]?.totalRealized || 0;

          if (totalPlanned > 0) {
            const ratio = totalRealized / totalPlanned;
            if (ratio >= 0.90) {
              const [plan] = await db
                .select({
                  spkNumber: productionPlans.spkNumber,
                  projectName: projects.projectName,
                })
                .from(productionPlans)
                .innerJoin(contracts, eq(productionPlans.contractId, contracts.id))
                .innerJoin(projects, eq(contracts.projectId, projects.id))
                .where(eq(productionPlans.id, planId))
                .limit(1);

              if (plan) {
                const percentStr = (ratio * 100).toFixed(1);
                const message = `🚨 <b>WARNING BUDGET REALISASI SPK!</b>\n\nRealisasi biaya SPK <b>${plan.spkNumber}</b> untuk proyek <b>${plan.projectName}</b> telah mencapai <b>${percentStr}%</b> dari total pagu anggaran.\n\n<b>Pagu Anggaran:</b> Rp ${formatNumber(totalPlanned)}\n<b>Total Realisasi:</b> Rp ${formatNumber(totalRealized)}`;
                await sendTelegramNotification(message);
              }
            }
          }
        }
      } catch (tgErr) {
        console.error("Gagal melakukan pengecekan budget pada realisasi:", tgErr);
      }

      return NextResponse.json(newReal, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid Type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}