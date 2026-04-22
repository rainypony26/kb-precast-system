import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// --- UPDATE MATERIAL (PATCH) ---
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id } = await params;

    const updated = await db
      .update(materials)
      .set({
        name: body.name,
        category: body.category,
        unit: body.unit,
      })
      .where(eq(materials.id, id))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: "Material tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- HAPUS MATERIAL (DELETE) ---
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Hanya Admin yang bisa menghapus master data!" }, { status: 403 });
    }

    const { id } = await params;

    const deleted = await db
      .delete(materials)
      .where(eq(materials.id, id))
      .returning();

    if (!deleted.length) {
      return NextResponse.json({ error: "Gagal menghapus atau data tidak ada" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Note: Jika material sudah dipakai di Inbound/Outbound/BOM, database akan menolak (Foreign Key Constraint)
    return NextResponse.json({ 
      error: "Tidak bisa menghapus material yang sudah memiliki riwayat transaksi/produksi!" 
    }, { status: 500 });
  }
}