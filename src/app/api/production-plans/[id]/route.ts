import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productionPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
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
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status !== undefined)       update.status = body.status;
    if (body.spkNumber !== undefined)    update.spkNumber = body.spkNumber;
    if (body.targetVolume !== undefined) update.targetVolume = Number(body.targetVolume);
    if (body.unit !== undefined)         update.unit = body.unit;
    if (body.commenceDate !== undefined) update.commenceDate = body.commenceDate;
    if (body.deadlineDate !== undefined) update.deadlineDate = body.deadlineDate;
    if (body.notes !== undefined)        update.notes = body.notes || null;

    const [updated] = await db
      .update(productionPlans)
      .set(update)
      .where(eq(productionPlans.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal update SPK" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.delete(productionPlans).where(eq(productionPlans.id, id));
  return NextResponse.json({ success: true });
}