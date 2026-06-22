export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { materialInbound, materials } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Hanya Admin yang bisa hapus riwayat!" }, { status: 403 });

  const { id } = await params;
  try {
    const inbound = await db.select().from(materialInbound).where(eq(materialInbound.id, id));
    if (!inbound.length) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

    // Revert: Kurangi stok karena batal masuk
    await db.update(materials).set({ stock: sql`${materials.stock} - ${inbound[0].qty}` }).where(eq(materials.id, inbound[0].materialId));
    await db.delete(materialInbound).where(eq(materialInbound.id, id));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}