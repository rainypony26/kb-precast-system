export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { finishedGoods, fgOutbound } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { fgId, qty, recipient, deliveryNumber, notes } = body;

    if (!fgId || !qty || !recipient) {
      return NextResponse.json({ error: "Data tidak lengkap! (Jumlah & Penerima wajib diisi)" }, { status: 400 });
    }

    // 1. Catat ke histori keluar
    const [newOutbound] = await db.insert(fgOutbound).values({
      fgId,
      qty: Number(qty),
      recipient: recipient,
      deliveryNumber: deliveryNumber || null,
      notes: notes || null,
      exitDate: new Date(),
    }).returning();

    // 2. Kurangi stok di Gudang Barang Jadi (FG)
    await db.update(finishedGoods)
      .set({ stock: sql`${finishedGoods.stock} - ${Number(qty)}` })
      .where(eq(finishedGoods.id, fgId));

    return NextResponse.json(newOutbound, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal mengeluarkan FG: " + err.message }, { status: 500 });
  }
}