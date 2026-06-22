"use client";

import { useEffect, useState } from "react";
import { 
  Monitor, 
  Clock, 
  Activity, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TVStats {
  totalGood: number;
  totalDamaged: number;
  totalReturn: number;
  defectRate: number;
  monthlyTarget: number;
  monthlyProgress: number;
  monthlyProgressPercent: number;
}

interface TVProject {
  id: string;
  spkNumber: string;
  projectName: string;
  targetVolume: number;
  unit: string;
  producedGood: number;
  producedDamaged: number;
  progressPercent: number;
}

interface TVDelivery {
  id: string;
  deliveryNumber: string;
  recipient: string;
  qty: number;
  exitDate: string;
  productName: string;
  projectName: string;
  spkNumber: string;
  notes: string;
}

interface TVData {
  globalStats: TVStats;
  activeProjects: TVProject[];
  recentDeliveries: TVDelivery[];
}

interface TVClientProps {
  initialData: TVData;
}

export default function TVClient({ initialData }: TVClientProps) {
  const [data, setData] = useState<TVData>(initialData);
  const [activeSlide, setActiveSlide] = useState(0);
  const [time, setTime] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [slideProgress, setSlideProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const SLIDE_DURATION = 12; // detik per slide
  const totalSlides = 3;

  // 1. Clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setDateStr(now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Data Fetch / Polling
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/tv-board");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch TV board data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 3. Carousel logic & Polling Timer logic
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          setActiveSlide((curr) => (curr + 1) % totalSlides);
          return 0;
        }
        return prev + (100 / (SLIDE_DURATION * 10)); // increment every 100ms
      });
    }, 100);

    const dataCountdownInterval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchData();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(slideInterval);
      clearInterval(dataCountdownInterval);
    };
  }, []);

  const formatNumber = (num: number) => {
    return num.toLocaleString("id-ID");
  };

  const getSlideTitle = (index: number) => {
    switch (index) {
      case 0:
        return "Overview Produksi & Mutu (QC)";
      case 1:
        return "Kemajuan SPK Proyek Aktif";
      case 2:
        return "Logistik Pengiriman (Delivery Orders) Hari Ini";
      default:
        return "";
    }
  };

  const { globalStats, activeProjects, recentDeliveries } = data;

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col justify-between p-6 select-none font-sans relative">
      {/* Decorative background grid and flows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#022c22_1px,transparent_1px),linear-gradient(to_bottom,#022c22_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* ─── HEADER UTAMA ─── */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-5 bg-slate-950/80 px-5 py-2 rounded-2xl">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Kalla Beton Logo" className="w-14 h-14 object-contain bg-white rounded-xl p-0.5 shadow-lg shadow-emerald-500/10 shrink-0" />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              Kalla Beton <span className="text-xs bg-emerald-950 border border-emerald-500/30 text-emerald-400 font-extrabold px-2.5 py-1 rounded-md">Precast Division</span>
            </h1>
            <p className="text-xs text-slate-400 font-bold mt-1">Real-time Digital Signage Dashboard</p>
          </div>
        </div>

        {/* Dynamic Slide Title */}
        <div className="hidden md:flex flex-col items-center max-w-lg">
          <span className="text-[10px] font-black text-slate-500 mb-1">Tampilan Monitor</span>
          <h2 className="text-xl font-black text-emerald-400 tracking-wide transition-all duration-300">
            {getSlideTitle(activeSlide)}
          </h2>
        </div>

        {/* Date and running clock */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-extrabold text-slate-400">{dateStr}</p>
            <p className="text-3xl font-black text-white font-mono tracking-tight mt-1 flex items-center justify-end gap-3">
              <Clock className="w-6 h-6 text-emerald-400" />
              {time}
            </p>
          </div>
          <div className="h-12 w-px bg-slate-850" />
          <div className="flex items-center gap-3">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
            </span>
            <span className="text-sm font-black text-emerald-500">Live</span>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT CONTAINER (SLIDES) ─── */}
      <div className="relative z-10 flex-1 my-6 overflow-hidden px-2">
        
        {/* SLIDE 1: OVERVIEW PRODUKSI & QC */}
        <div className={cn(
          "w-full h-full grid grid-cols-1 xl:grid-cols-3 gap-6 transition-all duration-500 absolute inset-0",
          activeSlide === 0 ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
          {/* Left Panel: 3 Big Metric Cards */}
          <div className="xl:col-span-2 grid grid-rows-3 gap-5">
            {/* Card 1: GOOD Production */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-8 flex items-center justify-between relative overflow-hidden group hover:border-emerald-500/20 transition-all shadow-inner">
              <div>
                <p className="text-slate-400 text-sm font-black mb-3">Total Produksi Lolos QC (Good)</p>
                <h3 className="text-7xl font-black text-white font-mono tracking-tight flex items-baseline gap-3">
                  <span className="text-emerald-400">{formatNumber(globalStats.totalGood)}</span>
                  <span className="text-lg font-bold text-slate-500">Pcs</span>
                </h3>
              </div>
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            </div>

            {/* Card 2: REJECT Production */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-8 flex items-center justify-between relative overflow-hidden group hover:border-red-500/20 transition-all shadow-inner">
              <div>
                <p className="text-slate-400 text-sm font-black mb-3">Total Reject Cacat Cetak</p>
                <h3 className="text-7xl font-black text-white font-mono tracking-tight flex items-baseline gap-3">
                  <span className="text-red-400">{formatNumber(globalStats.totalDamaged)}</span>
                  <span className="text-lg font-bold text-slate-500">Pcs</span>
                </h3>
              </div>
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-md">
                <AlertTriangle className="w-10 h-10" />
              </div>
            </div>

            {/* Card 3: Defect Rate */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-8 flex items-center justify-between relative overflow-hidden group hover:border-indigo-500/20 transition-all shadow-inner">
              <div>
                <p className="text-slate-400 text-sm font-black mb-3">Tingkat Cacat Global (Defect Rate)</p>
                <h3 className="text-7xl font-black text-white font-mono tracking-tight flex items-baseline gap-2">
                  <span className={cn(
                    globalStats.defectRate > 2 ? "text-red-400" : globalStats.defectRate > 1 ? "text-amber-400" : "text-indigo-400"
                  )}>{globalStats.defectRate}%</span>
                </h3>
              </div>
              <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-md">
                <TrendingUp className="w-10 h-10" />
              </div>
            </div>
          </div>

          {/* Right Panel: Monthly Progress Ring Indicator */}
          <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-8 flex flex-col justify-between items-center relative overflow-hidden group">
            <div className="text-center w-full">
              <p className="text-slate-300 text-sm font-black mb-1">Progres Target Bulanan</p>
              <p className="text-xs text-slate-500 font-bold">Seluruh SPK Precast Aktif Berjalan</p>
            </div>

            {/* Large SVG Circular progress */}
            <div className="relative w-64 h-64 my-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Track */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#0b1329" strokeWidth="8" />
                {/* Progress Circle */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="transparent" 
                  stroke="#10b981" 
                  strokeWidth="8" 
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - globalStats.monthlyProgressPercent / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-in-out"
                />
              </svg>
              {/* Inner Text */}
              <div className="absolute text-center">
                <span className="text-5xl font-black text-white font-mono">{globalStats.monthlyProgressPercent}%</span>
                <span className="block text-[10px] font-black text-slate-400 mt-1">Terpenuhi</span>
              </div>
            </div>

            <div className="w-full text-sm font-bold text-center border-t border-slate-800/60 pt-5 grid grid-cols-2 gap-4 text-slate-450">
              <div className="border-r border-slate-800/60">
                <span className="block text-[10px] text-slate-500">Target Global</span>
                <span className="text-slate-200 font-mono text-lg font-black">{formatNumber(globalStats.monthlyTarget)}</span> <span className="text-[10px] text-slate-500">Pcs</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500">Realisasi Good</span>
                <span className="text-emerald-400 font-mono text-lg font-black">{formatNumber(globalStats.monthlyProgress)}</span> <span className="text-[10px] text-slate-500">Pcs</span>
              </div>
            </div>
          </div>
        </div>

        {/* SLIDE 2: PROGRESS SPK PROYEK AKTIF */}
        <div className={cn(
          "w-full h-full transition-all duration-500 absolute inset-0 flex flex-col justify-start",
          activeSlide === 1 ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
          {activeProjects.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/10 border border-slate-850 rounded-3xl p-12 my-auto">
              <Activity className="w-20 h-20 text-slate-700 mb-6 animate-pulse" />
              <p className="text-slate-450 text-xl font-bold">Tidak ada Surat Perintah Kerja (SPK) Aktif saat ini</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 h-full justify-start overflow-hidden max-h-[78vh] pr-2 custom-scrollbar">
              {activeProjects.slice(0, 5).map((project) => (
                <div 
                  key={project.id} 
                  className="bg-slate-900/30 border border-slate-850 rounded-2xl p-5 flex items-center justify-between gap-6 hover:border-emerald-500/20 transition-all shadow-sm"
                >
                  {/* Left Section: SPK Badge & Big Project Title */}
                  <div className="w-2/5 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-black font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-3 py-1 rounded-md">
                        {project.spkNumber}
                      </span>
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded border",
                        project.progressPercent >= 100 
                          ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-400"
                          : "bg-indigo-950/50 border-indigo-500/30 text-indigo-400"
                      )}>
                        {project.progressPercent}% Jadi
                      </span>
                    </div>
                    <h4 className="text-xl font-black text-white truncate leading-tight" title={project.projectName}>
                      {project.projectName}
                    </h4>
                  </div>

                  {/* Center Section: Large Progress Bar */}
                  <div className="flex-1 px-4">
                    <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                      <span>Progres Produksi Fisik</span>
                      <span>
                        <strong className="text-emerald-400 font-mono text-sm">{formatNumber(project.producedGood)}</strong>
                        <span className="text-slate-500"> / {formatNumber(project.targetVolume)} {project.unit}</span>
                      </span>
                    </div>
                    
                    <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800/60 relative">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000 relative",
                          project.progressPercent >= 90 ? "bg-emerald-500" : "bg-indigo-500"
                        )}
                        style={{ width: `${project.progressPercent}%` }}
                      >
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[size:12px_12px] animate-pulse" />
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Defect details or indicators */}
                  <div className="w-1/5 shrink-0 text-right flex flex-col justify-center">
                    <span className="text-3xl font-black text-white font-mono">{project.progressPercent}%</span>
                    {project.producedDamaged > 0 ? (
                      <span className="text-[10px] text-red-400 font-extrabold flex items-center justify-end gap-1 mt-1 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Defect: {project.producedDamaged} unit
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-500 font-extrabold flex items-center justify-end gap-1 mt-1">
                        QC Pass
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SLIDE 3: LOGISTIK & PENGIRIMAN (DO) TERKINI */}
        <div className={cn(
          "w-full h-full transition-all duration-500 absolute inset-0 flex flex-col justify-between",
          activeSlide === 2 ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
          {recentDeliveries.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/10 border border-slate-850 rounded-3xl p-12 my-auto">
              <Truck className="w-20 h-20 text-slate-700 mb-6 animate-pulse" />
              <p className="text-slate-450 text-xl font-bold">Belum ada aktivitas pengiriman (Surat Jalan/DO) hari ini</p>
            </div>
          ) : (
            <div className="flex-1 bg-slate-900/20 border border-slate-850 rounded-3xl overflow-hidden flex flex-col h-full">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-5 bg-slate-900/60 border-b border-slate-850 text-xs font-black text-slate-400">
                <div className="col-span-2">No Surat Jalan (DO)</div>
                <div className="col-span-4">Proyek / Lokasi Penerima</div>
                <div className="col-span-3">Nama Produk Precast</div>
                <div className="col-span-1 text-center">Kuantitas</div>
                <div className="col-span-1 text-center">Waktu</div>
                <div className="col-span-1 text-center">Status</div>
              </div>
              
              {/* Flight Board-style Scroll List */}
              <div className="flex-1 divide-y divide-slate-900 overflow-hidden">
                {recentDeliveries.slice(0, 7).map((d) => (
                  <div key={d.id} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-slate-900/10 transition-colors text-base font-bold text-slate-200">
                    <div className="col-span-2 font-mono text-emerald-400 text-sm font-black">{d.deliveryNumber}</div>
                    <div className="col-span-4 truncate text-white" title={d.projectName}>
                      <span className="block truncate text-base font-black">{d.projectName}</span>
                      <span className="block text-xs text-slate-450 font-bold truncate mt-1">Tujuan: {d.recipient}</span>
                    </div>
                    <div className="col-span-3 text-slate-300 text-sm truncate" title={d.productName}>{d.productName}</div>
                    <div className="col-span-1 text-center font-mono text-white text-base font-black">
                      {d.qty} <span className="text-[10px] text-slate-500 font-bold">Pcs</span>
                    </div>
                    <div className="col-span-1 text-center text-slate-300 font-mono text-sm font-black">
                      {new Date(d.exitDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-950/50 border border-emerald-500/30 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Kirim
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── FOOTER BAR (Countdown & indicators) ─── */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between border-t border-slate-800/80 pt-4 bg-slate-950/80 px-5 py-2 rounded-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500">
            <Monitor className="w-4 h-4 text-slate-400" />
            <span>TV-Board v1.2</span>
          </div>
          <div className="h-5 w-px bg-slate-850" />
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <RefreshCw className={cn("w-4 h-4 text-emerald-500", isRefreshing && "animate-spin")} />
            <span>Update data otomatis: <strong className="font-mono text-emerald-400">{refreshCountdown}s</strong></span>
          </div>
        </div>

        {/* Carousel indicator dot bar */}
        <div className="flex items-center gap-3 my-3 md:my-0">
          {[0, 1, 2].map((idx) => (
            <button 
              key={idx}
              onClick={() => { setActiveSlide(idx); setSlideProgress(0); }}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                activeSlide === idx ? "w-10 bg-emerald-500 shadow-md shadow-emerald-500/40" : "w-2.5 bg-slate-800 hover:bg-slate-700"
              )}
              title={getSlideTitle(idx)}
            />
          ))}
        </div>

        <div className="text-xs font-bold text-slate-500">
          PT Kalla Beton © 2026 — Divisi Precast System
        </div>
      </div>

      {/* ─── CAROUSEL TICKER BAR (Bottom-most thin timeline indicator) ─── */}
      <div className="absolute bottom-0 left-0 h-1.5 bg-slate-900 w-full z-20 pointer-events-none">
        <div 
          className="h-full bg-emerald-500 transition-all duration-100 ease-linear"
          style={{ width: `${slideProgress}%` }}
        />
      </div>
    </div>
  );
}
