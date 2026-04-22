import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { materials, materialInbound } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    if (!body.materialId || !body.qty || !body.entryDate) {
      return NextResponse.json({ error: "Data inbound tidak lengkap!" }, { status: 400 });
    }

    const qtyInbound = parseFloat(body.qty);

    // 1. Simpan Riwayat Inbound
    await db.insert(materialInbound).values({
      materialId: body.materialId,
      vendorName: body.vendorName || "Umum",
      qty: qtyInbound.toString(),
      // --- FIX TANGGAL ---
      entryDate: new Date(body.entryDate), 
      // ------------------
      notes: body.notes || null,
    });

    // 2. Update Stok Master
    await db.update(materials)
      .set({ 
        stock: sql`CAST(${materials.stock} AS DECIMAL) + ${qtyInbound}` 
      })
      .where(eq(materials.id, body.materialId));

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("API INBOUND ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}