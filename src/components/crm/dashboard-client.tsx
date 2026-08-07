"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Users, 
  Package, 
  Factory, 
  ClipboardList, 
  BarChart3, 
  Warehouse, 
  LogOut, 
  ChevronRight, 
  Wallet, 
  TrendingUp, 
  Building2
} from "lucide-react";

interface DashboardClientProps {
  stats: {
    TENDER: number;
    PENAWARAN: number;
    NEGO: number;
    PO: number;
    KONTRAK: number;
    SELESAI: number;
    BATAL: number;
  } | null;
  totalFg: number;
  totalDamaged: number;
  defectRate: number;
  totalActual: number;
  recentBkh: {
    id: string;
    reportDate: string | Date;
    fgQty: number;
    damagedQty: number;
    notes: string | null;
    spkNumber: string | null;
    projectName: string | null;
  }[];
  recentDeliveries: {
    id: string;
    deliveryNumber: string | null;
    recipient: string;
    qty: number;
    exitDate: string | Date;
    productName: string;
    projectName: string | null;
  }[];
  chartData: {
    date: string;
    fgQty: number;
    damagedQty: number;
  }[];
  totalTargetSpk: number;
  session: any;
}

export default function DashboardClient({
  stats,
  totalFg,
  totalDamaged,
  defectRate,
  totalActual,
  totalTargetSpk,
  recentBkh,
  recentDeliveries,
  chartData,
  session
}: DashboardClientProps) {
  const [activeFeedTab, setActiveFeedTab] = useState<"BKH" | "DELIVERY">("BKH");

  const totalAktif = useMemo(() => {
    if (!stats) return 0;
    return (stats.TENDER ?? 0) + (stats.PENAWARAN ?? 0) + (stats.NEGO ?? 0) + (stats.PO ?? 0) + (stats.KONTRAK ?? 0);
  }, [stats]);

  const maxChartVal = useMemo(() => {
    const vals = chartData.map(d => Number(d.fgQty) || 0);
    return Math.max(...vals, 100);
  }, [chartData]);

  const qcGoodPct = 100 - defectRate;
  const qcRejectPct = defectRate;
  const targetAchievedPct = totalTargetSpk > 0 ? (totalFg / totalTargetSpk) * 100 : 0;

  // Refined modules list — unified, premium styling matching the brand register
  const coreModules = [
    { href: "/crm", title: "CRM & Penjualan", desc: "Data tender, negosiasi & PO customer", icon: <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> },
    { href: "/production", title: "Rencana SPK", desc: "Terbitkan Surat Perintah Kerja produksi", icon: <Factory className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> },
    { href: "/monitoring", title: "Monitoring BKH", desc: "Input laporan produksi harian & QC", icon: <ClipboardList className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> },
    { href: "/inventory", title: "Gudang Proyek (FG)", desc: "Stok barang jadi precast & DO kirim", icon: <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> },
    { href: "/inventory/master", title: "Gudang Pusat Raw Mat", desc: "Mutasi stok material semen, besi, dll.", icon: <Warehouse className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> },
    { href: "/budgeting", title: "Kontrol Budget", desc: "Monitor RAB proyek & pengajuan PR", icon: <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> },
  ];

  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    }
  };

  return (
    <div className="p-8 min-h-screen text-slate-800 dark:text-slate-100 bg-background font-sans">
      
      {/* ─── MAIN HEADER ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard Analitik</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Sistem Kontrol Operasi Kalla Beton Precast</p>
        </div>
        
        {/* User profile & logout controls */}
        <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-border">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-extrabold flex items-center justify-center text-sm">
              {session?.fullName?.charAt(0)?.toUpperCase()}
            </div>
            <div className="text-left pr-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{session?.fullName}</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">{session?.role} Account</div>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>

      {/* ─── MAIN GRID ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: METRICS, DYNAMICS, DATA TABLES */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* METRICS ROW (Clean layout replacing gradient-heavy hero metrices) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Realisasi Kas Aktual (Primary Accent Border instead of full gradient background) */}
            <div className="bg-card rounded-2xl border-2 border-emerald-600/20 dark:border-emerald-500/10 p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40">
                  <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1">
                  <TrendingUp size={11} /> +2.08%
                </span>
              </div>
              <div className="mt-4">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Realisasi Kas Aktual</span>
                <div className="text-xl font-black text-slate-950 dark:text-white tracking-tight mt-1">Rp {totalActual.toLocaleString("id-ID")}</div>
              </div>
            </div>

            {/* Card 2: Proyek Aktif */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 text-[10px] font-bold rounded-full">
                  +1.4%
                </span>
              </div>
              <div className="mt-4">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Proyek Aktif (Tender s/d Kontrak)</span>
                <div className="text-xl font-black text-slate-950 dark:text-white tracking-tight mt-1">{totalAktif} Proyek</div>
              </div>
            </div>

            {/* Card 3: Total Produksi */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                  <Factory className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 text-[10px] font-bold rounded-full">
                  +12.1%
                </span>
              </div>
              <div className="mt-4">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">Total Produksi Cetak BKH</span>
                <div className="text-xl font-black text-slate-950 dark:text-white tracking-tight mt-1">{totalFg.toLocaleString("id-ID")} pcs</div>
              </div>
            </div>

          </div>

          {/* Weekly Dynamics Chart (No uppercase kickers, cleaner grid layout) */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dinamika Mingguan</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Statistik Cetak Precast 7 Hari Terakhir</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"/> Layak (Good)</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"/> Rusak (Reject)</div>
              </div>
            </div>

            {/* Column Chart */}
            <div className="h-60 flex items-end justify-between gap-6 pt-4 border-b border-border px-4">
              {chartData.map((d, idx) => {
                const fgHeight = `${(d.fgQty / maxChartVal) * 85}%`;
                const rejectHeight = `${(d.damagedQty / maxChartVal) * 85}%`;
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 bg-slate-900 dark:bg-slate-950 text-white text-xs font-mono px-3 py-1.5 rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 text-center border border-slate-800">
                      <div>Good: <b>{d.fgQty} pcs</b></div>
                      <div>Cacat: <b>{d.damagedQty} pcs</b></div>
                    </div>
                    
                    {/* Bars */}
                    <div className="flex items-end gap-1.5 w-full justify-center h-full">
                      <div className="w-3 sm:w-5 bg-emerald-500 rounded-t-sm transition-all duration-1000 origin-bottom" style={{ height: fgHeight }} />
                      {d.damagedQty > 0 && (
                        <div className="w-1.5 sm:w-2.5 bg-red-500 rounded-t-sm transition-all duration-1000 origin-bottom" style={{ height: rejectHeight }} />
                      )}
                    </div>
                    
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3 block tracking-tight shrink-0">{d.date}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Orders / Feed Table */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Aktivitas Terbaru</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Daftar Logistik dan Laporan BKH Terakhir</p>
              </div>

              {/* Feed selector */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-border shrink-0">
                <button 
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeFeedTab === "BKH" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
                  onClick={() => setActiveFeedTab("BKH")}
                >
                  Produksi BKH ({recentBkh.length})
                </button>
                <button 
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeFeedTab === "DELIVERY" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
                  onClick={() => setActiveFeedTab("DELIVERY")}
                >
                  Surat Jalan DO ({recentDeliveries.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-slate-500 dark:text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-900/20">
                    <th className="p-3">Waktu</th>
                    <th className="p-3">Nama Aktivitas</th>
                    <th className="p-3">Proyek / Dokumen</th>
                    <th className="p-3 text-right">Kuantitas</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeFeedTab === "BKH" ? (
                    recentBkh.length === 0 ? (
                      <tr><td colSpan={5} className="p-6 text-center text-slate-400 italic">Belum ada aktivitas produksi harian (BKH).</td></tr>
                    ) : (
                      recentBkh.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="p-3 text-slate-400 font-semibold">
                            {new Date(item.reportDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short' })}
                          </td>
                          <td className="p-3 font-bold text-slate-800 dark:text-white">Cetak Produk Precast</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-700 dark:text-slate-350 max-w-[200px] truncate" title={item.projectName || ""}>{item.projectName}</div>
                            <div className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">SPK: {item.spkNumber}</div>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{item.fgQty} pcs</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100/65 dark:border-emerald-900/30 rounded-full text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Layak
                            </span>
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    recentDeliveries.length === 0 ? (
                      <tr><td colSpan={5} className="p-6 text-center text-slate-400 italic">Belum ada logistik pengiriman DO.</td></tr>
                    ) : (
                      recentDeliveries.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="p-3 text-slate-400 font-semibold">
                            {new Date(item.exitDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short' })}
                          </td>
                          <td className="p-3 font-bold text-slate-800 dark:text-white">{item.productName}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-700 dark:text-slate-350 max-w-[200px] truncate" title={item.projectName || ""}>{item.projectName}</div>
                            <div className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">DO: {item.deliveryNumber}</div>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{item.qty} pcs</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-100/65 dark:border-blue-900/30 rounded-full text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> Dikirim
                            </span>
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: CIRCLES, QUICK LINKS */}
        <div className="space-y-8">
          
          {/* QC rings graphic */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Statistik Hasil Cetak QC</h3>
              
              <div className="relative w-48 h-48 mx-auto flex items-center justify-center my-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                  {/* Outer Ring: GOOD */}
                  <circle cx="80" cy="80" r="64" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="8" fill="transparent" />
                  <circle 
                    cx="80" 
                    cy="80" 
                    r="64" 
                    className="stroke-emerald-500 transition-all duration-1000" 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 64}
                    strokeDashoffset={2 * Math.PI * 64 * (defectRate / 100)}
                  />
                  
                  {/* Middle Ring: Target */}
                  <circle cx="80" cy="80" r="48" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="8" fill="transparent" />
                  <circle 
                    cx="80" 
                    cy="80" 
                    r="48" 
                    className="stroke-indigo-500 transition-all duration-1000" 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={totalTargetSpk > 0 ? 2 * Math.PI * 48 * (1 - (Math.min(targetAchievedPct, 100) / 100)) : 2 * Math.PI * 48}
                  />

                  {/* Inner Ring: Reject */}
                  <circle cx="80" cy="80" r="32" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="8" fill="transparent" />
                  <circle 
                    cx="80" 
                    cy="80" 
                    r="32" 
                    className="stroke-red-500 transition-all duration-1000" 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 32}
                    strokeDashoffset={2 * Math.PI * 32 * (qcGoodPct / 100)}
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xl font-black text-slate-900 dark:text-white block">{(totalFg).toLocaleString("id-ID")}</span>
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold tracking-wider">TOTAL PCS</span>
                </div>
              </div>
            </div>

            {/* Legends */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Mutu Lulus (Good)</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{totalFg.toLocaleString("id-ID")} pcs <span className="text-[10px] text-emerald-600 font-bold ml-1">+{qcGoodPct.toFixed(1)}%</span></span>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Target SPK</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{totalTargetSpk.toLocaleString("id-ID")} pcs <span className="text-[10px] text-indigo-600 font-bold ml-1">+{targetAchievedPct.toFixed(1)}%</span></span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Mutu Rusak (Reject)</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{totalDamaged.toLocaleString("id-ID")} pcs <span className="text-[10px] text-red-500 font-bold ml-1">-{qcRejectPct.toFixed(1)}%</span></span>
              </div>
            </div>
          </div>

          {/* Quick Access Menu — Clean, Unified Slate cards */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Navigasi Modul Terintegrasi</h3>
            
            <div className="space-y-2">
              {coreModules.map((item, idx) => (
                <Link key={idx} href={item.href} className="flex justify-between items-center p-3.5 rounded-xl border border-border hover:border-emerald-500/50 dark:hover:border-emerald-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all group bg-slate-50/20 dark:bg-slate-900/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-border flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-white">{item.title}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
