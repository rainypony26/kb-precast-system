import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id } = await params;

    const updated = await db
      .update(dailyReports)
      .set({
        fgQty: Number(body.fgQuantity ?? 0),
        damagedQty: Number(body.damagedQuantity ?? 0),
        returnQty: Number(body.returnQuantity ?? 0),
        notes: body.notes || null,
      })
      .where(eq(dailyReports.id, id))
      .returning();

    if (!updated.length) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    return NextResponse.json(updated[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Hanya Admin yang bisa menghapus!" }, { status: 403 });
    }

    const { id } = await params;
    const deleted = await db.delete(dailyReports).where(eq(dailyReports.id, id)).returning();

    if (!deleted.length) return NextResponse.json({ error: "Gagal menghapus data" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}