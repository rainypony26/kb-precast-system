import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { budgetRab, budgetRealization } from "@/db/schema";
import { getSession } from "@/lib/auth";

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
      return NextResponse.json(newReal, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid Type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}