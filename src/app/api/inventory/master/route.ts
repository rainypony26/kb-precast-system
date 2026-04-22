import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { materials } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    
    // Keamanan: Pastikan yang tambah material cuma user yang login
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validasi: Nama dan Satuan tidak boleh kosong
    if (!body.name || !body.unit) {
      return NextResponse.json({ error: "Nama material dan Satuan wajib diisi!" }, { status: 400 });
    }

    // Simpan ke database
    const [newMaterial] = await db
      .insert(materials)
      .values({
        name: body.name,
        category: body.category || "Raw Material",
        unit: body.unit,
        stock: "0", // Material baru stoknya mulai dari nol
      })
      .returning();

    return NextResponse.json(newMaterial, { status: 201 });
  } catch (error: any) {
    console.error("API Master Inventory Error:", error);
    return NextResponse.json(
      { error: "Gagal simpan material baru", details: error.message }, 
      { status: 500 }
    );
  }
}