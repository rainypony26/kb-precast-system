export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseRequests } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { planId, prNumber, requestDate, amount, description, notes } = body;

    // Validasi data yang masuk
    if (!planId || !prNumber || !amount || !description) {
      return NextResponse.json({ error: "Data PR tidak lengkap! (Nomor PR, Nominal, Deskripsi wajib diisi)" }, { status: 400 });
    }

    // Masukkan ke database
    const [newPR] = await db.insert(purchaseRequests).values({
      planId,
      prNumber,
      requestDate: requestDate ? new Date(requestDate) : new Date(),
      amount: String(amount),
      description,
      notes: notes || null,
      status: "PENDING" // Default status saat baru diajukan
    }).returning();

    return NextResponse.json(newPR, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal membuat PR: " + err.message }, { status: 500 });
  }
}