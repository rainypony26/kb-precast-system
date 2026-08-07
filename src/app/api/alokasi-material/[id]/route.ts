export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { materialOutbound, materials, contracts, rabs, bomMaterials } from "@/db/schema";
import { eq, sql, and, like } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Hanya Admin yang bisa hapus alokasi!" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const records = await db.select().from(materialOutbound).where(eq(materialOutbound.id, id));
    if (!records.length) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

    const record = records[0];

    // Revert stock
    await db.update(materials).set({ stock: sql`${materials.stock} + ${record.qty}` }).where(eq(materials.id, record.materialId));

    // Delete record
    await db.delete(materialOutbound).where(eq(materialOutbound.id, id));

    // Also remove matching BOM entry if project had an approved RAB
    if (record.projectId) {
      const [contract] = await db
        .select({ id: contracts.id })
        .from(contracts)
        .where(eq(contracts.projectId, record.projectId));
      if (contract) {
        const [rab] = await db
          .select({ id: rabs.id })
          .from(rabs)
          .where(and(eq(rabs.contractId, contract.id), eq(rabs.status, "APPROVED")));
        if (rab) {
          // Delete BOM entry matching this allocation (same material, qty, and auto-generated note)
          await db.delete(bomMaterials).where(
            and(
              eq(bomMaterials.rabId, rab.id),
              eq(bomMaterials.materialId, record.materialId),
              eq(bomMaterials.estimatedQty, record.qty),
              like(bomMaterials.notes, "Auto dari alokasi%")
            )
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
