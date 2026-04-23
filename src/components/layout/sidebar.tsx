"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Factory, 
  ClipboardList, 
  BarChart3, 
  Warehouse, 
  Truck,
  Settings,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionPayload } from "@/lib/auth";

// ✅ Pakai SessionPayload langsung dari lib/auth
interface SidebarProps {
  session?: SessionPayload | null;
}

export default function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();
  // ✅ Sesuai field asli: fullName & role (bukan user.name / user.role)
  const userName = session?.fullName || "M. Fikri (Ikki)";
  const userRole = session?.role || "Web Developer";
  const userInitial = userName.substring(0, 2).toUpperCase();

  const menuItems = [
    { 
      label: "Dashboard", 
      href: "/", 
      icon: LayoutDashboard 
    },
    { 
      label: "CRM & Sales", 
      href: "/crm", 
      icon: Users 
    },
    { 
      label: "Rencana Produksi", 
      href: "/production", 
      icon: Factory 
    },
    { 
      label: "Monitoring BKH", 
      href: "/monitoring", 
      icon: ClipboardList 
    },
    { 
      label: "Gudang Proyek", 
      href: "/inventory", 
      icon: Package 
    },
    { 
      label: "Gudang Pusat", 
      href: "/inventory/master", 
      icon: Warehouse 
    },
    { 
      label: "Kontrol Budget", 
      href: "/budgeting", 
      icon: BarChart3 
    },
  ];

  return (
    <div className="w-64 bg-[#1e293b] border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Logo Kalla Beton */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-black text-white italic">
            KB
          </div>
          <div>
            <h1 className="text-white font-black text-sm leading-tight">KALLA BETON</h1>
            <p className="text-slate-500 text-[10px] font-bold">PRECAST SYSTEM v1.2</p>
          </div>
        </div>
      </div>

      {/* Menu Navigasi */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-black text-slate-500 uppercase px-3 mb-2 tracking-widest">
          Main Menu
        </p>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 group",
                isActive 
                  ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-900/10" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform duration-200",
                isActive ? "text-emerald-400" : "text-slate-500 group-hover:scale-110"
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bagian Bawah (User & Settings) */}
      <div className="p-4 border-t border-slate-800 bg-[#162032]/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-slate-700 rounded-full border border-slate-600 overflow-hidden">
            <div className="w-full h-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
              {userInitial}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white truncate">{userName}</p>
            <p className="text-[10px] text-slate-500 font-bold truncate">{userRole}</p>
          </div>
        </div>
        <button 
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className="w-full mt-4 flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-bold transition-all"
        >
          <LogOut className="w-4 h-4" />
          Keluar Sistem
        </button>
      </div>
    </div>
  );
}