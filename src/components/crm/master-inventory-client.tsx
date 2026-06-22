"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, formatDate } from "@/lib/utils";
import { exportToExcel, exportToPDF } from "@/lib/export-utils"; 
import { 
  PackagePlus, ArrowDownCircle, ArrowUpCircle, History, 
  Warehouse, Loader2, Edit, Trash2, Box, Truck, Zap,
  FileSpreadsheet, FileText, Search, ArrowUpRight
} from "lucide-react";
import type { SessionPayload } from "@/lib/auth";

interface MasterInventoryProps {
  initialMaterials: any[];
  inboundHistory: any[];
  outboundHistory: any[];
  finishedGoods?: any[];
  allocatedBOMs?: Record<string, number>;
  session: SessionPayload | null;
}

export default function MasterInventoryClient({ 
  initialMaterials, 
  inboundHistory, 
  outboundHistory,
  finishedGoods = [],
  allocatedBOMs = {},
  session
}: MasterInventoryProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"RAW" | "FG">("RAW");
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false); 
  const [showInboundModal, setShowInboundModal] = useState(false);
  const [showOutboundModal, setShowOutboundModal] = useState(false);
  
  // FG Modal
  const [showFgModal, setShowFgModal] = useState(false);
  const [selectedFg, setSelectedFg] = useState<any>(null);
  const [fgForm, setFgForm] = useState({ qty: "", recipient: "" });

  // Form States RAW
  const [materialForm, setMaterialForm] = useState({ name: "", category: "Raw Material", unit: "Kg" });
  const [editingId, setEditingId] = useState<string | null>(null); 
  const [inboundForm, setInboundForm] = useState({ materialId: "", vendorName: "", qty: "", entryDate: new Date().toISOString().split("T")[0], notes: "" });
  const [outboundForm, setOutboundForm] = useState({ materialId: "", recipient: "", qty: "", exitDate: new Date().toISOString().split("T")[0], notes: "" });

  // Filter States
  const [histStartDate, setHistStartDate] = useState("");
  const [histEndDate, setHistEndDate] = useState("");
  const [histSearch, setHistSearch] = useState("");

  // ================= LOGIKA FILTER =================
  const filteredInbound = useMemo(() => {
    return inboundHistory.filter(h => {
      const matchSearch = !histSearch || h.materialName?.toLowerCase().includes(histSearch.toLowerCase()) || h.vendorName?.toLowerCase().includes(histSearch.toLowerCase());
      const matchStart = !histStartDate || new Date(h.entryDate) >= new Date(histStartDate);
      const matchEnd = !histEndDate || new Date(h.entryDate) <= new Date(histEndDate + 'T23:59:59');
      return matchSearch && matchStart && matchEnd;
    });
  }, [inboundHistory, histSearch, histStartDate, histEndDate]);

  const filteredOutbound = useMemo(() => {
    return outboundHistory.filter(h => {
      const matchSearch = !histSearch || h.materialName?.toLowerCase().includes(histSearch.toLowerCase()) || h.recipient?.toLowerCase().includes(histSearch.toLowerCase());
      const matchStart = !histStartDate || new Date(h.exitDate) >= new Date(histStartDate);
      const matchEnd = !histEndDate || new Date(h.exitDate) <= new Date(histEndDate + 'T23:59:59');
      return matchSearch && matchStart && matchEnd;
    });
  }, [outboundHistory, histSearch, histStartDate, histEndDate]);

  const filteredRaw = useMemo(() => {
    return initialMaterials.filter(m => !histSearch || m.name.toLowerCase().includes(histSearch.toLowerCase()));
  }, [initialMaterials, histSearch]);

  const filteredFg = useMemo(() => {
    return finishedGoods.filter(f => !histSearch || f.productName.toLowerCase().includes(histSearch.toLowerCase()) || (f.spkNumber && f.spkNumber.toLowerCase().includes(histSearch.toLowerCase())));
  }, [finishedGoods, histSearch]);

  // ================= LOGIKA EXPORT =================
  const handleExportRawStock = (type: 'excel'|'pdf') => {
    const data = filteredRaw.map(m => {
      const allocated = allocatedBOMs[m.id] || m.bookedAmount || 0;
      const available = parseFloat(m.stock) - allocated;
      return {
        "Nama Barang": m.name,
        "Kategori": m.category,
        "Total Fisik": `${parseFloat(m.stock)} ${m.unit}`,
        "Booking BOM": `${allocated} ${m.unit}`,
        "Sisa Tersedia": `${available} ${m.unit}`
      };
    });
    if(type==='excel') exportToExcel(data, `Stok_BahanBaku_${new Date().toLocaleDateString()}`);
    else exportToPDF("LAPORAN STOK BAHAN BAKU", [["Nama Barang", "Kategori", "Total Fisik", "Booking BOM", "Tersedia"]], data.map(d=>Object.values(d)), `Stok_BahanBaku_${new Date().toLocaleDateString()}`);
  };

  const handleExportFGStock = (type: 'excel'|'pdf') => {
    const data = filteredFg.map(fg => ({
      "Nama Precast": fg.productName,
      "Asal SPK": fg.spkNumber || "UMUM",
      "Stok Siap Kirim": fg.stock,
      "Satuan": fg.unit
    }));
    if(type==='excel') exportToExcel(data, `Stok_BarangJadi_${new Date().toLocaleDateString()}`);
    else exportToPDF("LAPORAN STOK BARANG JADI (FG)", [["Nama Precast", "Asal SPK", "Stok Siap Kirim", "Satuan"]], data.map(d=>Object.values(d)), `Stok_BarangJadi_${new Date().toLocaleDateString()}`);
  };

  const handleExportHistory = (type: 'excel'|'pdf') => {
    const inData = filteredInbound.map(h => ({ "Tanggal": formatDate(h.entryDate), "Jenis": "MASUK", "Barang": h.materialName || "-", "Asal/Tujuan": h.vendorName || "-", "Jumlah": `+${h.qty}` }));
    const outData = filteredOutbound.map(h => ({ "Tanggal": formatDate(h.exitDate), "Jenis": "KELUAR", "Barang": h.materialName || "-", "Asal/Tujuan": h.recipient || "-", "Jumlah": `-${h.qty}` }));
    const combined = [...inData, ...outData].sort((a,b) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime());
    
    if(type==='excel') exportToExcel(combined, `Riwayat_Gudang_${new Date().toLocaleDateString()}`);
    else exportToPDF("LAPORAN RIWAYAT GUDANG PUSAT", [["Tanggal", "Jenis", "Barang", "Vendor/Proyek", "Jumlah"]], combined.map(d=>Object.values(d)), `Riwayat_Gudang_${new Date().toLocaleDateString()}`);
  };

  // ================= ACTION HANDLERS =================
  async function handleSuntikOtomatis() {
    if (!confirm("Ini akan memasukkan 27 master material (termasuk besi) secara otomatis. Lanjutkan?")) return;
    setLoading(true);
    const dataSuntikan = [
      { name: "Semen (PC)", category: "MATERIAL BETON", unit: "Kg" }, { name: "Pasir Beton", category: "MATERIAL BETON", unit: "m3" },
      { name: "Split / Chipping", category: "MATERIAL BETON", unit: "m3" }, { name: "Air", category: "MATERIAL BETON", unit: "Liter" },
      { name: "Besi D.10", category: "BESI TULANGAN", unit: "Batang" }, { name: "Besi D.13", category: "BESI TULANGAN", unit: "Batang" },
      { name: "Besi D.16", category: "BESI TULANGAN", unit: "Batang" }, { name: "Besi D.19", category: "BESI TULANGAN", unit: "Batang" },
      { name: "Besi D.8", category: "BESI TULANGAN", unit: "Batang" }, { name: "Besi P.6", category: "BESI TULANGAN", unit: "Batang" },
      { name: "Besi P.8", category: "BESI TULANGAN", unit: "Batang" }, { name: "Besi P.10", category: "BESI TULANGAN", unit: "Batang" },
      { name: "Besi P.12", category: "BESI TULANGAN", unit: "Batang" }, { name: "Besi DS.7", category: "BESI TULANGAN", unit: "Batang" },
      { name: "Besi DS.3", category: "BESI TULANGAN", unit: "Batang" }, { name: "WIRE 5.5", category: "BESI TULANGAN", unit: "Kg" },
      { name: "PC. STANDART 12,7", category: "BESI TULANGAN", unit: "Kg" }, { name: "PLAT. 6", category: "PLAT BESI", unit: "Lembar" },
      { name: "PLAT. 8", category: "PLAT BESI", unit: "Lembar" }, { name: "BESI STRIP 5", category: "PLAT BESI", unit: "Batang" },
      { name: "Bendrat", category: "KAWAT & SUPPORT", unit: "Kg" }, { name: "Klem", category: "KAWAT & SUPPORT", unit: "Pcs" },
      { name: "Stapping", category: "KAWAT & SUPPORT", unit: "Roll" }, { name: "Minyak Bekisting", category: "KIMIA & CAIRAN", unit: "Liter" },
      { name: "Solar", category: "KIMIA & CAIRAN", unit: "Liter" }, { name: "Additive NP", category: "KIMIA & CAIRAN", unit: "Liter" },
      { name: "Additive HE", category: "KIMIA & CAIRAN", unit: "Liter" }
    ];
    let sukses = 0;
    for(const item of dataSuntikan) {
      const isExist = initialMaterials.some(m => m.name.toLowerCase() === item.name.toLowerCase());
      if (!isExist) { try { await fetch("/api/inventory/master", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) }); sukses++; } catch (e) {} }
    }
    alert(`BOSSKU! Proses Selesai! 🎉\nBerhasil menyuntikkan ${sukses} material baru.`);
    setLoading(false); router.refresh();
  }

  async function handleAddMaterial() {
    if (!materialForm.name || !materialForm.unit) return alert("Isi maki' nama dan satuan!");
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/master", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(materialForm) });
      if (res.ok) { alert("Sukses!"); setShowAddModal(false); setMaterialForm({ name: "", category: "Raw Material", unit: "Kg" }); router.refresh(); }
    } catch (e) { alert("Eror koneksi!"); } finally { setLoading(false); }
  }

  async function handleEditMaterial() {
    if (!materialForm.name || !materialForm.unit) return alert("Data tidak boleh kosong!");
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/master/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(materialForm) });
      if (res.ok) { alert("Sukses!"); setShowEditModal(false); router.refresh(); }
    } catch (e) { alert("Eror koneksi!"); } finally { setLoading(false); }
  }

  async function handleDeleteMaterial(id: string, name: string) {
    if (!confirm(`Yakin maki' mau hapus material "${name}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/master/${id}`, { method: "DELETE" });
      if (res.ok) { alert("Sukses!"); router.refresh(); }
    } catch (e) { alert("Eror!"); } finally { setLoading(false); }
  }

  function openEditModal(m: any) { setEditingId(m.id); setMaterialForm({ name: m.name, category: m.category, unit: m.unit }); setShowEditModal(true); }

  async function handleInbound() {
    if (!inboundForm.materialId || !inboundForm.qty) return alert("Lengkapi data barang masuk!");
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/inbound", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inboundForm) });
      if (res.ok) { alert("Stok berhasil ditambah!"); setShowInboundModal(false); router.refresh(); }
    } catch (e) { alert("Eror!"); } finally { setLoading(false); }
  }

  async function handleOutbound() {
    if (!outboundForm.materialId || !outboundForm.qty) return alert("Lengkapi data barang keluar!");
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/outbound", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(outboundForm) });
      if (res.ok) { alert("Stok berhasil dipotong!"); setShowOutboundModal(false); router.refresh(); }
    } catch (e) { alert("Eror!"); } finally { setLoading(false); }
  }

  function openFgOutbound(fg: any) {
    setSelectedFg(fg);
    setFgForm({ qty: "", recipient: "" });
    setShowFgModal(true);
  }

  async function submitFgOutbound() {
    if (!selectedFg || !fgForm.qty || !fgForm.recipient) return alert("Jumlah dan Keterangan wajib diisi!");
    if (Number(fgForm.qty) > selectedFg.stock) return alert("Error: Jumlah yang dikeluarkan melebihi stok yang ada di gudang!");
    
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/fg-outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fgId: selectedFg.id, qty: fgForm.qty, recipient: fgForm.recipient })
      });

      if (!res.ok) throw new Error("Gagal memproses pengeluaran barang jadi.");
      alert("✅ Barang Berhasil Dikeluarkan!");
      setShowFgModal(false);
      router.refresh();
    } catch (err: any) {
      alert("💥 ERROR: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ================= ACTION HAPUS HISTORY (REVERT STOCK) =================
  async function handleDeleteInbound(id: string) {
    if (!confirm("⚠️ PERINGATAN!\nYakin ingin membatalkan/menghapus riwayat masuk ini?\nStok gudang akan otomatis DIKURANGI kembali!")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/inbound/${id}`, { method: "DELETE" });
      if (res.ok) { alert("✅ Riwayat dihapus & Stok berhasil dikembalikan!"); router.refresh(); }
      else throw new Error("Gagal menghapus data");
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  }

  async function handleDeleteOutbound(id: string) {
    if (!confirm("⚠️ PERINGATAN!\nYakin ingin membatalkan riwayat keluar ini?\nStok gudang akan otomatis DITAMBAHKAN kembali!")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/outbound/${id}`, { method: "DELETE" });
      if (res.ok) { alert("✅ Riwayat dihapus & Stok berhasil dikembalikan!"); router.refresh(); }
      else throw new Error("Gagal menghapus data");
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  }

  async function handleDeleteFgOutbound(id: string) {
    if (!confirm("⚠️ PERINGATAN!\nYakin ingin membatalkan pengiriman FG ini?\nStok Barang Jadi akan otomatis DITAMBAHKAN kembali!")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/fg-outbound/${id}`, { method: "DELETE" });
      if (res.ok) { alert("✅ Pengiriman dibatalkan & Stok FG berhasil dikembalikan!"); router.refresh(); }
      else throw new Error("Gagal menghapus data");
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="space-y-8 print:bg-white print:text-black print:p-0 text-slate-800 dark:text-slate-100">
      <div className="border-b border-border pb-6 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-2">
              <Warehouse className="w-8 h-8" />
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Gudang Pusat</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Pusat Kendali Logistik Kalla Beton</p>
          </div>
          
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-border">
            <button onClick={() => setActiveTab("RAW")} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === "RAW" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}>
              <Box className="w-4 h-4" /> Bahan Baku (Raw)
            </button>
            <button onClick={() => setActiveTab("FG")} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === "FG" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}>
              <PackagePlus className="w-4 h-4" /> Barang Jadi (FG)
            </button>
          </div>
        </div>
      </div>

      {/* --- TAB RAW MATERIAL --- */}
      {activeTab === "RAW" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
            <h2 className="text-lg font-black text-slate-800 dark:text-white">Stok Bahan Baku (Teralokasi BOM)</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleExportRawStock('excel')} className="bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-border px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2"><FileSpreadsheet size={14}/> Excel</button>
              <button onClick={() => handleExportRawStock('pdf')} className="bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-red-700 dark:text-red-400 border border-border px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 mr-4"><FileText size={14}/> Pdf</button>

              <button onClick={handleSuntikOtomatis} disabled={loading} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm">
                <Zap size={14} /> Suntik Material
              </button>
              <button onClick={() => setShowAddModal(true)} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-bold text-xs border border-border shadow-sm">+ Barang Baru</button>
              <button onClick={() => setShowInboundModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs flex gap-2 shadow-sm"><ArrowDownCircle size={14}/> Inbound</button>
              <button onClick={() => setShowOutboundModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs flex gap-2 shadow-sm"><ArrowUpCircle size={14}/> Outbound</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRaw.length === 0 && <div className="text-slate-500 dark:text-slate-400 col-span-full">Barang tidak ditemukan.</div>}
            {filteredRaw.map((m: any) => {
              const allocated = allocatedBOMs[m.id] || m.bookedAmount || 0;
              const available = parseFloat(m.stock) - allocated;

              return (
                <div key={m.id} className="bg-card p-5 rounded-2xl border border-border shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition-all print:border-gray-300 print:break-inside-avoid">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded font-bold">{m.category}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                      <button onClick={() => openEditModal(m)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-emerald-700 dark:text-emerald-400"><Edit className="w-3.5 h-3.5" /></button>
                      {session?.role === "admin" && <button onClick={() => handleDeleteMaterial(m.id, m.name)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 print:text-black">{m.name}</h3>
                  
                  <div className="space-y-2 text-xs font-bold bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-border print:bg-white print:border-gray-200">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400"><span>Total fisik gudang</span> <span className="print:text-black text-slate-800 dark:text-slate-200">{formatNumber(parseFloat(m.stock))} {m.unit}</span></div>
                    <div className={`flex justify-between ${allocated > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"}`}>
                      <span>Di-booking BOM proyek</span> <span>-{formatNumber(allocated)} {m.unit}</span>
                    </div>
                    <div className={`border-t border-border pt-2 flex justify-between text-sm ${available < 0 ? "text-red-600 dark:text-red-400 font-extrabold" : "text-emerald-600 dark:text-emerald-400 font-extrabold"}`}>
                      <span>Tersedia bisa dipakai</span> <span>{formatNumber(available)} {m.unit}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border mt-8 flex flex-col md:flex-row gap-4 items-end print:hidden shadow-sm">
            <div className="flex-1 w-full">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 block">Pencarian Barang/Proyek</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" placeholder="Ketik nama barang, vendor, atau proyek..." value={histSearch} onChange={e => setHistSearch(e.target.value)} />
              </div>
            </div>
            <div className="w-full md:w-auto">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 block">Dari Tanggal</label>
              <input type="date" className="bg-card border border-border rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" value={histStartDate} onChange={e => setHistStartDate(e.target.value)} />
            </div>
            <div className="w-full md:w-auto">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 block">Sampai Tanggal</label>
              <input type="date" className="bg-card border border-border rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" value={histEndDate} onChange={e => setHistEndDate(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleExportHistory('excel')} className="bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-border px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 h-[38px]"><FileSpreadsheet size={14}/> Excel</button>
              <button onClick={() => handleExportHistory('pdf')} className="bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-red-700 dark:text-red-400 border border-border px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 h-[38px]"><FileText size={14}/> Pdf</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 print:hidden">
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-sm font-black text-slate-700 dark:text-slate-200">Riwayat Barang Masuk</h2>
                </div>
                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded">{filteredInbound.length} Data</span>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold border-b border-border sticky top-0">
                    <tr>
                      <th className="p-4">Tanggal</th><th className="p-4">Item</th><th className="p-4">Vendor</th><th className="p-4 text-right">Jumlah</th>
                      {session?.role === "admin" && <th className="p-4 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredInbound.map((h: any) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="p-4 text-slate-500 dark:text-slate-400">{formatDate(h.entryDate)}</td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{h.materialName || "-"}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">{h.vendorName || "-"}</td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+{formatNumber(h.qty)}</td>
                        {session?.role === "admin" && (
                          <td className="p-4 text-center">
                            <button onClick={() => handleDeleteInbound(h.id)} disabled={loading} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Hapus Riwayat (Revert Stok)">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-border flex items-center justify-between">
                 <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h2 className="text-sm font-black text-slate-700 dark:text-slate-200">Riwayat Barang Keluar</h2>
                 </div>
                 <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded">{filteredOutbound.length} Data</span>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold border-b border-border sticky top-0">
                    <tr>
                      <th className="p-4">Tanggal</th><th className="p-4">Item</th><th className="p-4">Penerima</th><th className="p-4 text-right">Jumlah</th>
                      {session?.role === "admin" && <th className="p-4 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredOutbound.map((h: any) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="p-4 text-slate-500 dark:text-slate-400">{formatDate(h.exitDate)}</td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{h.materialName || "-"}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">{h.recipient || "-"}</td>
                        <td className="p-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">-{formatNumber(h.qty)}</td>
                        {session?.role === "admin" && (
                          <td className="p-4 text-center">
                            <button onClick={() => handleDeleteOutbound(h.id)} disabled={loading} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Hapus Riwayat (Revert Stok)">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB BARANG JADI (FG) --- */}
      {activeTab === "FG" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
            <h2 className="text-lg font-black text-slate-800 dark:text-white">Stok Barang Jadi (Siap Kirim)</h2>
            <div className="flex gap-2">
               <button onClick={() => handleExportFGStock('excel')} className="bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-border px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2"><FileSpreadsheet size={14}/> Excel</button>
               <button onClick={() => handleExportFGStock('pdf')} className="bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-red-700 dark:text-red-400 border border-border px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2"><FileText size={14}/> Pdf</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFg.length === 0 ? (
              <div className="col-span-full p-10 bg-slate-50 dark:bg-slate-900/50 border border-border rounded-2xl text-center text-slate-400 dark:text-slate-500 font-bold border-dashed">
                Belum ada Barang Jadi (FG) di Gudang.
              </div>
            ) : (
              filteredFg.map((fg: any) => (
                <div key={fg.id} className="bg-card p-6 rounded-2xl border border-border shadow-sm relative hover:border-emerald-500/50 transition-all flex flex-col justify-between print:border-gray-300 print:break-inside-avoid">
                  <div>
                    <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl rounded-tr-xl print:text-black print:border-gray-400">Siap Kirim</div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1 print:text-black">{fg.productName}</h3>
                    <p className="text-slate-400 dark:text-slate-500 text-xs font-bold mb-4">Asal SPK: {fg.spkNumber || "Stok Umum"}</p>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatNumber(fg.stock)}</span>
                      <span className="text-slate-500 dark:text-slate-400 font-bold text-sm">{fg.unit}</span>
                    </div>

                    {/* Riwayat Keluar FG */}
                    {fg.outbounds && fg.outbounds.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-2">Riwayat Keluar:</h4>
                        <div className="max-h-28 overflow-y-auto space-y-2 pr-1">
                          {fg.outbounds.map((out: any) => (
                            <div key={out.id} className="flex justify-between items-center text-[10px] bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-border print:bg-white print:border-gray-200 group">
                              <div>
                                <div className="text-red-600 dark:text-red-400 font-bold">-{out.qty} {fg.unit}</div>
                                <div className="text-slate-400 dark:text-slate-500">{formatDate(out.exitDate)}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right text-slate-600 dark:text-slate-400 max-w-[120px] truncate" title={out.recipient}>
                                  {out.recipient}
                                </div>
                                {session?.role === "admin" && (
                                  <button onClick={() => handleDeleteFgOutbound(out.id)} disabled={loading} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden" title="Batalkan Pengiriman (Revert Stok)">
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button onClick={() => openFgOutbound(fg)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-sm mt-4 print:hidden">
                    <Truck size={16} /> Keluarkan Barang
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODALS FORM */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card p-8 rounded-3xl w-full max-w-md border border-border shadow-2xl">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Daftarkan Material</h2>
            <div className="space-y-4">
              <input className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" placeholder="Nama Barang" value={materialForm.name} onChange={e => setMaterialForm({...materialForm, name: e.target.value})} />
              <select className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" value={materialForm.category} onChange={e => setMaterialForm({...materialForm, category: e.target.value})}>
                <option value="Raw Material">Raw Material</option><option value="MATERIAL BETON">MATERIAL BETON</option><option value="BESI TULANGAN">BESI TULANGAN</option><option value="PLAT BESI">PLAT BESI</option><option value="KAWAT & SUPPORT">KAWAT & SUPPORT</option><option value="KIMIA & CAIRAN">KIMIA & CAIRAN</option>
              </select>
              <input className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" placeholder="Satuan (Kg, Batang, Zak)" value={materialForm.unit} onChange={e => setMaterialForm({...materialForm, unit: e.target.value})} />
              <button onClick={handleAddMaterial} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 p-4 rounded-2xl font-black mt-4 text-white flex justify-center shadow-sm">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Master Barang"}
              </button>
              <button onClick={() => setShowAddModal(false)} className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xs mt-2">Batalkan</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card p-8 rounded-3xl w-full max-w-md border border-border shadow-2xl">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Edit Material</h2>
            <div className="space-y-4">
              <input className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" value={materialForm.name} onChange={e => setMaterialForm({...materialForm, name: e.target.value})} />
              <select className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" value={materialForm.category} onChange={e => setMaterialForm({...materialForm, category: e.target.value})}>
                <option value="Raw Material">Raw Material</option><option value="MATERIAL BETON">MATERIAL BETON</option><option value="BESI TULANGAN">BESI TULANGAN</option><option value="PLAT BESI">PLAT BESI</option><option value="KAWAT & SUPPORT">KAWAT & SUPPORT</option><option value="KIMIA & CAIRAN">KIMIA & CAIRAN</option>
              </select>
              <input className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" value={materialForm.unit} onChange={e => setMaterialForm({...materialForm, unit: e.target.value})} />
              <button onClick={handleEditMaterial} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 p-4 rounded-2xl font-black mt-4 text-white flex justify-center shadow-sm">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Perubahan"}
              </button>
              <button onClick={() => setShowEditModal(false)} className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xs mt-2">Batalkan</button>
            </div>
          </div>
        </div>
      )}

      {showInboundModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card p-8 rounded-3xl w-full max-w-md border border-border shadow-2xl">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Input Barang Masuk</h2>
            <div className="space-y-4">
              <select className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" onChange={e => setInboundForm({...inboundForm, materialId: e.target.value})}>
                <option value="">-- Pilih Material --</option>
                {initialMaterials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" placeholder="Nama Vendor / Suplier" onChange={e => setInboundForm({...inboundForm, vendorName: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 font-mono" placeholder="Jumlah" onChange={e => setInboundForm({...inboundForm, qty: e.target.value})} />
                <input type="date" className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" value={inboundForm.entryDate} onChange={e => setInboundForm({...inboundForm, entryDate: e.target.value})} />
              </div>
              <textarea className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 h-20 resize-none" placeholder="Keterangan" onChange={e => setInboundForm({...inboundForm, notes: e.target.value})}></textarea>
              <button onClick={handleInbound} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 p-4 rounded-2xl font-black mt-4 text-white flex justify-center shadow-sm">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Tambah Stok"}
              </button>
              <button onClick={() => setShowInboundModal(false)} className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xs mt-2">Batalkan</button>
            </div>
          </div>
        </div>
      )}

      {showOutboundModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card p-8 rounded-3xl w-full max-w-md border border-border shadow-2xl">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Catat Barang Keluar</h2>
            <div className="space-y-4">
              <select className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" onChange={e => setOutboundForm({...outboundForm, materialId: e.target.value})}>
                <option value="">-- Pilih Material --</option>
                {initialMaterials.map((m: any) => <option key={m.id} value={m.id}>{m.name} (Stok: {formatNumber(parseFloat(m.stock))})</option>)}
              </select>
              <input className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" placeholder="Tujuan / Penerima Lapangan" onChange={e => setOutboundForm({...outboundForm, recipient: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 font-mono" placeholder="Jumlah Dipakai" onChange={e => setOutboundForm({...outboundForm, qty: e.target.value})} />
                <input type="date" className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" value={outboundForm.exitDate} onChange={e => setOutboundForm({...outboundForm, exitDate: e.target.value})} />
              </div>
              <textarea className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 h-20 resize-none" placeholder="Keterangan" onChange={e => setOutboundForm({...outboundForm, notes: e.target.value})}></textarea>
              <button onClick={handleOutbound} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 p-4 rounded-2xl font-black mt-4 text-white flex justify-center shadow-sm">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Potong Stok"}
              </button>
              <button onClick={() => setShowOutboundModal(false)} className="w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xs mt-2">Batalkan</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Keluarkan Barang Jadi (FG) */}
      {showFgModal && selectedFg && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-card p-8 rounded-3xl w-full max-w-md border border-border shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <ArrowUpRight className="text-emerald-600 dark:text-emerald-400" /> Keluarkan Barang
              </h2>
              <button onClick={() => setShowFgModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl bg-slate-100 dark:bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center">✕</button>
            </div>
            
            <div className="mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-border">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Barang:</div>
              <div className="text-emerald-700 dark:text-emerald-400 font-bold">{selectedFg.productName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-3 mb-1">Sisa Stok di Gudang:</div>
              <div className="text-slate-800 dark:text-slate-100 font-mono font-bold text-lg">{formatNumber(selectedFg.stock)} {selectedFg.unit}</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 block">Jumlah Keluar *</label>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="0" className="flex-1 bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 font-mono" 
                    value={fgForm.qty} onChange={e => setFgForm({...fgForm, qty: e.target.value})} />
                  <span className="text-slate-500 dark:text-slate-400 font-bold text-sm bg-slate-50 dark:bg-slate-900/50 px-4 py-3 rounded-xl border border-border">{selectedFg.unit}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 block">Keterangan / Tujuan Keluar *</label>
                <textarea rows={3} placeholder="Misal: Diambil Mandor A untuk Proyek B..." className="w-full bg-card border border-border p-3 rounded-xl text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 resize-none text-sm" 
                  value={fgForm.recipient} onChange={e => setFgForm({...fgForm, recipient: e.target.value})} />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button onClick={() => setShowFgModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-4 rounded-2xl font-bold text-slate-500 dark:text-slate-400 text-xs">Batalkan</button>
                <button onClick={submitFgOutbound} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 p-4 rounded-2xl font-black text-white shadow-sm text-xs flex justify-center items-center">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Proses Keluar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}