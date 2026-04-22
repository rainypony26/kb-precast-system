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
    const { id } = await params; // Di Next.js 15, params harus di-await

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
    console.error("PATCH ERROR:", error);
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
    // Keamanan: Cuma admin yang bisa hapus master data
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Hanya Admin yang bisa menghapus!" }, { status: 403 });
    }

    const { id } = await params;

    const deleted = await db
      .delete(materials)
      .where(eq(materials.id, id))
      .returning();

    if (!deleted.length) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Eror ini biasanya karena material sudah dipakai di laporan produksi (Foreign Key)
    return NextResponse.json({ 
      error: "Tidak bisa hapus! Material ini sudah ada riwayat pemakaiannya." 
    }, { status: 500 });
  }
}