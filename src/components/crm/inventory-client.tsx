"use client";

import { useState, useMemo } from "react";
import { formatNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Warehouse, Truck, History, Search, FileSpreadsheet, FileText, Loader2, ArrowUpRight, CheckCircle, AlertTriangle } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";

export default function InventoryClient({ fgStock, deliveryLogs, session }: any) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"STOCK" | "DELIVERY">("STOCK");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedFg, setSelectedFg] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    deliveryNumber: "",
    recipient: "",
    qty: "",
    notes: ""
  });

  // Filtered Stock
  const filteredStock = useMemo(() => {
    return fgStock.filter((item: any) => {
      const q = searchQuery.toLowerCase();
      return (
        (item.productName || "").toLowerCase().includes(q) ||
        (item.spkNumber || "").toLowerCase().includes(q) ||
        (item.projectName || "").toLowerCase().includes(q) ||
        (item.projectCode || "").toLowerCase().includes(q)
      );
    });
  }, [fgStock, searchQuery]);

  // Filtered Delivery Logs
  const filteredLogs = useMemo(() => {
    return deliveryLogs.filter((item: any) => {
      const q = searchQuery.toLowerCase();
      return (
        (item.productName || "").toLowerCase().includes(q) ||
        (item.spkNumber || "").toLowerCase().includes(q) ||
        (item.projectName || "").toLowerCase().includes(q) ||
        (item.projectCode || "").toLowerCase().includes(q) ||
        (item.recipient || "").toLowerCase().includes(q) ||
        (item.deliveryNumber || "").toLowerCase().includes(q)
      );
    });
  }, [deliveryLogs, searchQuery]);

  const groupedStock = useMemo(() => {
    const groups: Record<string, {
      projectName: string;
      projectCode?: string;
      items: any[];
    }> = {};

    filteredStock.forEach((item: any) => {
      const projName = item.projectName || "Proyek Lain-Lain";
      if (!groups[projName]) {
        groups[projName] = {
          projectName: projName,
          projectCode: item.projectCode,
          items: []
        };
      }
      groups[projName].items.push(item);
    });

    return Object.values(groups);
  }, [filteredStock]);

  // Open send modal for a specific FG
  function openSendModal(fgItem: any) {
    setSelectedFg(fgItem);
    // Generate automatic Delivery Order Number
    const cleanedSpk = (fgItem.spkNumber || "DO").replace(/[^a-zA-Z0-9]/g, "");
    const dateClean = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const runningNum = Math.floor(1000 + Math.random() * 9000); // Random running fallback
    
    setForm({
      deliveryNumber: `DO-${cleanedSpk}-${dateClean}-${runningNum}`,
      recipient: "",
      qty: "",
      notes: ""
    });
    setShowModal(true);
  }

  // Handle Kirim/Delivery Action
  async function handleSend() {
    if (!selectedFg || !form.qty || !form.recipient || !form.deliveryNumber) {
      alert("Lengkapi nomor surat jalan (DO), penerima/lokasi, dan jumlah pengiriman!");
      return;
    }

    const qtyNum = parseInt(form.qty, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert("Jumlah pengiriman harus berupa angka dan lebih besar dari 0!");
      return;
    }

    if (qtyNum > selectedFg.stock) {
      alert(`Stok tidak mencukupi! Stok tersedia saat ini: ${selectedFg.stock} ${selectedFg.unit}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/inventory/fg-outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fgId: selectedFg.id,
          qty: qtyNum,
          recipient: form.recipient,
          deliveryNumber: form.deliveryNumber,
          notes: form.notes
        }),
      });

      if (res.ok) {
        alert("✅ Pengiriman barang jadi (DO) berhasil dicatat!");
        setShowModal(false);
        router.refresh();
      } else {
        const errorData = await res.json();
        alert(`💥 Gagal memproses pengiriman: ${errorData.error}`);
      }
    } catch (error) {
      alert("💥 Terjadi kesalahan koneksi ke server.");
    } finally {
      setLoading(false);
    }
  }

  // KPI calculations
  const totalStockFG = fgStock.reduce((sum: number, item: any) => sum + (Number(item.stock) || 0), 0);
  const totalShippedFG = deliveryLogs.reduce((sum: number, item: any) => sum + (Number(item.qty) || 0), 0);
  const totalProductsCount = fgStock.length;

  // Export functions
  const handleDownloadExcel = () => {
    if (activeTab === "STOCK") {
      const excelData = filteredStock.map((item: any) => ({
        "Nama Produk": item.productName,
        "No. SPK": item.spkNumber || "-",
        "Kode Proyek": item.projectCode || "-",
        "Nama Proyek": item.projectName || "-",
        "Stok di Gudang": `${item.stock} ${item.unit}`
      }));
      exportToExcel(excelData, `Stok_FG_Warehouse_${new Date().toLocaleDateString()}`);
    } else {
      const excelData = filteredLogs.map((item: any) => ({
        "Tanggal Keluar": new Date(item.exitDate).toLocaleDateString("id-ID"),
        "No. Surat Jalan (DO)": item.deliveryNumber || "-",
        "Nama Produk": item.productName,
        "Penerima / Lokasi": item.recipient,
        "Qty Dikirim": `${item.qty} pcs`,
        "No. SPK": item.spkNumber || "-",
        "Proyek": item.projectName || "-",
        "Catatan": item.notes || "-"
      }));
      exportToExcel(excelData, `Riwayat_Pengiriman_DO_${new Date().toLocaleDateString()}`);
    }
  };

  const handleDownloadPDF = () => {
    if (activeTab === "STOCK") {
      const headers = [["Nama Produk", "SPK", "Proyek", "Stok Ready"]];
      const body = filteredStock.map((item: any) => [
        item.productName,
        item.spkNumber || "-",
        item.projectCode ? `[${item.projectCode}] - ${item.projectName}` : (item.projectName || "-"),
        `${item.stock} ${item.unit}`
      ]);
      exportToPDF("LAPORAN STOK BARANG JADI (FG) - GUDANG PROYEK", headers, body, "Laporan_Stok_FG");
    } else {
      const headers = [["Tanggal", "No. DO", "Produk", "Penerima", "Qty"]];
      const body = filteredLogs.map((item: any) => [
        new Date(item.exitDate).toLocaleDateString("id-ID"),
        item.deliveryNumber || "-",
        item.productName,
        item.recipient,
        `${item.qty} pcs`
      ]);
      exportToPDF("LAPORAN RIWAYAT PENGIRIMAN BARANG (DO) KALLA BETON", headers, body, "Riwayat_Pengiriman_DO");
    }
  };

  return (
    <div className="p-8 min-h-screen text-slate-800 dark:text-slate-100 bg-background font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-border flex items-center justify-center shrink-0">
            <Warehouse className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Gudang Barang Jadi (Finished Goods)</h1>
            <p className="text-slate-550 dark:text-slate-400 text-xs mt-1">Penyimpanan Stok & Logistik Surat Jalan Pengiriman (DO) Precast</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="px-3.5 py-2 bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border hover:border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer" onClick={handleDownloadExcel}>
            <FileSpreadsheet size={15}/> Excel
          </button>
          <button className="px-3.5 py-2 bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border hover:border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer" onClick={handleDownloadPDF}>
            <FileText size={15}/> PDF
          </button>
        </div>
      </div>

      {/* KPI STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-500 dark:text-slate-450 text-xs font-semibold mb-1">Total Stok Ready di Gudang</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{totalStockFG.toLocaleString("id-ID")} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">Pcs</span></div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 rounded-xl"><Warehouse size={18}/></div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-500 dark:text-slate-450 text-xs font-semibold mb-1">Total Barang Terkirim (DO)</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{totalShippedFG.toLocaleString("id-ID")} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">Pcs</span></div>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-455 rounded-xl"><Truck size={18}/></div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-500 dark:text-slate-450 text-xs font-semibold mb-1">Jenis Cetakan Produk</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{totalProductsCount} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">Item</span></div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 rounded-xl"><ArrowUpRight size={18}/></div>
        </div>
      </div>

      {/* TABS & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-border self-start shrink-0 gap-1.5">
          <button 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === "STOCK" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-450 shadow-sm" : "text-slate-500 dark:text-slate-400"}`} 
            onClick={() => setActiveTab("STOCK")}
          >
            <Warehouse size={13}/> Stok Siap Kirim ({filteredStock.length})
          </button>
          <button 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === "DELIVERY" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-450 shadow-sm" : "text-slate-500 dark:text-slate-400"}`} 
            onClick={() => setActiveTab("DELIVERY")}
          >
            <History size={13}/> Riwayat Pengiriman ({filteredLogs.length})
          </button>
        </div>

        <div className="relative min-w-[320px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-semibold shadow-sm"
            placeholder={activeTab === "STOCK" ? "Cari nama produk, SPK, atau proyek..." : "Cari DO, produk, penerima, atau proyek..."}
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      {/* ================= TAB 1: STOK BARANG JADI (FG) ================= */}
      {activeTab === "STOCK" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStock.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 italic bg-card border border-border rounded-2xl">
              Tidak ada stok barang precast di gudang proyek saat ini.
            </div>
          )}
          
          {filteredStock.map((item: any) => {
            // Hitung total dikirim dari deliveryLogs
            const totalShipped = filteredLogs
              .filter((log: any) => log.fgId === item.id)
              .reduce((sum: number, log: any) => sum + (Number(log.qty) || 0), 0);

            const targetVol = Number(item.targetVolume) || 0;
            const stockQty = Number(item.stock) || 0;
            const persentaseStock = targetVol > 0 ? (stockQty / targetVol) * 100 : 0;

            return (
              <div key={item.id} className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between relative overflow-hidden group">
                {/* Badge top row */}
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg font-mono">
                    SPK: {item.spkNumber || "MANUAL"}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${item.stock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    {item.stock > 0 ? "Ready" : "Habis"}
                  </span>
                </div>

                {/* Card Title */}
                <div className="mb-4 flex-1">
                  <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors">
                    {item.productName}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold mt-1">
                    Proyek: {item.projectCode ? `[${item.projectCode}] - ` : ""}{item.projectName}
                  </p>
                </div>

                {/* Inner Stats Box */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 mb-4 text-xs space-y-3">
                  <div>
                    <div className="flex justify-between font-bold mb-1.5">
                      <span className="text-slate-500">Stok Ready: {stockQty.toLocaleString("id-ID")} {item.unit}</span>
                      {targetVol > 0 && (
                        <span className="text-emerald-700">{persentaseStock.toFixed(1)}% dari Target</span>
                      )}
                    </div>
                    {targetVol > 0 ? (
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min(persentaseStock, 100)}%` }} />
                      </div>
                    ) : (
                      <div className="w-full bg-slate-100 h-2 rounded-full border border-dashed border-slate-200" />
                    )}
                  </div>

                  <div className="flex justify-between text-[11px] font-bold text-slate-500 pt-2 border-t border-slate-200/50">
                    <div className="flex items-center gap-1">
                      <Truck size={13} className="text-slate-400" />
                      <span>Terkirim: <b>{totalShipped.toLocaleString("id-ID")} pcs</b></span>
                    </div>
                    <div>
                      <span>Satuan: {item.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="flex justify-end border-t border-slate-100 pt-3">
                  <button 
                    onClick={() => openSendModal(item)}
                    disabled={item.stock <= 0}
                    className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                      item.stock > 0 
                        ? 'bg-emerald-50 border border-emerald-200 hover:bg-emerald-600 hover:text-white text-emerald-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Truck size={12}/> Kirim Barang (DO)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= TAB 2: RIWAYAT DO / DELIVERY LOGS ================= */}
      {activeTab === "DELIVERY" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-border text-slate-500 dark:text-slate-400 font-bold">
                  <th className="p-4">Tanggal Kirim</th>
                  <th className="p-4">No. Surat Jalan (DO)</th>
                  <th className="p-4">Produk Precast</th>
                  <th className="p-4">Penerima / Lokasi</th>
                  <th className="p-4 text-center">Qty Dikirim</th>
                  <th className="p-4">Proyek & SPK</th>
                  <th className="p-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">Belum ada riwayat surat jalan atau pengiriman barang jadi.</td></tr>
                ) : (
                  filteredLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.exitDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 font-mono font-bold text-emerald-800">{log.deliveryNumber || "-"}</td>
                      <td className="p-4 font-bold text-slate-800">{log.productName}</td>
                      <td className="p-4 font-semibold text-slate-700">{log.recipient}</td>
                      <td className="p-4 text-center font-bold text-orange-600 font-mono text-sm">{log.qty.toLocaleString("id-ID")} pcs</td>
                      <td className="p-4">
                        <div className="text-slate-600 font-medium">{log.projectCode ? `[${log.projectCode}] - ` : ""}{log.projectName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">SPK: {log.spkNumber || "-"}</div>
                      </td>
                      <td className="p-4 text-slate-500 italic max-w-[150px] truncate" title={log.notes || "-"}>{log.notes || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: PENGIRIMAN FG (KIRIM BARANG) ================= */}
      {showModal && selectedFg && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card p-6 md:p-8 rounded-3xl w-full max-w-lg border border-border shadow-2xl">
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Truck className="text-emerald-600" /> Buat Surat Jalan (DO)
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center">✕</button>
            </div>

            {/* Fg info */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 mb-6 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500 font-bold text-[9px]">Nama Barang Precast</span>
                <span className="text-slate-800 font-black text-right">{selectedFg.productName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-2">
                <span className="text-slate-400 dark:text-slate-500 font-bold text-[9px]">Asal SPK / Proyek</span>
                <span className="text-slate-800 font-bold text-right">[{selectedFg.spkNumber}] {selectedFg.projectName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-2 items-center">
                <span className="text-slate-400 dark:text-slate-500 font-bold text-[9px]">Stok tersedia di gudang</span>
                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold rounded-lg font-mono">
                  {selectedFg.stock.toLocaleString("id-ID")} {selectedFg.unit}
                </span>
              </div>
            </div>

            {/* Inputs Form */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] text-slate-500 font-bold mb-1.5 block">Nomor Surat Jalan (DO) *</label>
                <input 
                  type="text" 
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-emerald-500 font-mono font-bold" 
                  value={form.deliveryNumber}
                  onChange={e => setForm({...form, deliveryNumber: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-bold mb-1.5 block">Penerima / Lokasi Site Pengiriman *</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Bpk. Andi — Lapangan Proyek Kalla Beton Makassar" 
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-emerald-500" 
                  value={form.recipient}
                  onChange={e => setForm({...form, recipient: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-bold mb-1.5 block">Jumlah Dikirim (pcs) *</label>
                <input 
                  type="number" 
                  placeholder={`Maksimum ${selectedFg.stock} pcs`} 
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-emerald-500 font-mono font-bold" 
                  value={form.qty}
                  onChange={e => setForm({...form, qty: e.target.value})}
                />
                {form.qty && parseInt(form.qty, 10) > selectedFg.stock && (
                  <div className="text-red-500 font-bold mt-1 text-[10px] flex items-center gap-1">
                    <AlertTriangle size={12}/> Jumlah melebihi stok yang tersedia!
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-bold mb-1.5 block">Catatan / Keterangan Tambahan</label>
                <textarea 
                  rows={2} 
                  placeholder="Misal: Truk ekspedisi B 1234 XY, Driver Bpk. Doni" 
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-emerald-500 resize-none" 
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                />
              </div>

              <button 
                onClick={handleSend} 
                disabled={loading || !form.qty || !form.recipient || parseInt(form.qty, 10) > selectedFg.stock}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white p-3.5 rounded-xl font-bold transition-all mt-4 shadow-sm text-xs flex justify-center items-center gap-1"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Kirim Barang & Catat DO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}