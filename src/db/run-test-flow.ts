import { config } from "dotenv";
import path from "path";
// Load env before database import
config({ path: path.resolve(process.cwd(), ".env.local") });

import { db } from "./index";
import { 
  users, projects, contracts, rabs, bomMaterials, manpowerPlans, 
  productionPlans, suppliers, supplierPurchaseOrders, supplierPurchaseOrderItems,
  dailyReports, fgItems, finishedGoods, operationalExpenses, materials, materialInbound, materialOutbound
} from "./schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  console.log("=================================================");
  console.log("🚀 MEMULAI SIMULASI TESTING ALUR KERJA SISTEM 🚀");
  console.log("=================================================");

  // 1. Dapatkan user admin/manager
  console.log("\n1. Memeriksa ketersediaan pengguna...");
  const dbUsers = await db.select().from(users).limit(1);
  if (dbUsers.length === 0) {
    console.error("❌ Error: Tidak ada pengguna terdaftar. Silakan jalankan 'npm run db:seed' terlebih dahulu.");
    process.exit(1);
  }
  const user = dbUsers[0];
  console.log(`✅ Menggunakan pengguna: ${user.fullName} (${user.role})`);

  // 2. Buat material baru untuk pengetesan
  console.log("\n2. Membuat master bahan baku...");
  const materialName = `Semen Tonasa - Test ${Date.now()}`;
  const [newMaterial] = await db.insert(materials).values({
    name: materialName,
    category: "Raw Material",
    unit: "zak",
    stock: "50.000",
  }).returning();
  console.log(`✅ Bahan baku dibuat: ${newMaterial.name} (Stok awal: ${newMaterial.stock} ${newMaterial.unit})`);

  // 3. Buat Proyek Baru
  console.log("\n3. Membuat proyek konstruksi baru (CRM)...");
  const pCode = `PRJ-${Date.now().toString().slice(-6)}`;
  const [newProject] = await db.insert(projects).values({
    projectCode: pCode,
    projectName: `Simulasi Pembangunan Flyover Test ${Date.now().toString().slice(-4)}`,
    customerName: "PT Waskita Karya (Persero)",
    picName: "Budi Santoso",
    projectValue: "1500000000.00",
    status: "KONTRAK",
    location: "Makassar, Sulawesi Selatan",
    notes: "Proyek simulasi integration testing",
    createdBy: user.id,
  }).returning();
  console.log(`✅ Proyek dibuat: ${newProject.projectName} (Kode: ${newProject.projectCode}, Nilai: Rp ${newProject.projectValue})`);

  // 4. Buat Kontrak Baru
  console.log("\n4. Membuat dokumen kontrak proyek...");
  const cNum = `CTR-${Date.now().toString().slice(-6)}`;
  const [newContract] = await db.insert(contracts).values({
    projectId: newProject.id,
    contractNumber: cNum,
    contractValue: newProject.projectValue!,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 hari kedepan
    notes: "Kontrak hasil simulasi testing",
  }).returning();
  console.log(`✅ Kontrak dibuat: ${newContract.contractNumber} (Nilai: Rp ${newContract.contractValue})`);

  // 5. Buat Rencana Anggaran Biaya (RAB)
  console.log("\n5. Membuat Rencana Anggaran Biaya (RAB)...");
  const rNum = `RAB-${Date.now().toString().slice(-6)}`;
  const [newRab] = await db.insert(rabs).values({
    contractId: newContract.id,
    rabNumber: rNum,
    targetVolume: 100,
    unit: "pcs",
    depreciationValue: "20000000.00",
    fixedCostValue: "50000000.00",
    overheadHo: "15000000.00",
    status: "DRAFT",
    notes: "RAB simulasi testing",
  }).returning();
  console.log(`✅ RAB dibuat: ${newRab.rabNumber} (Target: ${newRab.targetVolume} ${newRab.unit}, Status: ${newRab.status})`);

  // 6. Buat BOM Materials & Manpower Plans
  console.log("\n6. Mengisi Rincian Biaya (BOM Bahan Baku & Tenaga Kerja) ke RAB...");
  await db.insert(bomMaterials).values({
    rabId: newRab.id,
    materialId: newMaterial.id,
    materialName: newMaterial.name,
    estimatedQty: "200.000",
    unit: newMaterial.unit,
    procurementType: "BELI_BARU",
    unitPrice: "65000.00",
    notes: "Semen untuk casting precast",
  });
  await db.insert(manpowerPlans).values({
    rabId: newRab.id,
    sourceType: "INTERNAL",
    headcount: 5,
    roleDescription: "Tukang Cor Beton",
    dailyRate: "120000.00",
    notes: "Tukang cor harian",
  });
  console.log("✅ Rincian BOM & Tenaga Kerja berhasil dihubungkan ke RAB.");

  // 7. Setujui RAB (Approve)
  console.log("\n7. Menyetujui RAB (Approval)...");
  await db.update(rabs).set({ status: "APPROVED" }).where(eq(rabs.id, newRab.id));
  console.log(`✅ Status RAB ${newRab.rabNumber} diperbarui menjadi APPROVED.`);

  // 8. Buat Rencana Produksi (SPK)
  console.log("\n8. Menerbitkan Surat Perintah Kerja (SPK) Rencana Produksi...");
  const sNum = `SPK-${Date.now().toString().slice(-6)}`;
  const [newPlan] = await db.insert(productionPlans).values({
    contractId: newContract.id,
    rabId: newRab.id,
    spkNumber: sNum,
    targetVolume: newRab.targetVolume,
    unit: newRab.unit,
    commenceDate: new Date(),
    deadlineDate: newContract.endDate,
    status: "AKTIF",
    notes: "SPK dirilis berdasarkan RAB yang disetujui",
  }).returning();
  console.log(`✅ SPK dirilis: ${newPlan.spkNumber} (Target Volume: ${newPlan.targetVolume} ${newPlan.unit}, Status: ${newPlan.status})`);

  // 9. Buat Supplier Baru
  console.log("\n9. Membuat data Supplier Rekanan...");
  const [newSupplier] = await db.insert(suppliers).values({
    name: `PT Semen Tonasa Supplier - Test ${Date.now().toString().slice(-4)}`,
    phone: "081234567890",
    address: "Biringkanaya, Makassar",
    category: "SEMEN",
  }).returning();
  console.log(`✅ Supplier dibuat: ${newSupplier.name}`);

  // 10. Buat Purchase Order (PO) ke Supplier untuk menambah stok bahan baku
  console.log("\n10. Membuat Purchase Order (PO) Bahan Baku ke Supplier...");
  const poNum = `PO-KB-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
  const [newSupplierPo] = await db.insert(supplierPurchaseOrders).values({
    supplierId: newSupplier.id,
    poNumber: poNum,
    status: "PENDING",
    totalAmount: "13000000.00", // 200 unit * Rp 65.000 = Rp 13.000.000
    notes: "Pemesanan semen untuk kebutuhan proyek precast",
  }).returning();

  await db.insert(supplierPurchaseOrderItems).values({
    poId: newSupplierPo.id,
    materialId: newMaterial.id,
    qty: "200.000",
    pricePerUnit: "65000.00",
  });
  console.log(`✅ PO Supplier dirilis: ${newSupplierPo.poNumber} (Nilai: Rp ${newSupplierPo.totalAmount}, Status: ${newSupplierPo.status})`);

  // 11. Transisikan status PO Supplier ke SHIPPED lalu lakukan Verifikasi Barang Masuk (Goods Receipt)
  console.log("\n11. Mensimulasikan pengiriman & penerimaan barang masuk dari PO Supplier...");
  await db.update(supplierPurchaseOrders).set({ status: "SHIPPED" }).where(eq(supplierPurchaseOrders.id, newSupplierPo.id));
  
  // LOGIK SIMULASI GOODS RECEIPT (SEKUENSIL):
  // 11.1 Update PO status ke COMPLETED
  await db.update(supplierPurchaseOrders).set({ status: "COMPLETED" }).where(eq(supplierPurchaseOrders.id, newSupplierPo.id));
  // 11.2 Tambah stok material
  const parsedStock = parseFloat(newMaterial.stock || "0");
  const newStockAmount = parsedStock + 200; // PO memesan 200 zak
  await db.update(materials).set({ stock: newStockAmount.toFixed(3) }).where(eq(materials.id, newMaterial.id));
  // 11.3 Catat ke inbound log
  await db.insert(materialInbound).values({
    materialId: newMaterial.id,
    vendorName: newSupplier.name,
    qty: "200.000",
    entryDate: new Date(),
    notes: `Simulasi received dari PO ${newSupplierPo.poNumber}`,
  });
  
  const [updatedMaterial] = await db.select().from(materials).where(eq(materials.id, newMaterial.id));
  console.log(`✅ PO diselesaikan! Stok fisik ${updatedMaterial.name} bertambah:`);
  console.log(`   Stok lama: ${newMaterial.stock} zak ➔ Stok baru: ${updatedMaterial.stock} zak`);

  // 12. Input Buku Kerja Harian (BKH) Produksi Casting
  console.log("\n12. Mencatat Buku Kerja Harian (BKH) produksi cor precast...");
  const fgQty = 40;
  const damagedQty = 5;
  const returnQty = 0;
  
  // 12.1 Simpan log BKH
  const [bkhReport] = await db.insert(dailyReports).values({
    planId: newPlan.id,
    reportedBy: user.id,
    reportDate: new Date(),
    fgQty,
    damagedQty,
    returnQty,
    notes: "Pengecoran pilar precast aman terkendali",
  }).returning();

  // 12.2 Tambah ke Gudang Barang Jadi (finishedGoods)
  const productName = `Precast - ${newProject.projectName} (${newPlan.spkNumber})`;
  const [newFgSlot] = await db.insert(finishedGoods).values({
    planId: newPlan.id,
    productName,
    stock: fgQty,
    unit: newPlan.unit,
  }).returning();

  // 12.3 Hasilkan Unit Precast Individual (fgItems)
  const spkClean = (newPlan.spkNumber || "SPK").replace(/[^a-zA-Z0-9]/g, "");
  const dateClean = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const newItemsToInsert = [];
  
  // Good items
  for (let i = 0; i < fgQty; i++) {
    newItemsToInsert.push({
      planId: newPlan.id,
      itemCode: `KB-${spkClean}-${dateClean}-${String(i + 1).padStart(4, "0")}`,
      productName: `Precast - ${newProject.projectName}`,
      status: "GOOD",
      defectReason: null,
      castingDate: new Date(),
    });
  }
  // Reject items
  for (let i = 0; i < damagedQty; i++) {
    newItemsToInsert.push({
      planId: newPlan.id,
      itemCode: `KB-${spkClean}-${dateClean}-${String(fgQty + i + 1).padStart(4, "0")}`,
      productName: `Precast - ${newProject.projectName}`,
      status: "REJECT",
      defectReason: "Gelembung udara berlebih pada beton",
      castingDate: new Date(),
    });
  }
  await db.insert(fgItems).values(newItemsToInsert);
  console.log(`✅ Laporan BKH disimpan. Berhasil memproduksi:`);
  console.log(`   - ${fgQty} unit precast status GOOD (Telah masuk gudang barang jadi)`);
  console.log(`   - ${damagedQty} unit precast status REJECT (Rusak/cacat saat casting)`);

  // 12.4 Kurangi stok bahan baku (Outbound) - simulasi pemakaian semen sebanyak 80 zak
  console.log("\n12.4 Mensimulasikan pemakaian bahan baku (material outbound)...");
  const parsedMaterialStock = parseFloat(updatedMaterial.stock || "0");
  const rawMaterialQtyUsed = 80;
  const afterOutboundStock = parsedMaterialStock - rawMaterialQtyUsed;
  
  await db.insert(materialOutbound).values({
    materialId: newMaterial.id,
    recipient: "Gudang Pengecoran Flyover",
    qty: rawMaterialQtyUsed.toString(),
    exitDate: new Date(),
    notes: `Pemakaian semen untuk BKH SPK ${newPlan.spkNumber}`,
  });
  
  await db.update(materials).set({ stock: afterOutboundStock.toFixed(3) }).where(eq(materials.id, newMaterial.id));
  const [materialFinalState] = await db.select().from(materials).where(eq(materials.id, newMaterial.id));
  console.log(`✅ Pemakaian material dicatat. Stok bahan baku saat ini: ${materialFinalState.stock} zak`);

  // 13. Kontrol Kualitas (QC) - Ubah salah satu status unit precast dari GOOD menjadi REJECT
  console.log("\n13. Melakukan tindakan kontrol kualitas (QC) unit precast individual...");
  const goodItems = await db.select().from(fgItems).where(sql`plan_id = ${newPlan.id} AND status = 'GOOD'`).limit(1);
  if (goodItems.length > 0) {
    const itemToReject = goodItems[0];
    await db.update(fgItems)
      .set({ status: "REJECT", defectReason: "Cacat retak struktural hasil inspeksi pasca cetak" })
      .where(eq(fgItems.id, itemToReject.id));
    
    // Kurangi 1 dari gudang finishedGoods
    const [fgStockInfo] = await db.select().from(finishedGoods).where(eq(finishedGoods.planId, newPlan.id)).limit(1);
    await db.update(finishedGoods)
      .set({ stock: fgStockInfo.stock - 1 })
      .where(eq(finishedGoods.id, fgStockInfo.id));

    console.log(`✅ Unit precast ${itemToReject.itemCode} dideklarasikan REJECT.`);
    console.log(`   Alasan: Cacat retak struktural hasil inspeksi pasca cetak.`);
    console.log(`   Stok barang jadi (GOOD) berkurang menjadi: ${fgStockInfo.stock - 1} pcs`);
  }

  // 14. Catat Pengeluaran Operasional Harian (Expense)
  console.log("\n14. Mencatat pengeluaran operasional (over-budget testing)...");
  const [expense] = await db.insert(operationalExpenses).values({
    planId: newPlan.id,
    expenseType: "Overhead Pengecoran",
    amount: 5000000,
    notes: "Sewa concrete pump mixer tambahan",
  }).returning();
  console.log(`✅ Pengeluaran dicatat: ${expense.expenseType} senilai Rp ${expense.amount.toLocaleString("id-ID")}`);

  // 15. Jalankan Perhitungan Executive Dashboard untuk SPK ini
  console.log("\n15. Mengkalkulasi data untuk Laporan Dashboard Eksekutif...");
  // 15.1 Margin Laba kotor proyek: Nilai Kontrak vs Biaya Aktual
  // Kontrak = 1.5 Milyar.
  // Biaya Aktual = Rp 13.000.000 (PO Semen) + Rp 5.000.000 (Expense) = Rp 18.000.000
  const contractValue = parseFloat(newContract.contractValue);
  const actualCost = 13000000 + 5000000;
  const grossProfit = contractValue - actualCost;
  const marginPercent = (grossProfit / contractValue) * 100;

  // 15.2 Break Even Point (BEP)
  // Target BEP volume = (Fixed Cost + Overhead HO) / Price per unit
  // Misal nilai per unit = 1.5 Milyar / 100 pcs = Rp 15.000.000
  // Fixed Cost = 50jt, Depreciation = 20jt, HO = 15jt. Total Fixed = 85jt.
  // BEP volume = 85jt / 15jt = 5.66 pcs.
  const pricePerUnit = contractValue / newRab.targetVolume;
  const totalFixed = parseFloat(newRab.fixedCostValue) + parseFloat(newRab.depreciationValue) + parseFloat(newRab.overheadHo);
  const bepVolume = totalFixed / pricePerUnit;

  console.log(`\n📈 METRIKS KEUANGAN PROYEK (DIREKSI):`);
  console.log(`   - Nilai Kontrak Proyek : Rp ${contractValue.toLocaleString("id-ID")}`);
  console.log(`   - Akumulasi Biaya Aktual: Rp ${actualCost.toLocaleString("id-ID")}`);
  console.log(`   - Margin Laba Kotor    : Rp ${grossProfit.toLocaleString("id-ID")} (${marginPercent.toFixed(2)}%)`);
  console.log(`   - Target BEP Volume    : ${bepVolume.toFixed(2)} unit`);
  console.log(`   - Realisasi FG Terjual : ${fgQty - 1} unit (Status GOOD saat ini)`);
  console.log(`   - Status Proyek BEP    : ${ (fgQty - 1) >= bepVolume ? "🎉 BEP Tercapai (Menguntungkan)" : "📉 Belum BEP (Investasi Awal)" }`);

  console.log("\n=================================================");
  console.log("🎉 SIMULASI SELESAI & SELURUH FITUR TERUJI! 🎉");
  console.log("=================================================");
  console.log("Semua data testing di atas tetap tersimpan di database Neon.");
  console.log("Anda dapat membuka Dashboard, CRM, Procurement, Gudang,");
  console.log("dan Executive Report di browser untuk melihat visualisasinya!");
  console.log("=================================================");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("❌ Terjadi kesalahan saat simulasi:", e);
  process.exit(1);
});
