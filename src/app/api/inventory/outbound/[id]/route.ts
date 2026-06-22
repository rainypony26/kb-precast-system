export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { materialOutbound, materials } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Hanya Admin yang bisa hapus riwayat!" }, { status: 403 });

  const { id } = await params;
  try {
    const outbound = await db.select().from(materialOutbound).where(eq(materialOutbound.id, id));
    if (!outbound.length) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

    // Revert: Tambah stok karena batal keluar
    await db.update(materials).set({ stock: sql`${materials.stock} + ${outbound[0].qty}` }).where(eq(materials.id, outbound[0].materialId));
    await db.delete(materialOutbound).where(eq(materialOutbound.id, id));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}