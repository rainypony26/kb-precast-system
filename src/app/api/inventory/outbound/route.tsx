import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { materials, materialOutbound } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // 1. Cek keberadaan material & stok
    const [currentMaterial] = await db
      .select()
      .from(materials)
      .where(eq(materials.id, body.materialId));

    if (!currentMaterial) {
      return NextResponse.json({ error: "Material tidak ditemukan!" }, { status: 404 });
    }

    const currentStock = parseFloat(currentMaterial.stock || "0");
    const requestedQty = parseFloat(body.qty);

    if (currentStock < requestedQty) {
      return NextResponse.json({ error: "Stok tidak cukup, Bosku!" }, { status: 400 });
    }

    // 2. Simpan riwayat (Values sudah aman karena tipe data exit_date di schema sudah 'timestamp')
    await db.insert(materialOutbound).values({
      materialId: body.materialId,
      recipient: body.recipient,
      qty: requestedQty.toString(),
      exitDate: new Date(body.exitDate), 
      notes: body.notes || null,
    });

    // 3. Update stok (Sequential karena neon-http)
    await db.update(materials)
      .set({ 
        stock: sql`${materials.stock} - ${requestedQty}` 
      })
      .where(eq(materials.id, body.materialId));

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("API Outbound Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}