import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports, finishedGoods } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// 🔥 FUNGSI KOREKSI BKH (MENYESUAIKAN STOK FG) 🔥
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();

    // 1. Cari BKH lama untuk membandingkan angkanya
    const oldReport = await db.select().from(dailyReports).where(eq(dailyReports.id, id)).limit(1);
    if (oldReport.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const oldFgQty = oldReport[0].fgQty;
    const newFgQty = body.fgQuantity !== undefined ? Number(body.fgQuantity) : oldFgQty;

    // 2. Update Laporan BKH
    const [updated] = await db.update(dailyReports).set({
      fgQty: newFgQty,
      damagedQty: body.damagedQuantity !== undefined ? Number(body.damagedQuantity) : oldReport[0].damagedQty,
      returnQty: body.returnQuantity !== undefined ? Number(body.returnQuantity) : oldReport[0].returnQty,
      notes: body.notes !== undefined ? body.notes : oldReport[0].notes,
    }).where(eq(dailyReports.id, id)).returning();

    // 3. Update Stok Gudang FG (Berdasarkan Selisih)
    // Contoh: Kemarin lapor 10, sekarang direvisi jadi 12. Selisih = +2. Gudang nambah 2.
    const selisih = newFgQty - oldFgQty;
    if (selisih !== 0) {
      const existingFg = await db.select().from(finishedGoods).where(eq(finishedGoods.planId, oldReport[0].planId)).limit(1);
      if (existingFg.length > 0) {
        await db.update(finishedGoods)
          .set({ stock: existingFg[0].stock + selisih })
          .where(eq(finishedGoods.id, existingFg[0].id));
      }
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🔥 FUNGSI HAPUS BKH (MEMOTONG STOK FG) 🔥
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;

    // Cari BKH lama untuk tahu berapa stok yang harus ditarik dari gudang
    const oldReport = await db.select().from(dailyReports).where(eq(dailyReports.id, id)).limit(1);

    if (oldReport.length > 0) {
       const oldFgQty = oldReport[0].fgQty;
       const existingFg = await db.select().from(finishedGoods).where(eq(finishedGoods.planId, oldReport[0].planId)).limit(1);
       
       if (existingFg.length > 0) {
         // Kurangi stok karena laporannya dihapus
         await db.update(finishedGoods)
           .set({ stock: existingFg[0].stock - oldFgQty })
           .where(eq(finishedGoods.id, existingFg[0].id));
       }
    }

    await db.delete(dailyReports).where(eq(dailyReports.id, id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}