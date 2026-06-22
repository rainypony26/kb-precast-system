"use client";

import { useState, useMemo, useEffect } from "react";
import { formatNumber } from "@/lib/utils";
import { PieChart, Wallet, AlertTriangle, TrendingUp, Receipt, Edit3, Loader2, Trash2, FileText, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SessionPayload } from "@/lib/auth";

interface Expense {
  id: string;
  expenseType: string;
  amount: number;
  expenseDate: string | Date | null;
  notes: string | null;
  spkNumber?: string; // Menyimpan context SPK asal pengeluaran
}

interface PurchaseRequest {
  id: string;
  prNumber: string;
  requestDate: string | Date | null;
  amount: number | string;
  description: string;
  status: string;
  notes: string | null;
  spkNumber?: string; // Menyimpan context SPK asal PR
}

interface SubSpk {
  id: string;
  spkNumber: string;
  targetVolume: number;
  totalRab: number;
  totalActual: number;
  fgQty: number;
}

interface BudgetData {
  id: string; // RAB ID or manual-projectId
  projectName: string;
  customerName?: string;
  status: string;
  rabNumber?: string;
  targetVolume?: number;
  unit?: string;
  rabMaterial: number;
  rabManpower: number;
  rabOverhead: number;
  totalRab: number;
  actualMaterial: number;
  actualManpower: number;
  actualOverhead: number;
  totalActual: number;
  expenses: Expense[]; 
  purchaseRequests: PurchaseRequest[];
  spks: SubSpk[];
  totalFG: number;
}

export default function BudgetingClient({ initialData, session }: { initialData: BudgetData[], session: SessionPayload | null }) {
  const router = useRouter();
  const [data, setData] = useState<BudgetData[]>(initialData);
  const [search, setSearch] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  
  // Tab di dalam Modal
  const [activeModalTab, setActiveModalTab] = useState<"BUKU_KAS" | "PR">("BUKU_KAS");

  const [expenseForm, setExpenseForm] = useState({
    planId: "", // Mengikat ke SPK tertentu
    expenseType: "MATERIAL",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    notes: ""
  });

  const [prForm, setPrForm] = useState({
    planId: "", // Mengikat ke SPK tertentu
    prNumber: "",
    amount: "",
    requestDate: new Date().toISOString().split("T")[0],
    description: "",
    notes: ""
  });

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const activeProjects = useMemo(() => data.filter(d => d.status === "AKTIF"), [data]);
  const totalRabAktif = activeProjects.reduce((sum, item) => sum + item.totalRab, 0);
  const totalActualAktif = activeProjects.reduce((sum, item) => sum + item.totalActual, 0);
  const sisaBudget = totalRabAktif - totalActualAktif;

  const filteredData = useMemo(() => {
    return data.filter(d => 
      !search || 
      (d.projectName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (d.customerName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (d.rabNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      d.spks.some(s => s.spkNumber.toLowerCase().includes(search.toLowerCase()))
    );
  }, [data, search]);

  const groupedProjects = useMemo(() => {
    const groups: Record<string, {
      projectName: string;
      customerName?: string;
      totalRab: number;
      totalActual: number;
      items: BudgetData[];
    }> = {};

    filteredData.forEach(item => {
      const projName = item.projectName;
      if (!groups[projName]) {
        groups[projName] = {
          projectName: projName,
          customerName: item.customerName,
          totalRab: 0,
          totalActual: 0,
          items: []
        };
      }
      groups[projName].totalRab += item.totalRab;
      groups[projName].totalActual += item.totalActual;
      groups[projName].items.push(item);
    });

    return Object.values(groups);
  }, [filteredData]);

  function openEditModal(item: BudgetData) {
    const freshItem = data.find(d => d.id === item.id) || item;
    setEditItem(freshItem);
    setActiveModalTab("BUKU_KAS");
    
    // Set default SPK tujuan
    const defaultSpkId = freshItem.spks[0]?.id || "";
    setExpenseForm({ planId: defaultSpkId, expenseType: "MATERIAL", amount: "", expenseDate: new Date().toISOString().split("T")[0], notes: "" });
    setPrForm({ planId: defaultSpkId, prNumber: "", amount: "", requestDate: new Date().toISOString().split("T")[0], description: "", notes: "" });
    setShowModal(true);
  }

  // ================= ACTIONS BUKU KAS =================

  async function handleAddExpense() {
    if (!editItem || !expenseForm.amount || !expenseForm.planId) {
      alert("Pilih SPK tujuan dan isi nominal pengeluaran!");
      return;
    }
    setLoading(true);

    try {
      const payload = { ...expenseForm };
      const res = await fetch(`/api/expenses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal mencatat pengeluaran");
      }

      const newExpense = await res.json();
      const associatedSpk = editItem.spks.find(s => s.id === expenseForm.planId);
      const spkNumberContext = associatedSpk?.spkNumber || "-";

      setEditItem(prev => prev ? {
        ...prev,
        actualMaterial: expenseForm.expenseType === "MATERIAL" ? prev.actualMaterial + Number(expenseForm.amount) : prev.actualMaterial,
        actualManpower: expenseForm.expenseType === "MANPOWER" ? prev.actualManpower + Number(expenseForm.amount) : prev.actualManpower,
        actualOverhead: expenseForm.expenseType === "OVERHEAD" ? prev.actualOverhead + Number(expenseForm.amount) : prev.actualOverhead,
        totalActual: prev.totalActual + Number(expenseForm.amount),
        expenses: [{ ...newExpense, spkNumber: spkNumberContext }, ...prev.expenses]
      } : null);

      setExpenseForm(prev => ({ ...prev, amount: "", notes: "" }));
      router.refresh(); 
      alert("✅ Pengeluaran kas berhasil dicatat!");
    } catch (err: any) {
      alert("💥 ERROR: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteExpense(expenseId: string, amount: number, type: string) {
    if (!confirm("Yakin hapus histori pengeluaran ini? Total aktual proyek akan otomatis disesuaikan!")) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menghapus nota");
      }

      setEditItem(prev => prev ? {
        ...prev,
        actualMaterial: type === "MATERIAL" ? prev.actualMaterial - amount : prev.actualMaterial,
        actualManpower: type === "MANPOWER" ? prev.actualManpower - amount : prev.actualManpower,
        actualOverhead: type === "OVERHEAD" ? prev.actualOverhead - amount : prev.actualOverhead,
        totalActual: prev.totalActual - amount,
        expenses: prev.expenses.filter(e => e.id !== expenseId)
      } : null);

      router.refresh();
    } catch (err: any) {
      alert("💥 ERROR: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ================= ACTIONS PURCHASE REQUEST (PR) =================

  async function handleAddPR() {
    if (!editItem || !prForm.planId || !prForm.prNumber || !prForm.amount || !prForm.description) {
      alert("Lengkapi SPK tujuan, Nomor PR, Kuantitas/Nominal, dan Rincian!"); return;
    }
    setLoading(true);

    try {
      const payload = { ...prForm };
      const res = await fetch(`/api/purchase-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal membuat PR");
      }

      const newPR = await res.json();
      const associatedSpk = editItem.spks.find(s => s.id === prForm.planId);
      const spkNumberContext = associatedSpk?.spkNumber || "-";

      // Optimistic UI Update PR
      setEditItem(prev => prev ? {
        ...prev,
        purchaseRequests: [{ ...newPR, spkNumber: spkNumberContext }, ...prev.purchaseRequests]
      } : null);

      setPrForm(prev => ({ ...prev, prNumber: "", amount: "", description: "", notes: "" }));
      router.refresh();
      alert("✅ Pengajuan PR berhasil dibuat!");
    } catch (err: any) {
      alert("💥 ERROR: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePRStatus(prId: string, newStatus: string) {
    if (!confirm(`Yakin mengubah status PR ini menjadi ${newStatus}?`)) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/purchase-requests/${prId}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ status: newStatus }) 
      });
      
      if (!res.ok) throw new Error("Gagal update status PR");

      setEditItem(prev => prev ? {
        ...prev,
        purchaseRequests: prev.purchaseRequests.map(pr => pr.id === prId ? { ...pr, status: newStatus } : pr)
      } : null);

      router.refresh();
    } catch (err: any) {
      alert("💥 ERROR: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePR(prId: string) {
    if (!confirm("Yakin menghapus dokumen PR ini secara permanen?")) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/purchase-requests/${prId}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal hapus PR");
      }

      setEditItem(prev => prev ? {
        ...prev,
        purchaseRequests: prev.purchaseRequests.filter(pr => pr.id !== prId)
      } : null);

      router.refresh();
    } catch (err: any) {
      alert("💥 ERROR: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string | Date | null) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" });
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <Wallet className="w-8 h-8" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Kontrol Budget Proyek</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Monitoring anggaran RAB vs realisasi biaya proyek</p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2 flex items-center gap-2"><PieChart size={14}/> Anggaran RAB (proyek aktif)</div>
          <div className="text-2xl font-black text-foreground">Rp {formatNumber(totalRabAktif)}</div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2 flex items-center gap-2"><Receipt size={14}/> Realisasi pengeluaran (aktual)</div>
          <div className="text-2xl font-black text-orange-600">Rp {formatNumber(totalActualAktif)}</div>
        </div>
        <div className="bg-emerald-600 p-6 rounded-2xl border border-emerald-500 shadow-sm shadow-emerald-600/10">
          <div className="text-emerald-100 text-xs font-semibold mb-2 flex items-center gap-2"><TrendingUp size={14}/> Sisa anggaran aman</div>
          <div className="text-2xl font-black text-white">Rp {formatNumber(sisaBudget)}</div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-foreground">Daftar kontrol biaya per RAB</h2>
        <input 
          className="bg-card border border-border rounded-xl px-4 py-2 text-sm text-foreground outline-none focus:border-emerald-500 min-w-[250px] shadow-sm" 
          placeholder="Cari Proyek, No. RAB, atau SPK..." 
          value={search} onChange={e => setSearch(e.target.value)} 
        />
      </div>

      {/* RAB CARDS (Grid Layout matching Screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredData.length === 0 && <div className="text-slate-500 col-span-full text-center py-10 bg-card border border-border rounded-2xl">Tidak ada data RAB yang sesuai.</div>}
        
        {filteredData.map(item => {
          const persentaseBudget = item.totalRab > 0 ? (item.totalActual / item.totalRab) * 100 : 0;
          const persentaseFisik = item.targetVolume && item.targetVolume > 0 ? ((item.totalFG || 0) / item.targetVolume) * 100 : 0;
          
          const isDanger = persentaseBudget >= 90;
          const isWarning = persentaseBudget >= 75 && persentaseBudget < 90;

          const hppRab = item.totalRab / (item.targetVolume || 1);
          const hppAktual = item.totalFG && item.totalFG > 0 ? item.totalActual / item.totalFG : 0;
          const hppDeviasiPercent = hppRab > 0 ? ((hppAktual - hppRab) / hppRab) * 100 : 0;

          return (
            <div key={item.id} className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-emerald-300 transition-all">
              {/* Card Header Badges */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg inline-block mb-2 font-mono">
                    RAB: {item.rabNumber || "MANUAL"}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug mt-1">
                    {item.projectName}
                  </h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${item.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                  {item.status}
                </span>
              </div>

              {/* Inner Stats Box */}
              <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 mb-4 text-xs space-y-4">
                {/* 1. Realisasi Fisik */}
                <div>
                  <div className="flex justify-between font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    <span>Target Realisasi: {item.totalFG || 0} / {item.targetVolume || 0} {item.unit || "pcs"}</span>
                    <span className="text-emerald-700 dark:text-emerald-400">{persentaseFisik.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min(persentaseFisik, 100)}%` }} />
                  </div>
                </div>

                {/* 2. Realisasi Budget */}
                <div>
                  <div className="flex justify-between font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    <span>Anggaran Terpakai: Rp {formatNumber(item.totalActual)} / Rp {formatNumber(item.totalRab)}</span>
                    <span className={isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}>
                      {persentaseBudget.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(persentaseBudget, 100)}%` }} />
                  </div>
                </div>

                {/* Info Sisa & HPP Deviasi */}
                <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                  <div>
                    Sisa Budget: <span className={item.totalRab - item.totalActual < 0 ? "text-red-600" : "text-foreground font-extrabold"}>Rp {formatNumber(item.totalRab - item.totalActual)}</span>
                  </div>
                  {item.totalFG && item.totalFG > 0 ? (
                    <div className={hppDeviasiPercent <= 0 ? 'text-emerald-700 dark:text-emerald-400 animate-pulse' : 'text-red-600'}>
                      Efisiensi HPP: {hppDeviasiPercent <= 0 ? `Hemat ${Math.abs(hppDeviasiPercent).toFixed(1)}%` : `Boros +${hppDeviasiPercent.toFixed(1)}%`}
                    </div>
                  ) : (
                    <div className="text-slate-400 dark:text-slate-500">Belum ada HPP Aktual</div>
                  )}
                </div>
              </div>

              {/* SPKs List Summary */}
              <div className="mb-4 text-[10px]">
                <span className="text-slate-400 dark:text-slate-500 font-bold block mb-1">SPK Terkait:</span>
                <div className="flex flex-wrap gap-1.5">
                  {item.spks.map(s => (
                    <span key={s.id} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] font-mono rounded text-slate-600 dark:text-slate-400">
                      {s.spkNumber} ({s.fgQty}/{s.targetVolume})
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Action Button */}
              <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-3 mt-auto">
                <button onClick={() => openEditModal(item)} className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-bold text-emerald-700 transition-all flex items-center gap-1">
                  + Buka Detail & PR
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL MULTI-TAB (BUKU KAS & PR) */}
      {showModal && editItem && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-card p-6 md:p-8 rounded-3xl w-full max-w-6xl border border-border shadow-2xl my-auto max-h-[95vh] flex flex-col">
            
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                  <Wallet className="text-emerald-600" /> Keuangan Proyek
                </h2>
                <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                  <span className="text-slate-700 dark:text-slate-300 text-sm font-bold">{editItem.projectName}</span>
                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold rounded-md">
                    RAB: {editItem.rabNumber || "MANUAL"}
                  </span>
                  {editItem.targetVolume !== undefined && editItem.targetVolume > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-md">
                      Realisasi Produksi: {editItem.totalFG?.toLocaleString("id-ID") || 0} / {editItem.targetVolume.toLocaleString("id-ID")} {editItem.unit || "pcs"} ({((editItem.totalFG || 0) / editItem.targetVolume * 100).toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 w-10 h-10 rounded-full flex items-center justify-center">✕</button>
            </div>

            {/* TAB SWITCHER */}
            <div className="flex gap-4 mb-6 border-b border-border shrink-0">
              <button 
                className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 ${activeModalTab === "BUKU_KAS" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-slate-500 hover:text-slate-700"}`}
                onClick={() => setActiveModalTab("BUKU_KAS")}>
                <Receipt size={16} /> Buku Kas Pengeluaran
              </button>
              <button 
                className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 ${activeModalTab === "PR" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-slate-500 hover:text-slate-700"}`}
                onClick={() => setActiveModalTab("PR")}>
                <FileText size={16} /> Daftar Purchase Request (PR)
              </button>
            </div>

            {/* RINGKASAN BUDGET DI DALAM MODAL */}
            <div className="bg-slate-100/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-border grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
              <div className="bg-card p-4 rounded-2xl border border-border shadow-sm text-xs space-y-1">
                <span className="text-slate-500 dark:text-slate-400 font-semibold block text-[10px] mb-1">Bahan Baku (Material)</span>
                <div className="text-foreground font-bold flex justify-between">
                  <span>Realisasi:</span>
                  <span className="font-mono">Rp {formatNumber(editItem.actualMaterial)}</span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 flex justify-between text-[11px]">
                  <span>Pagu RAB:</span>
                  <span className="font-mono">Rp {formatNumber(editItem.rabMaterial)}</span>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1 flex justify-between font-bold">
                  <span>Sisa:</span>
                  <span className={`font-mono ${editItem.rabMaterial - editItem.actualMaterial < 0 ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    Rp {formatNumber(editItem.rabMaterial - editItem.actualMaterial)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className={`h-1.5 rounded-full ${editItem.rabMaterial - editItem.actualMaterial < 0 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(editItem.rabMaterial > 0 ? (editItem.actualMaterial / editItem.rabMaterial) * 100 : 0, 100)}%` }}></div>
                </div>
              </div>
              
              <div className="bg-card p-4 rounded-2xl border border-border shadow-sm text-xs space-y-1">
                <span className="text-slate-500 dark:text-slate-400 font-semibold block text-[10px] mb-1">Tenaga Kerja (Manpower)</span>
                <div className="text-foreground font-bold flex justify-between">
                  <span>Realisasi:</span>
                  <span className="font-mono">Rp {formatNumber(editItem.actualManpower)}</span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 flex justify-between text-[11px]">
                  <span>Pagu RAB:</span>
                  <span className="font-mono">Rp {formatNumber(editItem.rabManpower)}</span>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1 flex justify-between font-bold">
                  <span>Sisa:</span>
                  <span className={`font-mono ${editItem.rabManpower - editItem.actualManpower < 0 ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    Rp {formatNumber(editItem.rabManpower - editItem.actualManpower)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className={`h-1.5 rounded-full ${editItem.rabManpower - editItem.actualManpower < 0 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(editItem.rabManpower > 0 ? (editItem.actualManpower / editItem.rabManpower) * 100 : 0, 100)}%` }}></div>
                </div>
              </div>

              <div className="bg-card p-4 rounded-2xl border border-border shadow-sm text-xs space-y-1">
                <span className="text-slate-500 dark:text-slate-400 font-semibold block text-[10px] mb-1">Overhead & Lainnya</span>
                <div className="text-foreground font-bold flex justify-between">
                  <span>Realisasi:</span>
                  <span className="font-mono">Rp {formatNumber(editItem.actualOverhead)}</span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 flex justify-between text-[11px]">
                  <span>Pagu RAB:</span>
                  <span className="font-mono">Rp {formatNumber(editItem.rabOverhead)}</span>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1 flex justify-between font-bold">
                  <span>Sisa:</span>
                  <span className={`font-mono ${editItem.rabOverhead - editItem.actualOverhead < 0 ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    Rp {formatNumber(editItem.rabOverhead - editItem.actualOverhead)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className={`h-1.5 rounded-full ${editItem.rabOverhead - editItem.actualOverhead < 0 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(editItem.rabOverhead > 0 ? (editItem.actualOverhead / editItem.rabOverhead) * 100 : 0, 100)}%` }}></div>
                </div>
              </div>

              <div className="bg-emerald-600 p-4 rounded-2xl text-white shadow-sm text-xs space-y-1">
                <span className="text-emerald-100 font-semibold block text-[10px] mb-1">Total Anggaran RAB</span>
                <div className="flex justify-between font-bold">
                  <span>Realisasi:</span>
                  <span className="font-mono font-bold">Rp {formatNumber(editItem.totalActual)}</span>
                </div>
                <div className="text-emerald-200 flex justify-between text-[11px]">
                  <span>Total Pagu:</span>
                  <span className="font-mono">Rp {formatNumber(editItem.totalRab)}</span>
                </div>
                <div className="border-t border-emerald-500 pt-1 flex justify-between font-bold">
                  <span>Total Sisa:</span>
                  <span className={`font-mono ${editItem.totalRab - editItem.totalActual < 0 ? 'text-red-200' : 'text-emerald-100'}`}>
                    Rp {formatNumber(editItem.totalRab - editItem.totalActual)}
                  </span>
                </div>
                <div className="w-full bg-emerald-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className={`h-1.5 rounded-full ${editItem.totalRab - editItem.totalActual < 0 ? 'bg-red-400' : 'bg-white'}`} style={{ width: `${Math.min(editItem.totalRab > 0 ? (editItem.totalActual / editItem.totalRab) * 100 : 0, 100)}%` }}></div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              
              {/* ================= TAB 1: BUKU KAS ================= */}
              {activeModalTab === "BUKU_KAS" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* KIRI: FORM INPUT */}
                  <div className="lg:col-span-1 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 h-fit">
                    <h3 className="text-sm font-bold text-emerald-600 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">+ Input Nota Baru</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1 block">Tujuan SPK *</label>
                        <select className="w-full bg-card border border-border p-2.5 rounded-lg text-foreground text-sm outline-none focus:border-emerald-500 font-mono font-bold"
                          value={expenseForm.planId} onChange={e => setExpenseForm({...expenseForm, planId: e.target.value})}>
                          {editItem.spks.map(s => (
                            <option key={s.id} value={s.id}>{s.spkNumber}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1 block">Kategori</label>
                        <select className="w-full bg-card border border-border p-2.5 rounded-lg text-foreground text-sm outline-none focus:border-emerald-500" 
                          value={expenseForm.expenseType} onChange={e => setExpenseForm({...expenseForm, expenseType: e.target.value})}>
                          <option value="MATERIAL">Bahan Baku (Material)</option>
                          <option value="MANPOWER">Upah Tukang (Manpower)</option>
                          <option value="OVERHEAD">Lain-lain (Overhead)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1 block">Nominal Pengeluaran (Rp)</label>
                        <input type="number" placeholder="Contoh: 1500000" className="w-full bg-card border border-border p-2.5 rounded-lg text-foreground text-sm outline-none focus:border-emerald-500 font-mono" 
                          value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1 block">Tanggal Nota</label>
                        <input type="date" className="w-full bg-card border border-border p-2.5 rounded-lg text-foreground text-sm outline-none focus:border-emerald-500" 
                          value={expenseForm.expenseDate} onChange={e => setExpenseForm({...expenseForm, expenseDate: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1 block">Keterangan / Catatan</label>
                        <textarea rows={2} placeholder="Misal: Beli Semen 50 Sak di Toko A" className="w-full bg-card border border-border p-2.5 rounded-lg text-foreground text-sm outline-none focus:border-emerald-500 resize-none" 
                          value={expenseForm.notes} onChange={e => setExpenseForm({...expenseForm, notes: e.target.value})} />
                      </div>
                      <button onClick={handleAddExpense} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 p-3 rounded-xl font-bold text-white transition-all shadow-sm text-xs flex justify-center items-center mt-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Nota"}
                      </button>
                    </div>
                  </div>

                  {/* KANAN: TABEL HISTORI */}
                  <div className="lg:col-span-2">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex justify-between items-end">
                      <span>Histori Pengeluaran Proyek</span>
                      <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Total: {editItem.expenses.length} Nota</span>
                    </h3>
                    
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                      <div className="overflow-x-auto max-h-[50vh]">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-100/80 dark:bg-slate-900/80 sticky top-0 z-10 shadow-sm border-b border-border">
                            <tr>
                              <th className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400">Tanggal</th>
                              <th className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400">No. SPK</th>
                              <th className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400">Kategori</th>
                              <th className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400">Keterangan</th>
                              <th className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 text-right">Nominal</th>
                              {session?.role === "admin" && <th className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">Aksi</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {editItem.expenses.length === 0 ? (
                              <tr><td colSpan={6} className="p-8 text-center text-sm text-slate-400">Belum ada catatan pengeluaran.</td></tr>
                            ) : (
                              editItem.expenses.map((exp) => (
                                <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="p-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(exp.expenseDate)}</td>
                                  <td className="p-3 text-xs font-mono font-bold text-slate-600 dark:text-slate-400">{exp.spkNumber || "-"}</td>
                                  <td className="p-3 text-xs">
                                    <span className={`px-2 py-1 rounded text-[9px] font-bold border ${
                                      exp.expenseType === 'MATERIAL' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                      exp.expenseType === 'MANPOWER' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                      'bg-amber-50 text-amber-700 border-amber-100'
                                    }`}>
                                      {exp.expenseType}
                                    </span>
                                  </td>
                                  <td className="p-3 text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={exp.notes || "-"}>{exp.notes || "-"}</td>
                                  <td className="p-3 text-xs font-mono font-bold text-foreground text-right">Rp {formatNumber(exp.amount)}</td>
                                  {session?.role === "admin" && (
                                    <td className="p-3 text-center">
                                      <button onClick={() => handleDeleteExpense(exp.id, exp.amount, exp.expenseType)} disabled={loading} className="text-slate-400 hover:text-red-600 transition-colors" title="Hapus Nota">
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 2: PURCHASE REQUEST (PR) ================= */}
              {activeModalTab === "PR" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* KIRI: FORM PENGAJUAN PR */}
                  <div className="lg:col-span-1 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 h-fit">
                    <h3 className="text-sm font-bold text-emerald-600 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">+ Buat Pengajuan PR</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1 block">Tujuan SPK *</label>
                        <select className="w-full bg-card border border-border p-2.5 rounded-lg text-foreground text-sm outline-none focus:border-emerald-500 font-mono font-bold"
                          value={prForm.planId} onChange={e => setPrForm({...prForm, planId: e.target.value})}>
                          {editItem.spks.map(s => (
                            <option key={s.id} value={s.id}>{s.spkNumber}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1 block">Nomor PR / Surat</label>
                        <input type="text" placeholder="Contoh: PR-001/KB/2026" className="w-full bg-card border border-border p-2.5 rounded-lg text-foreground text-sm outline-none focus:border-emerald-500 font-mono" 
                          value={prForm.prNumber} onChange={e => setPrForm({...prForm, prNumber: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1 block">Tanggal Pengajuan</label>
                        <input type="date" className="w-full bg-card border border-border p-2.5 rounded-lg text-foreground text-sm outline-none focus:border-emerald-500" 
                          value={prForm.requestDate} onChange={e => setPrForm({...prForm, requestDate: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1 block">Estimasi Nominal (Rp)</label>
                        <input type="number" placeholder="0" className="w-full bg-card border border-border p-2.5 rounded-lg text-foreground text-sm outline-none focus:border-emerald-500 font-mono" 
                          value={prForm.amount} onChange={e => setPrForm({...prForm, amount: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1 block">Barang yang Diminta (Rincian)</label>
                        <textarea rows={2} placeholder="Semen 50 sak, Pasir 20 ret" className="w-full bg-card border border-border p-2.5 rounded-lg text-foreground text-sm outline-none focus:border-emerald-500 resize-none" 
                          value={prForm.description} onChange={e => setPrForm({...prForm, description: e.target.value})} />
                      </div>
                      <button onClick={handleAddPR} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 p-3 rounded-xl font-bold text-white transition-all shadow-sm text-xs flex justify-center items-center mt-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajukan PR"}
                      </button>
                    </div>
                  </div>

                  {/* KANAN: TABEL DAFTAR PR */}
                  <div className="lg:col-span-2">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex justify-between items-end">
                      <span>Daftar Purchase Request</span>
                      <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Total: {editItem.purchaseRequests?.length || 0} Dokumen</span>
                    </h3>
                    
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                      <div className="overflow-x-auto max-h-[50vh]">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-100/80 dark:bg-slate-900/80 sticky top-0 z-10 shadow-sm border-b border-border">
                            <tr>
                              <th className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400">Tanggal & No. PR</th>
                              <th className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">No. SPK</th>
                              <th className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400">Rincian</th>
                              <th className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 text-right">Nominal</th>
                              <th className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">Status</th>
                              {session?.role !== "staff" && <th className="p-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">Aksi (Manajer)</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {!editItem.purchaseRequests || editItem.purchaseRequests.length === 0 ? (
                              <tr><td colSpan={6} className="p-8 text-center text-sm text-slate-400">Belum ada pengajuan PR.</td></tr>
                            ) : (
                              editItem.purchaseRequests.map((pr) => (
                                <tr key={pr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="p-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                    <div className="font-mono font-bold text-emerald-600">{pr.prNumber}</div>
                                    <div className="text-[10px] text-slate-400">{formatDate(pr.requestDate)}</div>
                                  </td>
                                  <td className="p-3 text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">{pr.spkNumber || "-"}</td>
                                  <td className="p-3 text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={pr.description}>{pr.description}</td>
                                  <td className="p-3 text-xs font-mono font-bold text-foreground text-right">Rp {formatNumber(Number(pr.amount))}</td>
                                  <td className="p-3 text-xs text-center">
                                    {pr.status === "PENDING" && <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px] font-bold">Pending</span>}
                                    {pr.status === "APPROVED" && <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold">Approved</span>}
                                    {pr.status === "REJECTED" && <span className="px-2 py-1 bg-red-50 text-red-700 border border-red-100 rounded text-[10px] font-bold">Rejected</span>}
                                  </td>
                                  {session?.role !== "staff" && (
                                    <td className="p-3 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        {pr.status === "PENDING" && (
                                          <>
                                            <button onClick={() => handleUpdatePRStatus(pr.id, "APPROVED")} className="text-emerald-600 hover:text-emerald-500 transition-colors" title="Setujui PR"><CheckCircle size={16}/></button>
                                            <button onClick={() => handleUpdatePRStatus(pr.id, "REJECTED")} className="text-red-500 hover:text-red-400 transition-colors" title="Tolak PR"><XCircle size={16}/></button>
                                          </>
                                        )}
                                        {session?.role === "admin" && (
                                          <button onClick={() => handleDeletePR(pr.id)} className="text-slate-400 hover:text-red-600 transition-colors ml-2" title="Hapus Permanen"><Trash2 size={14}/></button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}