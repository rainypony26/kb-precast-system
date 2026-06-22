export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { operationalExpenses, productionPlans } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  // Pengaman: Cuma admin yang boleh hapus nota yang sudah masuk!
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Hanya Admin yang bisa menghapus histori pengeluaran!" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // 1. Cari dulu notanya buat tahu berapa nominal yang harus ditarik
    const expenseList = await db.select().from(operationalExpenses).where(eq(operationalExpenses.id, id));
    if (expenseList.length === 0) return NextResponse.json({ error: "Nota pengeluaran tidak ditemukan" }, { status: 404 });
    
    const expense = expenseList[0];

    // 2. TARIK KEMBALI UANGNYA DARI INDUK SPK
    if (expense.expenseType === "MATERIAL") {
      await db.update(productionPlans).set({ actualMaterial: sql`${productionPlans.actualMaterial} - ${expense.amount}` }).where(eq(productionPlans.id, expense.planId));
    } else if (expense.expenseType === "MANPOWER") {
      await db.update(productionPlans).set({ actualManpower: sql`${productionPlans.actualManpower} - ${expense.amount}` }).where(eq(productionPlans.id, expense.planId));
    } else if (expense.expenseType === "OVERHEAD") {
      await db.update(productionPlans).set({ actualOverhead: sql`${productionPlans.actualOverhead} - ${expense.amount}` }).where(eq(productionPlans.id, expense.planId));
    }

    // 3. HAPUS NOTANYA DARI BUKU KAS
    await db.delete(operationalExpenses).where(eq(operationalExpenses.id, id));

    return NextResponse.json({ success: true, message: "Nota pengeluaran berhasil dihapus & total diupdate!" });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal hapus pengeluaran: " + err.message }, { status: 500 });
  }
}