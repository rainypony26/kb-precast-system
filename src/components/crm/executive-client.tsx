"use client";

import { useState, useEffect } from "react";
import { formatNumber } from "@/lib/utils";
import { 
  BarChart3, TrendingUp, DollarSign, PieChart, ShieldAlert, 
  RotateCw, Loader2, ArrowUpRight, ArrowDownRight, Award, CheckCircle2,
  HelpCircle, Target, Percent, Info
} from "lucide-react";
import type { SessionPayload } from "@/lib/auth";

interface ExecutiveClientProps {
  session: SessionPayload | null;
}

export default function ExecutiveClient({ session }: ExecutiveClientProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/executive-report");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || "Gagal memuat data laporan eksekutif.");
      }
    } catch (e) {
      setError("Kesalahan koneksi jaringan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport();
  }, []);

  // Hitung summary metrik dari projectsSummary
  const summary = useEffectMemo(() => {
    if (!data || !data.projectsSummary) return null;
    const list = data.projectsSummary;
    let totalRevenue = 0;
    let totalCost = 0;
    
    list.forEach((p: any) => {
      totalRevenue += p.contractValue;
      totalCost += p.actualCost;
    });

    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      avgMargin
    };
  }, [data]);

  // helper function to hook up useMemo
  function useEffectMemo<T>(fn: () => T, deps: any[]): T {
    const [val, setVal] = useState<T>(fn);
    useEffect(() => {
      setVal(fn());
    }, deps);
    return val;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm animate-pulse">Mengolah data keuangan direksi...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-6 rounded-2xl max-w-xl mx-auto text-center space-y-4 shadow-sm my-10">
        <ShieldAlert className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto" />
        <h2 className="text-lg font-black text-red-800 dark:text-red-300">Gagal Membuka Dashboard</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{error || "Terjadi kesalahan sistem."}</p>
        <button onClick={fetchReport} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-red-500 transition-colors">
          Coba Lagi
        </button>
      </div>
    );
  }

  // Cari cash flow tertinggi untuk scale grafik
  const maxCashValue = Math.max(
    ...data.cashFlow.map((cf: any) => Math.max(cf.inflow, cf.outflow)),
    100000000 // default min
  );

  return (
    <div className="space-y-8 text-foreground animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-2">
            <BarChart3 className="w-8 h-8" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Executive Report Dashboard</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Visualisasi keuangan, analisis BEP & cash flow bulanan direksi</p>
        </div>

        <button 
          onClick={fetchReport}
          className="bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
        >
          <RotateCw size={14} className={loading ? "animate-spin" : ""} /> Refresh data
        </button>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Revenue */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between group hover:border-emerald-500/50 transition-all">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Nilai kontrak (Inflow)</span>
              <div className="text-xl font-black text-slate-800 dark:text-white font-mono">Rp {formatNumber(summary.totalRevenue)}</div>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5"><TrendingUp size={10} /> Akumulasi SPH disetujui</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign size={20} />
            </div>
          </div>

          {/* Card 2: Total Cost */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between group hover:border-emerald-500/50 transition-all">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Realisasi biaya aktual</span>
              <div className="text-xl font-black text-slate-800 dark:text-white font-mono">Rp {formatNumber(summary.totalCost)}</div>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">Pengeluaran SPK operasional</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:scale-110 transition-transform">
              <ArrowDownRight size={20} />
            </div>
          </div>

          {/* Card 3: Net Profit */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between group hover:border-emerald-500/50 transition-all">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Estimasi laba kotor</span>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">Rp {formatNumber(summary.totalProfit)}</div>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5"><ArrowUpRight size={10} /> Selisih omset vs biaya</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Award size={20} />
            </div>
          </div>

          {/* Card 4: Profit Margin */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between group hover:border-emerald-500/50 transition-all">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Rata-rata margin laba</span>
              <div className="text-xl font-black text-slate-800 dark:text-white font-mono">{summary.avgMargin.toFixed(1)}%</div>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5"><Percent size={10} /> Margin kontrak efektif</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <PieChart size={20} />
            </div>
          </div>
        </div>
      )}

      {/* ─── CASH FLOW GRAPH & PROJECTS MARGIN ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Proyeksi Cash Flow Bulanan (Left - 7 cols) */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm lg:col-span-7 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-white">Tren arus kas (Cash flow tren)</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Perbandingan nilai uang masuk (Inflow Kontrak) vs uang keluar (Outflow Supplier & Realisasi)</p>
          </div>

          {/* Custom SVG/HTML Bar Chart */}
          <div className="mt-8 space-y-6">
            {data.cashFlow.map((cf: any, idx: number) => {
              const inflowPercent = (cf.inflow / maxCashValue) * 100;
              const outflowPercent = (cf.outflow / maxCashValue) * 100;

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-300 font-bold">{cf.month}</span>
                    <div className="flex gap-4">
                      <span className="text-emerald-600 dark:text-emerald-400">In: Rp {formatNumber(cf.inflow)}</span>
                      <span className="text-red-500 dark:text-red-400">Out: Rp {formatNumber(cf.outflow)}</span>
                    </div>
                  </div>
                  
                  {/* Bars Container */}
                  <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    {/* Inflow Bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-10 text-[9px] text-slate-400 dark:text-slate-500 font-bold">Inflow</div>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${Math.max(inflowPercent, 2)}%` }}
                        />
                      </div>
                    </div>
                    {/* Outflow Bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-10 text-[9px] text-slate-400 dark:text-slate-500 font-bold">Outflow</div>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-red-400 h-full rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${Math.max(outflowPercent, 2)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-2">
            <Info size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
            <span>Kalkulasi cash flow diambil berdasarkan tanggal kontrak rilis dan realisasi kas/purchase order ke supplier.</span>
          </div>
        </div>

        {/* Analisa Margin Proyek (Right - 5 cols) */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm lg:col-span-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-white">Analisa margin laba proyek</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Perbandingan Nilai Kontrak Proyek terhadap Total Biaya Aktual</p>
          </div>

          <div className="mt-6 space-y-5 overflow-y-auto max-h-[350px] pr-1">
            {data.projectsSummary.length === 0 ? (
              <div className="text-slate-400 dark:text-slate-500 text-center py-10 font-bold">Belum ada data kontrak proyek aktif.</div>
            ) : (
              data.projectsSummary.map((p: any) => {
                const costPercent = p.contractValue > 0 ? (p.actualCost / p.contractValue) * 100 : 0;
                let costColor = "bg-emerald-500";
                if (costPercent > 70) costColor = "bg-amber-500";
                if (costPercent > 90) costColor = "bg-red-500";

                return (
                  <div key={p.id} className="border border-slate-100 dark:border-slate-800 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-white truncate max-w-[180px]" title={p.name}>{p.name}</h4>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">Kode: {p.code}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400">Rp {formatNumber(p.profitValue)}</div>
                        <span className={`text-[9px] font-bold ${p.marginPercent >= 20 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          Margin: {p.marginPercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Biaya vs Nilai Kontrak */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                        <span>Realisasi Biaya: Rp {formatNumber(p.actualCost)}</span>
                        <span>{costPercent.toFixed(0)}% dari Anggaran</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`${costColor} h-full rounded-full transition-all duration-1000`}
                          style={{ width: `${Math.min(costPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ─── BREAK-EVEN POINT (BEP) ANALYSIS ─── */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-base font-black text-slate-800 dark:text-white">Break-even point (BEP) proyek</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Estimasi jumlah volume precast yang harus dicetak agar biaya operasional proyek tertutup (titik impas).</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.bepAnalysis.length === 0 ? (
            <div className="col-span-full text-slate-400 dark:text-slate-500 py-10 text-center font-bold border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/30">
              Belum ada data RAB Approved yang bisa dianalisis BEP-nya.
            </div>
          ) : (
            data.bepAnalysis.map((bep: any, idx: number) => {
              const achieved = bep.actualProduction >= bep.bepVolume;
              
              return (
                <div key={idx} className="border border-border rounded-2xl p-5 shadow-sm bg-card relative group hover:border-emerald-500/50 transition-all flex flex-col justify-between">
                  {achieved && (
                    <div className="absolute top-3 right-3 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold text-[9px] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
                      <CheckCircle2 size={10} /> BEP tercapai
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-white truncate pr-16" title={bep.projectName}>
                        {bep.projectName}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Target kontrak: {bep.targetVolume} Pcs</p>
                    </div>

                    {/* Rincian Parameter */}
                    <div className="bg-card p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] font-bold space-y-2 text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Biaya Tetap (Fixed Cost)</span>
                        <span className="text-slate-700 dark:text-slate-300 font-mono">Rp {formatNumber(bep.fixedCosts)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Harga Jual per Pcs</span>
                        <span className="text-slate-700 dark:text-slate-300 font-mono">Rp {formatNumber(bep.pricePerUnit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Biaya Variabel per Pcs</span>
                        <span className="text-slate-700 dark:text-slate-300 font-mono">Rp {formatNumber(bep.variableCostPerUnit)}</span>
                      </div>
                    </div>

                    {/* Volume BEP target */}
                    <div className="flex justify-between items-end bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-800/30 p-3 rounded-xl">
                      <div className="space-y-0.5">
                        <div className="text-[9px] text-emerald-800 dark:text-emerald-300 font-semibold">Volume BEP target</div>
                        <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">{bep.bepVolume} <span className="text-xs">Pcs</span></div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">Realisasi cetak Good</div>
                        <div className="text-lg font-black text-slate-700 dark:text-slate-300 font-mono">{bep.actualProduction} <span className="text-xs text-slate-500 dark:text-slate-400">Pcs</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Achievement */}
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                      <span>Progres Pencapaian BEP</span>
                      <span>{bep.bepAchievedPercent.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${achieved ? "bg-emerald-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(bep.bepAchievedPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
