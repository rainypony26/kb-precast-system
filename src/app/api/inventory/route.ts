import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryLog } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // 1. Validasi super ketat (Jangan kasih lolos kalau ada yang kosong)
    if (!body.planId || !body.bomId || !body.qty || !body.transactionType || !body.transactionDate) {
      return NextResponse.json({ 
        error: "Data tidak lengkap! Pastikan planId, bomId, qty, type, dan date terisi." 
      }, { status: 400 });
    }

    // 2. Simpan ke database
    const [newLog] = await db
      .insert(inventoryLog)
      .values({
        planId: body.planId, 
        bomId: body.bomId,   
        transactionType: body.transactionType,
        qty: body.qty.toString(), 
        unit: body.unit || "unit",
        // PENTING: Bungkus pakai new Date() supaya sinkron dengan tipe timestamp di database
        transactionDate: new Date(body.transactionDate), 
        notes: body.notes || null,
      })
      .returning();

    return NextResponse.json(newLog, { status: 201 });
  } catch (error: any) {
    console.error("API Inventory Error:", error);
    // Kita kasih detail erornya supaya kau ndak menebak-nebak lagi
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}