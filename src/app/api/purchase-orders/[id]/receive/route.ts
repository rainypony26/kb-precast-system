import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { supplierPurchaseOrders, supplierPurchaseOrderItems, suppliers, materials, materialInbound } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // 1. Ambil data PO dan pastikan ada
    const poData = await db
      .select({
        id: supplierPurchaseOrders.id,
        status: supplierPurchaseOrders.status,
        poNumber: supplierPurchaseOrders.poNumber,
        supplierId: supplierPurchaseOrders.supplierId,
        supplierName: suppliers.name,
      })
      .from(supplierPurchaseOrders)
      .innerJoin(suppliers, eq(supplierPurchaseOrders.supplierId, suppliers.id))
      .where(eq(supplierPurchaseOrders.id, id))
      .limit(1);

    if (!poData.length) {
      return NextResponse.json({ error: "Purchase Order tidak ditemukan" }, { status: 404 });
    }

    const po = poData[0];

    // 2. Cegah double complete
    if (po.status === "COMPLETED") {
      return NextResponse.json({ error: "Purchase Order ini sudah diverifikasi sebelumnya!" }, { status: 400 });
    }

    // 3. Ambil item dalam PO
    const items = await db
      .select()
      .from(supplierPurchaseOrderItems)
      .where(eq(supplierPurchaseOrderItems.poId, id));

    if (items.length === 0) {
      return NextResponse.json({ error: "Purchase Order ini tidak memiliki item barang!" }, { status: 400 });
    }

    // 4. Lakukan update stock, insert history, dan update status PO secara sekuensial
    // Update status PO ke COMPLETED
    await db
      .update(supplierPurchaseOrders)
      .set({ status: "COMPLETED" })
      .where(eq(supplierPurchaseOrders.id, id));

    // Loop update material stock & insert riwayat inbound
    for (const item of items) {
      // Ambil stok saat ini
      const currentMaterial = await db
        .select({ stock: materials.stock, name: materials.name })
        .from(materials)
        .where(eq(materials.id, item.materialId))
        .limit(1);

      if (!currentMaterial.length) {
        throw new Error(`Material dengan ID ${item.materialId} tidak ditemukan.`);
      }

      const newStock = Number(currentMaterial[0].stock || 0) + Number(item.qty);

      // Update stok fisik Gudang Pusat
      await db
        .update(materials)
        .set({ stock: newStock.toFixed(3) })
        .where(eq(materials.id, item.materialId));

      // Catat ke log material_inbound (Riwayat Barang Masuk)
      await db.insert(materialInbound).values({
        materialId: item.materialId,
        vendorName: po.supplierName,
        qty: item.qty,
        entryDate: new Date(),
        notes: `Diterima dari Purchase Order ${po.poNumber}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Purchase Order ${po.poNumber} berhasil diselesaikan. Stok bahan baku fisik di Gudang Pusat telah diperbarui!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
