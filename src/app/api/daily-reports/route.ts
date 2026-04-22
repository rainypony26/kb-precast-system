import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports, productionPlans, contracts, projects } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { desc, eq, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rawData = await db
      .select({
        id: productionPlans.id,
        spkNumber: productionPlans.spkNumber,
        status: productionPlans.status,
        targetVolume: productionPlans.targetVolume,
        unit: productionPlans.unit,
        commenceDate: productionPlans.commenceDate,
        deadlineDate: productionPlans.deadlineDate,
        projectName: projects.projectName,
        customerName: projects.customerName,
      })
      .from(productionPlans)
      .leftJoin(contracts, eq(productionPlans.contractId, contracts.id))
      .leftJoin(projects, eq(contracts.projectId, projects.id))
      .orderBy(desc(productionPlans.createdAt));

    if (!rawData.length) return NextResponse.json([]);

    const planIds = rawData.map(p => p.id);
    const reports = await db.select().from(dailyReports).where(inArray(dailyReports.planId, planIds));

    const formattedData = rawData.map(plan => ({
      ...plan,
      dailyReports: reports.filter(r => r.planId === plan.id),
      contract: {
        project: {
          projectName: plan.projectName ?? "Tanpa Proyek",
          customerName: plan.customerName ?? "Umum",
        }
      }
    }));

    return NextResponse.json(formattedData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const fgValue = body.fgQuantity ?? body.fgQty ?? body.fg;

    if (!body.planId || !body.reportDate || fgValue == null) {
      return NextResponse.json({ error: "FG wajib diisi!" }, { status: 400 });
    }

    const [newReport] = await db.insert(dailyReports).values({
      planId: body.planId,
      reportedBy: session.userId,
      reportDate: new Date(body.reportDate),
      fgQty: Number(fgValue),
      damagedQty: Number(body.damagedQuantity ?? 0),
      returnQty: Number(body.returnQuantity ?? 0),
      notes: body.notes || null,
    }).returning();

    return NextResponse.json(newReport, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}