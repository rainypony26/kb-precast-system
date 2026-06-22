export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseRequests } from "@/db/schema";
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
    const update: any = {};
    if (body.status) update.status = body.status; // Untuk ACC / REJECT
    if (body.notes !== undefined) update.notes = body.notes;

    const [updatedPR] = await db.update(purchaseRequests)
      .set(update)
      .where(eq(purchaseRequests.id, id))
      .returning();

    return NextResponse.json(updatedPR);
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal update status PR: " + err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Pengaman tambahan
  if (session.role !== "admin" && session.role !== "manager") {
    return NextResponse.json({ error: "Hanya Admin/Manager yang bisa hapus PR!" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await db.delete(purchaseRequests).where(eq(purchaseRequests.id, id));
    return NextResponse.json({ success: true, message: "Dokumen PR berhasil dihapus!" });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal hapus PR: " + err.message }, { status: 500 });
  }
}