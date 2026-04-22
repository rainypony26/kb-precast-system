import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contracts } from "@/db/schema";
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
    const update: Record<string, unknown> = {};
    if (body.contractNumber !== undefined) update.contractNumber = body.contractNumber;
    if (body.contractValue !== undefined)  update.contractValue = String(body.contractValue);
    if (body.startDate !== undefined)      update.startDate = body.startDate;
    if (body.endDate !== undefined)        update.endDate = body.endDate;
    if (body.notes !== undefined)          update.notes = body.notes || null;

    const [updated] = await db
      .update(contracts)
      .set(update)
      .where(eq(contracts.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal update kontrak" }, { status: 500 });
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
  await db.delete(contracts).where(eq(contracts.id, id));
  return NextResponse.json({ success: true });
}