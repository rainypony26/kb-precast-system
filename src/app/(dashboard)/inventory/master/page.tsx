import { db } from "@/db";
import { materials, materialInbound, materialOutbound } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import MasterInventoryClient from "@/components/crm/master-inventory-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MasterInventoryPage() {
  const session = await getSession();
  
  // 1. Proteksi Login
  if (!session) {
    redirect("/login");
  }

  try {
    // 2. Ambil Stok Master Material
    const allMaterials = await db
      .select()
      .from(materials)
      .orderBy(desc(materials.name)); // Urutkan berdasarkan nama material

    // 3. Ambil 10 Riwayat Barang Masuk Terakhir
    const inboundHistory = await db
      .select({
        id: materialInbound.id,
        materialName: materials.name,
        vendor: materialInbound.vendorName,
        qty: materialInbound.qty,
        date: materialInbound.entryDate,
      })
      .from(materialInbound)
      .leftJoin(materials, eq(materialInbound.materialId, materials.id))
      .orderBy(desc(materialInbound.entryDate)) // Wajib pakai kolom yang ada!
      .limit(10);

    // 4. Ambil 10 Riwayat Barang Keluar Terakhir
    const outboundHistory = await db
      .select({
        id: materialOutbound.id,
        materialName: materials.name,
        recipient: materialOutbound.recipient,
        qty: materialOutbound.qty,
        date: materialOutbound.exitDate,
      })
      .from(materialOutbound)
      .leftJoin(materials, eq(materialOutbound.materialId, materials.id))
      .orderBy(desc(materialOutbound.exitDate)) // Wajib pakai kolom yang ada!
      .limit(10);

    return (
      <div className="p-8 bg-[#0f172a] min-h-screen text-white">
        <MasterInventoryClient 
          initialMaterials={allMaterials} 
          inboundHistory={inboundHistory}
          outboundHistory={outboundHistory}
        />
      </div>
    );

  } catch (error: any) {
    console.error("Database Error:", error);
    return (
      <div className="p-8 text-center bg-[#0f172a] min-h-screen text-white">
        <div className="bg-red-500/10 border border-red-500 p-6 rounded-2xl max-w-2xl mx-auto">
          <h1 className="text-xl font-black text-red-500 mb-2 italic">LOGIKA DATABASE PATAH, BOSKU!</h1>
          <p className="text-slate-400 text-sm mb-4">
            Erornya: <code className="bg-black/50 p-1 rounded text-red-300">{error.message}</code>
          </p>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
            SOLUSI: Pastikan sudah ko jalankan 'npx drizzle-kit push' di terminal!
          </p>
        </div>
      </div>
    );
  }
}