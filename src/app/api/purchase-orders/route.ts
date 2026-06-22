import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { supplierPurchaseOrders, supplierPurchaseOrderItems, suppliers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const allPos = await db
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
        supplierCategory: suppliers.category,
      })
      .from(supplierPurchaseOrders)
      .innerJoin(suppliers, eq(supplierPurchaseOrders.supplierId, suppliers.id))
      .orderBy(desc(supplierPurchaseOrders.createdAt));

    return NextResponse.json(allPos);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.supplierId || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Data Purchase Order tidak lengkap!" }, { status: 400 });
    }

    // Auto-generate nomor PO: PO-KB-YYYY-XXXX
    const year = new Date().getFullYear();
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(supplierPurchaseOrders);
    const count = result[0]?.count || 0;
    const poNumber = `PO-KB-${year}-${String(count + 1).padStart(4, "0")}`;

    // Hitung total nominal PO
    let total = 0;
    const poItemsData = body.items.map((item: any) => {
      const q = Number(item.qty);
      const p = Number(item.pricePerUnit);
      total += q * p;
      return {
        materialId: item.materialId,
        qty: q.toString(),
        pricePerUnit: p.toString(),
      };
    });

    // Mulai insert database secara sekuensial
    const [insertedPo] = await db
      .insert(supplierPurchaseOrders)
      .values({
        supplierId: body.supplierId,
        poNumber: poNumber,
        status: body.status || "PENDING",
        totalAmount: total.toFixed(2),
        notes: body.notes || null,
      })
      .returning();

    const itemsToInsert = poItemsData.map((item: any) => ({
      poId: insertedPo.id,
      materialId: item.materialId,
      qty: item.qty,
      pricePerUnit: item.pricePerUnit,
    }));

    await db.insert(supplierPurchaseOrderItems).values(itemsToInsert);
    const newPo = insertedPo;

    const finalItems = await db
      .select()
      .from(supplierPurchaseOrderItems)
      .where(eq(supplierPurchaseOrderItems.poId, newPo.id));

    return NextResponse.json({
      ...newPo,
      items: finalItems,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
