"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { formatDate } from "@/lib/utils";
import { 
  FileSpreadsheet, FileText, Activity, AlertTriangle, 
  CheckCircle, PlusCircle, Calendar, Clock, BarChart2,
  Trash2, Edit3, ShieldAlert, Award, AlertCircle, Sparkles,
  ChevronDown
} from "lucide-react";

// --- TYPES ---
type fgItem = {
  id: string; planId: string; itemCode: string; productName: string;
  status: string; defectReason: string | null; castingDate: string;
};

type PlanWithProgress = {
  id: string; spkNumber: string | null; targetVolume: number; unit: string;
  commenceDate: string; deadlineDate: string; status: string; dailyReports: DailyReport[];
  fgItems: fgItem[];
  projectName?: string;
  totalFG: number; totalDamaged: number; totalReturn: number; progressPercent: number;
  avgDaily: number; estDaysToFinish: number; defectRate: number; remainingTarget: number;
  sisaWaktuHari: number; 
};

type DailyReport = {
  id: string; reportDate: string; fgQty: number; damagedQty: number; returnQty: number; notes: string | null;
};

export default function MonitoringClient({ userId, userRole }: { userId: string; userRole: string }) {
  const [plans, setPlans] = useState<PlanWithProgress[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Tab Switcher Utama
  const [activeTab, setActiveTab] = useState<"SPK" | "INDIVIDUAL" | "REJECT">("SPK");

  // Accordion/Collapse states per SPK
  const [expandedIndividualPlans, setExpandedIndividualPlans] = useState<Record<string, boolean>>({});
  const [expandedRejectPlans, setExpandedRejectPlans] = useState<Record<string, boolean>>({});

  // State for selected unit details modal
  const [selectedUnit, setSelectedUnit] = useState<(fgItem & { spkNumber?: string | null; projectName?: string | null }) | null>(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // Form State
  const [form, setForm] = useState({
    planId: "", reportDate: new Date().toISOString().split("T")[0],
    fgQuantity: "", damagedQuantity: "", returnQuantity: "", notes: "",
  });

  const [editForm, setEditForm] = useState({
    fgQuantity: "", damagedQuantity: "", returnQuantity: "", notes: "",
  });

  const timerRef = useRef<any>(null);

  const notify = (type: 'err' | 'succ', msg: string) => {
    if (type === 'err') setErrorMsg(msg); else setSuccessMsg(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setErrorMsg(""); setSuccessMsg(""); }, 3000);
  };

  const calculateDetailedProgress = useCallback((plan: any): PlanWithProgress => {
    const reports = plan.dailyReports || [];
    const totalFG = reports.reduce((s: number, r: any) => s + Number(r.fgQty ?? 0), 0);
    const totalDamaged = reports.reduce((s: number, r: any) => s + Number(r.damagedQty ?? 0), 0);
    const totalReturn = reports.reduce((s: number, r: any) => s + Number(r.returnQty ?? 0), 0);
    const target = Number(plan.targetVolume || 0);
    
    const progressPercent = target > 0 ? (totalFG / target) * 100 : 0;
    const avgDaily = reports.length > 0 ? totalFG / reports.length : 0;
    const remainingTarget = Math.max(0, target - totalFG);
    
    const estDaysToFinish = avgDaily > 0 ? Math.ceil(remainingTarget / avgDaily) : 0;
    const totalProduction = totalFG + totalDamaged;
    const defectRate = totalProduction > 0 ? (totalDamaged / totalProduction) * 100 : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const deadline = new Date(plan.deadlineDate);
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline.getTime() - today.getTime();
    let sisaWaktuHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (isNaN(sisaWaktuHari)) sisaWaktuHari = 0;

    return { 
      ...plan, totalFG, totalDamaged, totalReturn, progressPercent, 
      avgDaily, estDaysToFinish, defectRate, remainingTarget, sisaWaktuHari 
    };
  }, []);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/daily-reports");
      const data = await res.json();
      if (Array.isArray(data)) setPlans(data.map(p => calculateDetailedProgress(p)));
    } catch { notify('err', "Gagal memuat data monitoring."); }
    finally { setLoading(false); }
  }, [calculateDetailedProgress]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  // Sync selectedPlan when plans are re-fetched
  useEffect(() => {
    if (selectedPlan) {
      const updated = plans.find(p => p.id === selectedPlan.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedPlan)) setSelectedPlan(updated);
    }
  }, [plans, selectedPlan]);

  // Filters
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
      const q = searchQuery.toLowerCase();
      return matchStatus && (
        (p.spkNumber?.toLowerCase() || "").includes(q) || 
        (p.projectName?.toLowerCase() || "").includes(q)
      );
    });
  }, [plans, statusFilter, searchQuery]);

  // Flatten all precast items from all SPKs
  const allPrecastItems = useMemo(() => {
    const itemsList: fgItem[] = [];
    plans.forEach(plan => {
      if (plan.fgItems && Array.isArray(plan.fgItems)) {
        plan.fgItems.forEach(item => {
          itemsList.push({
            ...item,
            // Attach SPK Number & Project for easy searching
            spkNumber: plan.spkNumber,
            projectName: plan.projectName
          } as any);
        });
      }
    });
    return itemsList;
  }, [plans]);

  // Filtered Precast Items for "Data Produk Precast (Individual)"
  const filteredPrecastItems = useMemo(() => {
    return allPrecastItems.filter(item => {
      const q = searchQuery.toLowerCase();
      return (
        item.itemCode.toLowerCase().includes(q) ||
        (item.productName.toLowerCase() || "").includes(q) ||
        ((item as any).spkNumber?.toLowerCase() || "").includes(q) ||
        ((item as any).projectName?.toLowerCase() || "").includes(q)
      );
    });
  }, [allPrecastItems, searchQuery]);

  // Filtered Reject Items for "Laporan Stok Reject"
  const rejectItems = useMemo(() => {
    return allPrecastItems.filter(item => item.status === "REJECT");
  }, [allPrecastItems]);

  const filteredRejectItems = useMemo(() => {
    return rejectItems.filter(item => {
      const q = searchQuery.toLowerCase();
      return (
        item.itemCode.toLowerCase().includes(q) ||
        (item.defectReason?.toLowerCase() || "").includes(q) ||
        ((item as any).spkNumber?.toLowerCase() || "").includes(q) ||
        ((item as any).projectName?.toLowerCase() || "").includes(q)
      );
    });
  }, [rejectItems, searchQuery]);

  // Group precast items by SPK Project
  const precastItemsByPlan = useMemo(() => {
    const groups: Record<string, { plan: PlanWithProgress; items: fgItem[] }> = {};
    
    plans.forEach(plan => {
      groups[plan.id] = { plan, items: [] };
    });

    filteredPrecastItems.forEach(item => {
      if (groups[item.planId]) {
        groups[item.planId].items.push(item);
      } else {
        const fallbackPlan = plans.find(p => p.id === item.planId) || {
          id: item.planId,
          spkNumber: (item as any).spkNumber || "UMUM",
          projectName: (item as any).projectName || "Stok Umum",
          unit: "pcs"
        } as any;
        groups[item.planId] = { plan: fallbackPlan, items: [item] };
      }
    });

    return Object.values(groups).filter(g => g.items.length > 0);
  }, [plans, filteredPrecastItems]);

  // Group reject items by SPK Project
  const rejectItemsByPlan = useMemo(() => {
    const groups: Record<string, { plan: PlanWithProgress; items: fgItem[] }> = {};
    
    plans.forEach(plan => {
      groups[plan.id] = { plan, items: [] };
    });

    filteredRejectItems.forEach(item => {
      if (groups[item.planId]) {
        groups[item.planId].items.push(item);
      } else {
        const fallbackPlan = plans.find(p => p.id === item.planId) || {
          id: item.planId,
          spkNumber: (item as any).spkNumber || "UMUM",
          projectName: (item as any).projectName || "Stok Umum",
          unit: "pcs"
        } as any;
        groups[item.planId] = { plan: fallbackPlan, items: [item] };
      }
    });

    return Object.values(groups).filter(g => g.items.length > 0);
  }, [plans, filteredRejectItems]);

  // Defect rate and global KPI metrics
  const kpiStats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    let fgToday = 0;
    let defectToday = 0;
    let totalCetakGood = 0;
    let totalCetakReject = 0;
    
    plans.forEach(p => {
      p.dailyReports.forEach(r => {
        if (r.reportDate.startsWith(todayStr)) {
          fgToday += Number(r.fgQty || 0);
          defectToday += Number(r.damagedQty || 0);
        }
      });
      totalCetakGood += p.totalFG;
      totalCetakReject += p.totalDamaged;
    });

    const defectPercentage = (totalCetakGood + totalCetakReject) > 0 
      ? (totalCetakReject / (totalCetakGood + totalCetakReject)) * 100 
      : 0;

    return {
      activeSPK: plans.filter(p => p.status === 'AKTIF').length,
      fgToday,
      defectToday,
      totalCetakGood,
      totalCetakReject,
      defectPercentage
    };
  }, [plans]);

  // Toggle item status between GOOD and REJECT
  const toggleItemStatus = async (item: fgItem) => {
    const nextStatus = item.status === "GOOD" ? "REJECT" : "GOOD";
    let reason = "";
    if (nextStatus === "REJECT") {
      reason = prompt("Masukkan alasan cacat/kerusakan barang:") || "Cacat penyimpanan di gudang";
      if (!reason) return;
    } else {
      if (!confirm("Ubah status barang kembali menjadi GOOD?")) return;
    }

    try {
      const res = await fetch(`/api/daily-reports/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, defectReason: reason })
      });
      if (res.ok) {
        notify('succ', "Status unit precast berhasil diperbarui!");
        await fetchPlans();
      } else {
        throw new Error();
      }
    } catch {
      notify('err', "Gagal memperbarui status unit precast.");
    }
  };

  // Get deadline visual state
  const getDeadlineIndicator = (days: number, status: string) => {
    if (status === 'SELESAI' || status === 'BATAL') {
      return { text: "Selesai", color: "#059669", bg: "bg-emerald-50", border: "border-emerald-100", icon: <CheckCircle size={12}/> };
    }
    if (days < 0) {
      return { text: `Telat ${Math.abs(days)} Hari`, color: "#dc2626", bg: "bg-red-50", border: "border-red-100", icon: <AlertTriangle size={12}/> };
    }
    if (days <= 7) {
      return { text: `${days} Hari (Hampir Tenggat)`, color: "#d97706", bg: "bg-amber-50", border: "border-amber-100", icon: <Clock size={12}/> };
    }
    return { text: `${days} Hari`, color: "#2563eb", bg: "bg-blue-50", border: "border-blue-100", icon: <Clock size={12}/> };
  };

  // Export handlers
  const handleDownloadExcel = () => {
    if (activeTab === "SPK") {
      const excelData = filteredPlans.map(p => ({
        "No. SPK": p.spkNumber,
        "Nama Proyek": p.projectName,
        "Target": `${p.targetVolume} ${p.unit}`,
        "Realisasi FG": p.totalFG,
        "Progress": `${p.progressPercent.toFixed(1)}%`,
        "Defect Rate": `${p.defectRate.toFixed(1)}%`,
        "Sisa Waktu": `${p.sisaWaktuHari} Hari`,
        "Status": p.status
      }));
      exportToExcel(excelData, `Laporan_Monitoring_SPK_${new Date().toLocaleDateString()}`);
    } else if (activeTab === "INDIVIDUAL") {
      const excelData = filteredPrecastItems.map(item => ({
        "Kode Unit": item.itemCode,
        "Nama Barang": item.productName,
        "Status QC": item.status,
        "Tanggal Cetak": new Date(item.castingDate).toLocaleDateString("id-ID"),
        "No. SPK": (item as any).spkNumber,
        "Proyek": (item as any).projectName,
        "Keterangan Cacat": item.defectReason || "-"
      }));
      exportToExcel(excelData, `Daftar_Unit_Precast_${new Date().toLocaleDateString()}`);
    } else {
      const excelData = filteredRejectItems.map(item => ({
        "Kode Unit": item.itemCode,
        "Nama Barang": item.productName,
        "No. SPK": (item as any).spkNumber,
        "Proyek": (item as any).projectName,
        "Tanggal Cetak": new Date(item.castingDate).toLocaleDateString("id-ID"),
        "Keterangan Cacat": item.defectReason || "Cacat produksi"
      }));
      exportToExcel(excelData, `Laporan_Stok_Reject_${new Date().toLocaleDateString()}`);
    }
  };

  const handleDownloadPDF = () => {
    if (activeTab === "SPK") {
      const headers = [["No. SPK", "Proyek", "Target", "FG", "Progress", "Defect", "Status"]];
      const body = filteredPlans.map(p => [
        p.spkNumber,
        p.projectName?.substring(0, 25) || "",
        `${p.targetVolume} ${p.unit}`,
        p.totalFG,
        `${p.progressPercent.toFixed(1)}%`,
        `${p.defectRate.toFixed(1)}%`,
        p.status
      ]);
      exportToPDF("LAPORAN MONITORING PRODUKSI SPK KALLA BETON", headers, body, "Laporan_Monitoring_SPK");
    } else if (activeTab === "INDIVIDUAL") {
      const headers = [["Kode Barang", "Nama Barang", "No. SPK", "Tanggal Cetak", "Status QC"]];
      const body = filteredPrecastItems.slice(0, 100).map(item => [
        item.itemCode,
        item.productName.substring(0, 20),
        (item as any).spkNumber,
        new Date(item.castingDate).toLocaleDateString("id-ID"),
        item.status
      ]);
      exportToPDF("DAFTAR PRODUK PRECAST INDIVIDUAL KALLA BETON (Max 100)", headers, body, "Daftar_Unit_Precast_Individual");
    } else {
      const headers = [["Kode Barang", "Proyek", "No. SPK", "Tanggal", "Alasan Cacat"]];
      const body = filteredRejectItems.map(item => [
        item.itemCode,
        ((item as any).projectName || "").substring(0, 20),
        (item as any).spkNumber,
        new Date(item.castingDate).toLocaleDateString("id-ID"),
        item.defectReason || "Cacat produksi"
      ]);
      exportToPDF("LAPORAN EVALUASI PRODUK REJECT KALLA BETON", headers, body, "Laporan_Stok_Reject_Defects");
    }
  };

  const openQuickInput = (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    setForm({ planId, reportDate: new Date().toISOString().split("T")[0], fgQuantity: "", damagedQuantity: "", returnQuantity: "", notes: "" });
    setShowReportModal(true);
  };

  const handleEditReport = async () => {
    if (!editingReport) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/daily-reports/${editingReport.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
      if (!res.ok) throw new Error();
      notify('succ', "Koreksi berhasil disimpan!");
      setShowEditModal(false);
      await fetchPlans();
    } catch { notify('err', "Gagal update data."); }
    finally { setSubmitting(false); }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm("Hapus laporan ini secara permanen? Data unit precast terkait juga akan disinkronkan.")) return;
    try {
      const res = await fetch(`/api/daily-reports/${id}`, { method: "DELETE" });
      if (res.ok) { notify('succ', "Laporan dihapus!"); await fetchPlans(); } else throw new Error();
    } catch { notify('err', "Gagal menghapus."); }
  };

  const handleSubmitReport = async () => {
    if (!form.planId || !form.reportDate || form.fgQuantity === "") return notify('err', "Data SPK dan FG wajib diisi!");
    setSubmitting(true);
    try {
      const res = await fetch("/api/daily-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      notify('succ', "Laporan BKH & Data Barang Cetak Berhasil Disimpan!");
      setShowReportModal(false);
      setForm({ planId: "", reportDate: new Date().toISOString().split("T")[0], fgQuantity: "", damagedQuantity: "", returnQuantity: "", notes: "" });
      await fetchPlans();
    } catch { notify('err', "Gagal menyimpan laporan."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-background p-8 text-foreground font-sans">
      
      {/* Toast Notifications - Clean, no side-stripe borders */}
      {errorMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold font-mono">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-250 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold font-mono">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-border flex items-center justify-center shrink-0">
            <Activity className="text-emerald-600 dark:text-emerald-400" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Monitoring & QC Produksi</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Lacak Kinerja Harian Produksi, Defect Rate, dan Stok Reject Precast</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="px-3.5 py-2 bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border hover:border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer" onClick={handleDownloadExcel}>
            <FileSpreadsheet size={15}/> Excel
          </button>
          <button className="px-3.5 py-2 bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border hover:border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer" onClick={handleDownloadPDF}>
            <FileText size={15}/> PDF
          </button>
          <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer" onClick={() => { setForm({...form, planId: ""}); setShowReportModal(true); }}>
            <PlusCircle size={15} /> Input BKH Harian
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="text-slate-500 dark:text-slate-450 text-xs font-semibold mb-1">SPK Produksi Aktif</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{kpiStats.activeSPK} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">SPK</span></div>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="text-slate-500 dark:text-slate-450 text-xs font-semibold mb-1">Cetak Barang Jadi Hari Ini</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpiStats.fgToday} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">Pcs</span></div>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="text-slate-500 dark:text-slate-450 text-xs font-semibold mb-1">Barang Reject Hari Ini</div>
          <div className="text-2xl font-black text-red-650 dark:text-red-400">{kpiStats.defectToday} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">Pcs</span></div>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
          <div className="text-slate-500 dark:text-slate-450 text-xs font-semibold mb-1">Akumulasi Defect Rate (Reject)</div>
          <div className={`text-2xl font-black ${kpiStats.defectPercentage > 5 ? "text-amber-600" : "text-emerald-700 dark:text-emerald-400"}`}>
            {kpiStats.defectPercentage.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* TABS SWITCHER & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-border self-start shrink-0 gap-1.5">
          <button className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "SPK" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50"}`} onClick={() => setActiveTab("SPK")}>
            Monitoring SPK ({filteredPlans.length})
          </button>
          <button className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "INDIVIDUAL" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50"}`} onClick={() => setActiveTab("INDIVIDUAL")}>
            Pelacakan Unit ({filteredPrecastItems.length})
          </button>
          <button className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "REJECT" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50"}`} onClick={() => setActiveTab("REJECT")}>
            Laporan Reject ({filteredRejectItems.length})
          </button>
        </div>

        <div className="flex gap-2 min-w-[320px]">
          <input className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-semibold shadow-sm"
            placeholder={activeTab === "SPK" ? "🔍 Cari No SPK atau Nama Proyek..." : activeTab === "INDIVIDUAL" ? "🔍 Cari Kode Unit atau No. SPK..." : "🔍 Cari Unit Reject..."}
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          
          {activeTab === "SPK" && (
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 border border-border rounded-xl shrink-0">
              {[
                { k: "ALL", label: "Semua" },
                { k: "AKTIF", label: "Aktif" },
                { k: "SELESAI", label: "Selesai" }
              ].map(s => (
                <button key={s.k} onClick={() => setStatusFilter(s.k)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${statusFilter === s.k ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LOADING SPINNER */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ===== TAB 1: GRID MONITORING SPK ===== */}
          {activeTab === "SPK" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlans.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 italic bg-card border border-border rounded-2xl">Tidak ada SPK terdaftar yang cocok.</div>
              )}
              {filteredPlans.map(plan => {
                const deadlineInfo = getDeadlineIndicator(plan.sisaWaktuHari, plan.status);
                return (
                  <div key={plan.id} onClick={() => setSelectedPlan(plan)} className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md hover:border-emerald-500/50 dark:hover:border-emerald-450 transition-all cursor-pointer relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg display: inline-block mb-2 font-mono">
                          {plan.spkNumber}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 leading-snug mt-1 group-hover:text-emerald-700 transition-colors">
                          {plan.projectName}
                        </h3>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase ${plan.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {plan.status}
                      </span>
                    </div>

                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 mb-4 text-xs space-y-3">
                      <div>
                        <div className="flex justify-between font-bold mb-1.5">
                          <span className="text-slate-500">Target Realisasi: {plan.totalFG} / {plan.targetVolume} {plan.unit}</span>
                          <span className="text-emerald-700">{plan.progressPercent.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min(plan.progressPercent, 100)}%` }} />
                        </div>
                      </div>

                      <div className="flex justify-between text-[11px]">
                        <div className="flex items-center gap-1 font-bold text-slate-500">
                          <AlertTriangle size={13} className={plan.defectRate > 5 ? "text-red-500" : "text-amber-500"} />
                          <span className={plan.defectRate > 5 ? "text-red-600" : "text-slate-600"}>Reject: <b>{plan.defectRate.toFixed(1)}%</b></span>
                        </div>
                        <div className={`flex items-center gap-1 font-bold text-slate-500`}>
                          {deadlineInfo.icon}
                          <span className="text-slate-600">{deadlineInfo.text}</span>
                        </div>
                      </div>
                    </div>

                    {plan.status === 'AKTIF' && (
                      <div className="flex justify-end border-t border-slate-100 pt-3">
                        <button className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-bold text-emerald-700 transition-all flex items-center gap-1"
                          onClick={(e) => openQuickInput(e, plan.id)}>
                          + Input BKH
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== TAB 2: DATA PRODUK INDIVIDUAL (TERPISAH PER SPK - ACCORDION) ===== */}
          {activeTab === "INDIVIDUAL" && (
            <div className="space-y-4">
              {precastItemsByPlan.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic bg-card border border-border rounded-2xl">
                  Belum ada unit precast terdaftar yang cocok dengan pencarian.
                </div>
              ) : (
                precastItemsByPlan.map(({ plan, items }) => {
                  const isExpanded = !!expandedIndividualPlans[plan.id];
                  return (
                    <div key={plan.id} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
                      {/* Header Group SPK */}
                      <button 
                        type="button"
                        onClick={() => setExpandedIndividualPlans(prev => ({ ...prev, [plan.id]: !prev[plan.id] }))}
                        className="w-full p-4 bg-emerald-50/20 hover:bg-emerald-50/50 border-b border-slate-200/50 flex justify-between items-center gap-4 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-mono text-[10px] font-black">
                            {plan.spkNumber || "UMUM"}
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-800">{plan.projectName || "Stok Umum"}</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] bg-card text-slate-500 dark:text-slate-400 font-bold border border-border px-2.5 py-1 rounded-lg shrink-0">
                            {items.length} Unit Precast
                          </span>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {/* Grid Group (Rendered only when expanded) */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50/30 border-t border-slate-100">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-in slide-in-from-top-1 duration-200">
                            {items.map(item => (
                              <button
                                type="button"
                                key={item.id}
                                onClick={() => setSelectedUnit({ ...item, spkNumber: plan.spkNumber, projectName: plan.projectName })}
                                className="bg-card hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-border rounded-xl p-3 flex flex-col justify-between items-center text-center cursor-pointer transition-all shadow-sm hover:shadow-md hover:border-emerald-500 hover:scale-[1.02]"
                              >
                                <div className="w-2.5 h-2.5 rounded-full mb-2 self-end" style={{ backgroundColor: item.status === 'GOOD' ? '#10b981' : '#ef4444' }} />
                                <span className="font-mono font-black text-slate-800 text-[11px] tracking-tight">{item.itemCode}</span>
                                <span className="text-slate-400 text-[9px] mt-1 font-bold truncate w-full">{item.productName}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ===== TAB 3: LAPORAN STOK REJECT (TERPISAH PER SPK - ACCORDION) ===== */}
          {activeTab === "REJECT" && (
            <div className="space-y-6">
              
              {/* REJECT KPI AND ADVISORY */}
              <div className="bg-red-50/50 border border-red-200 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex gap-4 items-center">
                  <div className="p-4 bg-red-100 text-red-600 rounded-2xl"><ShieldAlert size={28}/></div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Total Stok Barang Rusak / Reject</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Daftar evaluasi cacat precast hasil log BKH dan QC pergudangan.</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">TOTAL CACAT AKUMULASI</span>
                  <div className="text-3xl font-black text-red-600">{kpiStats.totalCetakReject} <span className="text-sm font-normal text-slate-400">Unit</span></div>
                </div>
              </div>

              {/* REJECT LIST GRID (TERPISAH PER SPK) */}
              <div className="space-y-4">
                {rejectItemsByPlan.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 italic bg-card border border-border rounded-2xl">
                    Tidak ada stok unit reject terdaftar yang cocok dengan pencarian.
                  </div>
                ) : (
                  rejectItemsByPlan.map(({ plan, items }) => {
                    const isExpanded = !!expandedRejectPlans[plan.id];
                    return (
                      <div key={plan.id} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
                        {/* Header Group SPK */}
                        <button 
                          type="button"
                          onClick={() => setExpandedRejectPlans(prev => ({ ...prev, [plan.id]: !prev[plan.id] }))}
                          className="w-full p-4 bg-red-50/10 hover:bg-red-50/30 border-b border-slate-200/50 flex justify-between items-center gap-4 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="shrink-0 bg-red-100 text-red-800 border border-red-200 px-2.5 py-1 rounded-lg font-mono text-[10px] font-black">
                              {plan.spkNumber || "UMUM"}
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-slate-800">{plan.projectName || "Stok Umum"}</h3>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] bg-card text-red-500 font-bold border border-red-200 dark:border-red-900/40 px-2.5 py-1 rounded-lg shrink-0">
                              {items.length} Unit Reject
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                        </button>

                        {/* Grid Group (Rendered only when expanded) */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-50/30 border-t border-slate-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-1 duration-200">
                              {items.map(item => (
                                <button
                                  type="button"
                                  key={item.id}
                                  onClick={() => setSelectedUnit({ ...item, spkNumber: plan.spkNumber, projectName: plan.projectName })}
                                   className="bg-card hover:bg-red-50/10 dark:hover:bg-red-950/20 border border-border hover:border-red-300 rounded-xl p-4 text-left cursor-pointer transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
                                >
                                  <div className="flex justify-between items-start mb-2 w-full">
                                    <span className="font-mono font-black text-red-600 text-xs">{item.itemCode}</span>
                                    <span className="text-[9px] bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded font-black uppercase">REJECT</span>
                                  </div>
                                  <p className="text-slate-800 font-bold text-xs truncate w-full">{item.productName}</p>
                                  <p className="text-slate-500 italic text-[10px] mt-1 line-clamp-2">“{item.defectReason || "Cacat produksi"}”</p>
                                  <div className="text-[9px] text-slate-400 font-bold mt-3 border-t border-slate-100 pt-2 text-right w-full">
                                    {formatDate(item.castingDate)}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== SIDE SLIDE PANEL: DETAIL & ANALISA SPK ===== */}
      {selectedPlan && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedPlan(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-card border-l border-border p-6 shadow-2xl z-50 overflow-y-auto flex flex-col animate-in slide-in-from-right duration-350 ease-out-expo">
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <BarChart2 className="text-emerald-600 dark:text-emerald-400" size={18} /> Detail Monitoring BKH
              </h2>
              <button className="text-slate-400 hover:text-slate-600 text-xl font-bold bg-slate-100 dark:bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border border-transparent" onClick={() => setSelectedPlan(null)}>✕</button>
            </div>

            <div className="flex-1 space-y-6">
              
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-5">
                <div className="text-[10px] text-slate-550 dark:text-slate-400 font-bold">Nomor SPK</div>
                <div className="text-lg font-black text-emerald-800 dark:text-emerald-400 font-mono mt-0.5">{selectedPlan.spkNumber}</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">{selectedPlan.projectName}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border-b border-border pb-3">
                  <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px]">Target Volume</span>
                  <div className="font-bold text-slate-800 dark:text-white text-sm mt-0.5">{selectedPlan.targetVolume} {selectedPlan.unit}</div>
                </div>
                <div className="border-b border-border pb-3">
                  <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px]">Sisa Target</span>
                  <div className="font-bold text-amber-600 dark:text-amber-450 text-sm mt-0.5">{selectedPlan.remainingTarget} {selectedPlan.unit}</div>
                </div>
                <div className="border-b border-border pb-3">
                  <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px]">Sisa Waktu</span>
                  <div className="font-bold text-slate-800 dark:text-white text-sm mt-0.5">{selectedPlan.sisaWaktuHari} Hari</div>
                </div>
                <div className="border-b border-border pb-3">
                  <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px]">Prediksi Selesai</span>
                  <div className="font-bold text-emerald-700 dark:text-emerald-450 text-sm mt-0.5">{selectedPlan.estDaysToFinish > 0 ? `${selectedPlan.estDaysToFinish} Hari` : "Belum diprediksi"}</div>
                </div>
              </div>

              {/* BKH Logs List */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-slate-600 dark:text-slate-350">Histori Pengisian BKH</h3>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-border px-2 py-0.5 rounded font-bold">Total: {selectedPlan.dailyReports.length} Hari</span>
                </div>
                
                <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedPlan.dailyReports.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 italic bg-slate-50 dark:bg-slate-900/30 border border-border rounded-xl">Belum ada laporan harian.</div>
                  ) : (
                    selectedPlan.dailyReports.slice().reverse().map(r => (
                      <div key={r.id} className="p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-border">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-bold text-slate-850 dark:text-white text-[11px] flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400"/>
                            {new Date(r.reportDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' })}
                          </div>
                          <div className="flex gap-1.5">
                            <button className="text-blue-600 dark:text-blue-400 hover:underline text-[10px] font-bold cursor-pointer" onClick={() => { setEditingReport(r); setEditForm({ fgQuantity: String(r.fgQty), damagedQuantity: String(r.damagedQty), returnQuantity: String(r.returnQty), notes: r.notes || "" }); setShowEditModal(true); }}>Edit</button>
                            {userRole === "admin" && (
                              <button className="text-red-500 dark:text-red-400 hover:underline text-[10px] font-bold ml-1.5 cursor-pointer" onClick={() => handleDeleteReport(r.id)}>Hapus</button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 bg-card border border-border rounded-lg p-2 text-center text-[10px]">
                          <div>
                            <span className="text-slate-500 dark:text-slate-450 block font-semibold">Layak</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{r.fgQty}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-455 block font-semibold">Reject</span>
                            <span className="font-bold text-red-600 dark:text-red-450 text-xs">{r.damagedQty}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-455 block font-semibold">Retur</span>
                            <span className="font-bold text-amber-600 dark:text-amber-450 text-xs">{r.returnQty}</span>
                          </div>
                        </div>

                        {r.notes && (
                          <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 italic bg-card p-2 rounded-lg border border-border">
                            📝 {r.notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {selectedPlan.status === 'AKTIF' && (
              <button className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1 shadow-sm"
                onClick={(e) => openQuickInput(e, selectedPlan.id)}>
                <PlusCircle size={16}/> Input Laporan BKH Baru
              </button>
            )}
          </div>
        </>
      )}

      {/* ===== MODAL: INPUT BKH HARI INI ===== */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl w-full max-w-lg p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-6 text-center flex justify-center items-center gap-1.5">
              <PlusCircle className="text-emerald-600" /> Catat Laporan Kerja Harian (BKH)
            </h2>
            
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Pilih SPK Aktif *</label>
                <select className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-bold"
                  value={form.planId} onChange={e => setForm({...form, planId: e.target.value})}>
                  <option value="">-- Pilih SPK --</option>
                  {plans.filter(p => p.status === "AKTIF").map(p => (
                    <option key={p.id} value={p.id}>{p.spkNumber} - {p.projectName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Tanggal Cetak Produksi *</label>
                <input type="date" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-mono"
                  value={form.reportDate} onChange={e => setForm({...form, reportDate: e.target.value})} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-emerald-700 block mb-1">GOOD (FG) *</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-mono text-center"
                    placeholder="0" value={form.fgQuantity} onChange={e => setForm({...form, fgQuantity: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-red-700 block mb-1">REJECT (Cacat) *</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-mono text-center"
                    placeholder="0" value={form.damagedQuantity} onChange={e => setForm({...form, damagedQuantity: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-700 block mb-1">RETUR (Kembali)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-mono text-center"
                    placeholder="0" value={form.returnQuantity} onChange={e => setForm({...form, returnQuantity: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Catatan Tambahan (Kendala Lapangan)</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-emerald-500 resize-none"
                  rows={3} placeholder="Semen retak, cetakan longgar, mixer trouble..." value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})} />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button className="px-4 py-2 border border-slate-200 text-slate-700 hover:border-slate-300 rounded-xl font-bold" onClick={() => setShowReportModal(false)}>
                  Batal
                </button>
                <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex justify-center items-center min-w-[100px]"
                  onClick={handleSubmitReport} disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan BKH"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: EDIT/KOREKSI BKH ===== */}
      {showEditModal && editingReport && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl w-full max-w-lg p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-6 text-center flex justify-center items-center gap-1.5">
              ✏️ Koreksi Laporan BKH
            </h2>
            
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-emerald-700 block mb-1">GOOD (FG)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-mono text-center"
                    value={editForm.fgQuantity} onChange={e => setEditForm({...editForm, fgQuantity: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-red-700 block mb-1">REJECT (Cacat)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-mono text-center"
                    value={editForm.damagedQuantity} onChange={e => setEditForm({...editForm, damagedQuantity: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-700 block mb-1">RETUR</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-mono text-center"
                    value={editForm.returnQuantity} onChange={e => setEditForm({...editForm, returnQuantity: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Alasan Koreksi (Wajib Diisi)</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-emerald-500 resize-none"
                  rows={3} placeholder="Alasan koreksi data cetak..." value={editForm.notes}
                  onChange={e => setEditForm({...editForm, notes: e.target.value})} />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button className="px-4 py-2 border border-slate-200 text-slate-700 hover:border-slate-300 rounded-xl font-bold" onClick={() => setShowEditModal(false)}>
                  Batal
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex justify-center items-center min-w-[100px]"
                  onClick={handleEditReport} disabled={submitting}>
                  {submitting ? "Mengupdate..." : "Koreksi Data"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: DETAIL UNIT PRECAST & QC ACTIONS ===== */}
      {selectedUnit && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl w-full max-w-md p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                <Award className="text-emerald-600" size={18} /> Detail & Kontrol Kualitas Unit
              </h2>
              <button 
                className="text-slate-400 hover:text-slate-600 text-xl font-bold bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center transition-all" 
                onClick={() => setSelectedUnit(null)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                <div className="flex justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-slate-400 uppercase text-[9px]">Kode Unit</span>
                  <span className="font-mono font-black text-slate-800 text-sm">{selectedUnit.itemCode}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-slate-400 uppercase text-[9px]">Nama Produk</span>
                  <span className="text-slate-800 text-right">{selectedUnit.productName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-slate-400 uppercase text-[9px]">No. SPK</span>
                  <span className="font-mono text-slate-800">{selectedUnit.spkNumber || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-slate-400 uppercase text-[9px]">Proyek</span>
                  <span className="text-slate-800 text-right">{selectedUnit.projectName || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-slate-400 uppercase text-[9px]">Tanggal Cetak</span>
                  <span className="text-slate-500 font-normal">{formatDate(selectedUnit.castingDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 uppercase text-[9px]">Status QC</span>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black border ${selectedUnit.status === 'GOOD' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {selectedUnit.status === 'GOOD' ? "✓ GOOD" : "⚠ REJECT"}
                  </span>
                </div>
              </div>

              {selectedUnit.status === 'REJECT' && (
                <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl text-red-800">
                  <div className="text-[9px] uppercase text-red-500 mb-1">Alasan Cacat / Kerusakan</div>
                  <p className="italic font-medium text-xs">“{selectedUnit.defectReason || "Tidak ada keterangan."}”</p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button 
                  className="flex-1 py-2.5 border border-slate-250 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-all text-center" 
                  onClick={() => setSelectedUnit(null)}
                >
                  Tutup
                </button>
                
                <button 
                  className={`flex-1 py-2.5 rounded-xl font-black text-white transition-all text-center ${selectedUnit.status === 'GOOD' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  onClick={async () => {
                    const currentItem = selectedUnit;
                    setSelectedUnit(null);
                    await toggleItemStatus(currentItem);
                  }}
                >
                  {selectedUnit.status === 'GOOD' ? "Jadikan REJECT" : "Jadikan GOOD"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}