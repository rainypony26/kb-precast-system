import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { 
  LayoutDashboard, 
  PlusCircle, 
  ClipboardCheck, 
  Warehouse, 
  Wallet,
  ChevronRight,
  History, 
  Package
} from "lucide-react";

async function getStats() {
  try {
    const result = await db
      .select({ status: projects.status, count: sql<number>`count(*)::int` })
      .from(projects)
      .groupBy(projects.status);

    const stats = { 
      TENDER: 0, 
      PENAWARAN: 0, 
      NEGO: 0, 
      PO: 0, 
      KONTRAK: 0, 
      SELESAI: 0, 
      BATAL: 0 
    };

    result.forEach((r) => { 
      if (r.status in stats) {
        stats[r.status as keyof typeof stats] = r.count; 
      }
    });

    return stats;
  } catch (error) { 
    console.error("Error fetching stats:", error);
    return null; 
  }
}

export default async function DashboardPage() {
  const session = await getSession();
  const stats = await getStats();

  const totalAktif = (stats?.TENDER ?? 0) + (stats?.PENAWARAN ?? 0) + (stats?.NEGO ?? 0) + (stats?.PO ?? 0) + (stats?.KONTRAK ?? 0);

  const statCards = [
    { label: "Total Proyek Aktif", value: totalAktif, sub: "Pipeline berjalan", icon: "🏗️" },
    { label: "Sedang Nego", value: stats?.NEGO ?? 0, sub: "Menunggu DEAL", icon: "🤝" },
    { label: "Kontrak Aktif", value: stats?.KONTRAK ?? 0, sub: "Tahap Produksi", icon: "📋" },
    { label: "Proyek Selesai", value: stats?.SELESAI ?? 0, sub: "Terselesaikan", icon: "✅" },
  ];

  const quickAccess = [
    { href: "/crm", title: "Tambah Proyek Baru", desc: "Input data tender/penawaran", tag: "CRM", icon: <PlusCircle size={18}/> },
    { href: "/production", title: "Buat SPK", desc: "Produksi kontrak aktif", tag: "Produksi", icon: <ClipboardCheck size={18}/> },
    { href: "/monitoring", title: "Input Laporan Harian", desc: "Catat hasil produksi (BKH)", tag: "BKH", icon: <History size={18}/> },
    { href: "/inventory/master", title: "Cek Gudang Pusat", desc: "Update stok raw material", tag: "Gudang", icon: <Warehouse size={18}/> },
    { href: "/budgeting", title: "Monitor Budget", desc: "RAB vs Realisasi", tag: "Finance", icon: <Wallet size={18}/> },
    { href: "/inventory/proyek", title: "Logistik Proyek", desc: "Cek pemakaian material", tag: "Logistik", icon: <Package size={18}/> },
  ];

  const pipeline = [
    { label: "Tender", value: stats?.TENDER ?? 0, color: "#94a3b8" },
    { label: "Penawaran", value: stats?.PENAWARAN ?? 0, color: "#60a5fa" },
    { label: "Nego", value: stats?.NEGO ?? 0, color: "#fbbf24" },
    { label: "PO", value: stats?.PO ?? 0, color: "#c084fc" },
    { label: "Kontrak", value: stats?.KONTRAK ?? 0, color: "#4ade80" },
  ];

  const dateStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <div className="px-8 py-6 flex items-center justify-between border-b border-slate-800 bg-[#0f172a]/50 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Selamat datang, {session?.fullName} 👋
          </h1>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tighter bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Sistem Kalla Beton Aktif
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {statCards.map((card) => (
            <div key={card.label} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all shadow-xl group">
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{card.icon}</div>
              <div className="text-4xl font-black text-white mb-1">{card.value}</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</div>
              <p className="text-[10px] text-slate-600 font-medium mt-1 italic">{card.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Akses Navigasi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickAccess.map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center justify-between p-4 rounded-xl bg-[#1e293b] border border-slate-800 hover:bg-[#25334a] hover:border-emerald-500/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-lg bg-slate-900 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-white text-sm font-bold">{item.title}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-700 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Pipeline Status</h2>
            <div className="rounded-3xl p-6 bg-[#1e293b] border border-slate-800 shadow-2xl">
              <div className="space-y-5">
                {pipeline.map((p) => {
                  const pct = totalAktif > 0 ? Math.round((p.value / totalAktif) * 100) : 0;
                  return (
                    <div key={p.label}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                          <span className="text-xs font-bold text-slate-300 uppercase">{p.label}</span>
                        </div>
                        <span className="text-xs font-black text-white">{p.value} UNIT</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, background: p.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}