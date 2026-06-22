export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fgOutbound, finishedGoods } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Hanya Admin yang bisa hapus riwayat!" }, { status: 403 });

  const { id } = await params;
  try {
    const outbound = await db.select().from(fgOutbound).where(eq(fgOutbound.id, id));
    if (!outbound.length) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

    // Revert: Tambah stok FG karena batal dikirim
    await db.update(finishedGoods).set({ stock: sql`${finishedGoods.stock} + ${outbound[0].qty}` }).where(eq(finishedGoods.id, outbound[0].fgId));
    await db.delete(fgOutbound).where(eq(fgOutbound.id, id));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}