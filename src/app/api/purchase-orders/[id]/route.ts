import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { supplierPurchaseOrders, supplierPurchaseOrderItems, suppliers, materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const poData = await db
      .select({
        id: supplierPurchaseOrders.id,
        supplierId: supplierPurchaseOrders.supplierId,
        poNumber: supplierPurchaseOrders.poNumber,
        orderDate: supplierPurchaseOrders.orderDate,
        status: supplierPurchaseOrders.status,
        totalAmount: supplierPurchaseOrders.totalAmount,
        notes: supplierPurchaseOrders.notes,
        createdAt: supplierPurchaseOrders.createdAt,
        supplierName: suppliers.name,
        supplierPhone: suppliers.phone,
        supplierAddress: suppliers.address,
        supplierCategory: suppliers.category,
      })
      .from(supplierPurchaseOrders)
      .innerJoin(suppliers, eq(supplierPurchaseOrders.supplierId, suppliers.id))
      .where(eq(supplierPurchaseOrders.id, id))
      .limit(1);

    if (!poData.length) {
      return NextResponse.json({ error: "Purchase Order tidak ditemukan" }, { status: 404 });
    }

    const items = await db
      .select({
        id: supplierPurchaseOrderItems.id,
        poId: supplierPurchaseOrderItems.poId,
        materialId: supplierPurchaseOrderItems.materialId,
        qty: supplierPurchaseOrderItems.qty,
        pricePerUnit: supplierPurchaseOrderItems.pricePerUnit,
        materialName: materials.name,
        materialUnit: materials.unit,
      })
      .from(supplierPurchaseOrderItems)
      .innerJoin(materials, eq(supplierPurchaseOrderItems.materialId, materials.id))
      .where(eq(supplierPurchaseOrderItems.poId, id));

    return NextResponse.json({
      ...poData[0],
      items,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    const current = await db.select().from(supplierPurchaseOrders).where(eq(supplierPurchaseOrders.id, id)).limit(1);
    if (!current.length) {
      return NextResponse.json({ error: "Purchase Order tidak ditemukan" }, { status: 404 });
    }

    // Hanya status PENDING yang bebas diedit itemnya. Jika sudah COMPLETED, tidak boleh diedit lagi.
    if (current[0].status === "COMPLETED") {
      return NextResponse.json({ error: "Purchase Order yang sudah COMPLETED tidak dapat diubah!" }, { status: 400 });
    }

    const update: Record<string, any> = {};
    if (body.status !== undefined) update.status = body.status;
    if (body.notes !== undefined) update.notes = body.notes || null;

    // Mulai database update secara sekuensial
    // Jika items dikirim, kita update item dan totalAmount
    if (body.items && Array.isArray(body.items)) {
      await db.delete(supplierPurchaseOrderItems).where(eq(supplierPurchaseOrderItems.poId, id));

      let total = 0;
      const itemsToInsert = body.items.map((item: any) => {
        const q = Number(item.qty);
        const p = Number(item.pricePerUnit);
        total += q * p;
        return {
          poId: id,
          materialId: item.materialId,
          qty: q.toString(),
          pricePerUnit: p.toString(),
        };
      });

      if (itemsToInsert.length > 0) {
        await db.insert(supplierPurchaseOrderItems).values(itemsToInsert);
      }

      update.totalAmount = total.toFixed(2);
    }

    const [resPo] = await db
      .update(supplierPurchaseOrders)
      .set(update)
      .where(eq(supplierPurchaseOrders.id, id))
      .returning();

    const updatedPo = resPo;

    const finalItems = await db
      .select({
        id: supplierPurchaseOrderItems.id,
        poId: supplierPurchaseOrderItems.poId,
        materialId: supplierPurchaseOrderItems.materialId,
        qty: supplierPurchaseOrderItems.qty,
        pricePerUnit: supplierPurchaseOrderItems.pricePerUnit,
        materialName: materials.name,
        materialUnit: materials.unit,
      })
      .from(supplierPurchaseOrderItems)
      .innerJoin(materials, eq(supplierPurchaseOrderItems.materialId, materials.id))
      .where(eq(supplierPurchaseOrderItems.poId, id));

    return NextResponse.json({
      ...updatedPo,
      items: finalItems,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "staff") {
    return NextResponse.json({ error: "Hanya Admin/Manager yang bisa menghapus Purchase Order!" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const current = await db.select().from(supplierPurchaseOrders).where(eq(supplierPurchaseOrders.id, id)).limit(1);
    if (!current.length) {
      return NextResponse.json({ error: "Purchase Order tidak ditemukan" }, { status: 404 });
    }

    if (current[0].status === "COMPLETED") {
      return NextResponse.json({ error: "Purchase Order yang sudah COMPLETED tidak boleh dihapus demi integritas stok!" }, { status: 400 });
    }

    await db.delete(supplierPurchaseOrderItems).where(eq(supplierPurchaseOrderItems.poId, id));
    await db.delete(supplierPurchaseOrders).where(eq(supplierPurchaseOrders.id, id));

    return NextResponse.json({ success: true, message: "Purchase Order berhasil dihapus!" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
