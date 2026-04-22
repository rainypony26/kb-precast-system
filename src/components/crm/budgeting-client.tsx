"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatRupiah } from "@/lib/utils";
// --- IMPORT UNTUK EXPORT ---
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { FileSpreadsheet, FileText, TrendingUp } from "lucide-react";

export default function BudgetingClient() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRabModal, setShowRabModal] = useState(false);
  const [showRealModal, setShowRealModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const [rabForm, setRabForm] = useState({ planId: "", category: "MATERIAL", description: "", amount: "", notes: "" });
  const [realForm, setRealForm] = useState({ rabId: "", amount: "", date: new Date().toISOString().split("T")[0], notes: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/budgeting/summary");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const result = await res.json();
      if (Array.isArray(result)) setData(result);
    } catch (err) { 
      console.error("Fetch Error:", err); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (type: string, body: any) => {
    if (type === "RAB" && (!body.planId || !body.amount)) return alert("Lengkapi data RAB!");
    if (type === "REALISASI" && (!body.rabId || !body.amount)) return alert("Lengkapi data Realisasi!");

    const res = await fetch("/api/budgeting", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, type })
    });
    if (res.ok) {
      alert("Data berhasil disimpan!");
      setShowRabModal(false); setShowRealModal(false);
      fetchData();
    } else {
      alert("Gagal menyimpan data.");
    }
  };

  const filteredData = useMemo(() => {
    return (data || []).filter(item => 
      item.spkNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.projectName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  // --- FUNGSI EXPORT ---
  const handleDownloadExcel = () => {
    const excelData = filteredData.map(d => ({
      "No. SPK": d.spkNumber,
      "Proyek": d.projectName,
      "Total RAB": d.totalPlanned,
      "Realisasi": d.totalRealized,
      "Sisa Budget": d.remaining,
      "Status": d.remaining < 0 ? "OVER BUDGET" : "AMAN"
    }));
    exportToExcel(excelData, `Budget_KallaBeton_${new Date().toLocaleDateString()}`);
  };

  const handleDownloadPDF = () => {
    const headers = [["No. SPK", "Proyek", "RAB", "Realisasi", "Sisa"]];
    const body = filteredData.map(d => [
      d.spkNumber, d.projectName, formatRupiah(d.totalPlanned), formatRupiah(d.totalRealized), formatRupiah(d.remaining)
    ]);
    exportToPDF("LAPORAN BUDGETING KALLA BETON", headers, body, "Budget_Report");
  };

  return (
    <div className="p-8 bg-[#0b0d11] min-h-screen text-[#e2e8f0]">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
             <TrendingUp size={20} />
             <h1 className="text-3xl font-black italic tracking-tighter uppercase">Financial Control</h1>
          </div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Kalla Beton Cost Management System</p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={handleDownloadExcel} className="flex items-center gap-2 bg-[#161a23] hover:bg-[#1e2533] border border-[#2d3748] px-5 py-3 rounded-xl font-black text-xs transition-all text-slate-300">
            <FileSpreadsheet size={16} className="text-emerald-500"/> EXCEL
          </button>
          <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-[#161a23] hover:bg-[#1e2533] border border-[#2d3748] px-5 py-3 rounded-xl font-black text-xs transition-all text-slate-300">
            <FileText size={16} className="text-red-500"/> PDF
          </button>
          <button onClick={() => { setRabForm({ ...rabForm, planId: "" }); setShowRabModal(true); }} className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl font-black text-xs transition-all shadow-lg shadow-emerald-900/20">
            + RENCANA ANGGARAN (RAB)
          </button>
        </div>
      </div>

      <input className="w-full max-w-md bg-[#161a23] border border-[#2d3748] rounded-2xl p-4 mb-10 outline-none focus:border-emerald-500 shadow-2xl" placeholder="🔍 Cari SPK atau Proyek..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />

      {loading ? <div className="text-center py-20 text-slate-500 font-bold animate-pulse">MENGANALISA KEUANGAN SISTEM...</div> : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {filteredData.length === 0 ? <p className="text-slate-500">Belum ada data SPK yang tersedia.</p> : filteredData.map(item => (
            <div key={item.id} className="bg-[#161a23] rounded-[2.5rem] border border-[#2d3748] p-8 shadow-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/20 mb-2 inline-block uppercase">{item.spkNumber}</span>
                  <h3 className="text-2xl font-black text-white">{item.projectName}</h3>
                </div>
                <button onClick={() => { setSelectedPlan(item); setShowRealModal(true); }} className="bg-white/5 hover:bg-white/10 text-white text-[10px] font-black px-4 py-2 rounded-xl border border-white/10 transition-all">REALISASI BIAYA</button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-[#0b0d11] p-4 rounded-2xl border border-white/5">
                  <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Total RAB</p>
                  <p className="text-sm font-bold text-emerald-400">{formatRupiah(item.totalPlanned)}</p>
                </div>
                <div className="bg-[#0b0d11] p-4 rounded-2xl border border-white/5">
                  <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Realisasi</p>
                  <p className="text-sm font-bold text-red-400">{formatRupiah(item.totalRealized)}</p>
                </div>
                <div className="bg-[#0b0d11] p-4 rounded-2xl border border-white/5">
                  <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Sisa Anggaran</p>
                  <p className={`text-sm font-bold ${item.remaining < 0 ? 'text-red-500' : 'text-white'}`}>{formatRupiah(item.remaining)}</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Breakdown Kategori</p>
                {(item.categories || []).map((cat: any) => (
                  <div key={cat.category}>
                    <div className="flex justify-between text-[10px] font-bold mb-1.5 uppercase">
                      <span className="text-slate-400">{cat.category}</span>
                      <span>{Math.round((cat.realized / (cat.planned || 1)) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ${cat.realized > cat.planned ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((cat.realized / (cat.planned || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL RAB --- */}
      {showRabModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
          <div className="bg-[#161a23] p-10 rounded-[3rem] w-full max-w-lg border border-[#2d3748] shadow-2xl">
            <h2 className="text-2xl font-black mb-6 italic uppercase">Rencana Anggaran (RAB)</h2>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Pilih Nomor SPK Aktif</label>
              <select className="w-full bg-[#0b0d11] border border-[#2d3748] p-4 rounded-2xl text-white font-bold outline-none" 
                value={rabForm.planId}
                onChange={e => setRabForm({...rabForm, planId: e.target.value})}>
                <option value="">-- Pilih SPK --</option>
                {/* Menampilkan semua SPK yang ditarik dari database */}
                {(data || []).map(p => <option key={p.id} value={p.id}>{p.spkNumber} - {p.projectName}</option>)}
              </select>
              
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Kategori Biaya</label>
              <select className="w-full bg-[#0b0d11] border border-[#2d3748] p-4 rounded-2xl text-white font-bold" value={rabForm.category} onChange={e => setRabForm({...rabForm, category: e.target.value})}>
                {["MATERIAL", "MANPOWER", "EQUIPMENT", "OVERHEAD", "LAINNYA"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              
              <input className="w-full bg-[#0b0d11] border border-[#2d3748] p-4 rounded-2xl text-white" placeholder="Deskripsi (Misal: Pembelian Semen Tonasa)" value={rabForm.description} onChange={e => setRabForm({...rabForm, description: e.target.value})} />
              <input className="w-full bg-[#0b0d11] border border-[#2d3748] p-4 rounded-2xl text-white" type="number" placeholder="Nilai Anggaran (Rp)" value={rabForm.amount} onChange={e => setRabForm({...rabForm, amount: e.target.value})} />
              
              <button onClick={() => handleSave("RAB", rabForm)} className="w-full bg-emerald-600 p-5 rounded-2xl font-black mt-6 hover:bg-emerald-500 transition-all text-white">SIMPAN RENCANA</button>
              <button onClick={() => setShowRabModal(false)} className="w-full text-slate-500 font-bold text-xs mt-4 uppercase">Batalkan</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL REALISASI --- */}
      {showRealModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
          <div className="bg-[#161a23] p-10 rounded-[3rem] w-full max-w-lg border border-[#2d3748] shadow-2xl">
            <h2 className="text-2xl font-black mb-2 italic uppercase text-red-500">Input Realisasi Biaya</h2>
            <p className="text-slate-500 text-xs font-bold mb-8 uppercase">Proyek: {selectedPlan.projectName}</p>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Pilih Item Anggaran (RAB)</label>
              <select className="w-full bg-[#0b0d11] border border-[#2d3748] p-4 rounded-2xl text-white font-bold" onChange={e => setRealForm({...realForm, rabId: e.target.value})}>
                <option value="">-- Pilih Item RAB --</option>
                {(selectedPlan.rabItems || []).map((r: any) => <option key={r.id} value={r.id}>{r.category} - {r.description}</option>)}
              </select>
              <input className="w-full bg-[#0b0d11] border border-[#2d3748] p-4 rounded-2xl text-white" type="number" placeholder="Jumlah Realisasi (Rp)" value={realForm.amount} onChange={e => setRealForm({...realForm, amount: e.target.value})} />
              <input className="w-full bg-[#0b0d11] border border-[#2d3748] p-4 rounded-2xl text-white" type="date" value={realForm.date} onChange={e => setRealForm({...realForm, date: e.target.value})} />
              <button onClick={() => handleSave("REALISASI", realForm)} className="w-full bg-red-600 p-5 rounded-2xl font-black mt-6 hover:bg-red-500 transition-all text-white">CATAT PENGELUARAN</button>
              <button onClick={() => setShowRealModal(false)} className="w-full text-slate-500 font-bold text-xs mt-4 uppercase">Batalkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}