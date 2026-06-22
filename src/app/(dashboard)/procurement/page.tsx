export const dynamic = 'force-dynamic';

import { db } from "@/db";
import { suppliers, materials, supplierPurchaseOrders } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import ProcurementClient from "@/components/crm/procurement-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProcurementPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    // 1. Fetch data materials untuk dropdown pemilihan barang di PO
    const allMaterials = await db.select().from(materials).orderBy(materials.name);

    // 2. Fetch data supplier
    const allSuppliers = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));

    // 3. Fetch data Purchase Orders (PO ke Supplier) beserta relasi nama Supplier
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

    return (
      <div className="p-8">
        <ProcurementClient
          initialMaterials={allMaterials}
          initialSuppliers={allSuppliers}
          initialPos={allPos}
          session={session}
        />
      </div>
    );
  } catch (error: any) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-500/10 border border-red-500 p-6 rounded-2xl max-w-2xl mx-auto mt-10">
          <h1 className="text-xl font-black text-red-600 mb-2">ERROR DATABASE!</h1>
          <p className="text-slate-500">{error.message}</p>
        </div>
      </div>
    );
  }
}
