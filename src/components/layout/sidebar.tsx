"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Factory, 
  ClipboardList, 
  BarChart3, 
  Warehouse, 
  LogOut,
  ChevronRight,
  Monitor,
  Building2,
  TrendingUp,
  Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionPayload } from "@/lib/auth";

interface SidebarProps {
  session: SessionPayload | null | any;
}

export default function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [currentUserData, setCurrentUserData] = useState<any>(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUserData(data);
      }
    } catch (err) {
      console.error("Gagal memuat profil di sidebar:", err);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }

    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      localStorage.setItem("theme", "light");
    }

    fetchProfile();
    window.addEventListener("profile-updated", fetchProfile);
    return () => {
      window.removeEventListener("profile-updated", fetchProfile);
    };
  }, []);

  const toggleCollapse = () => {
    const nextValue = !isCollapsed;
    setIsCollapsed(nextValue);
    localStorage.setItem("sidebar-collapsed", String(nextValue));
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };
  
  const userName = currentUserData?.fullName || session?.fullName || "Guest User";
  const userRole = currentUserData?.role || session?.role || "Staff";
  const userInitial = userName.substring(0, 2).toUpperCase();
  const profilePic = currentUserData?.profilePic || null;

  const displayRole = userRole === "admin" 
    ? "Administrator" 
    : userRole === "manager" 
    ? "Manager" 
    : userRole === "assistant_manager" 
    ? "Asisten Manager" 
    : "Staf Lapangan";

  const getPresetClass = (pic: string | null) => {
    if (!pic || !pic.startsWith("preset:")) return "from-emerald-600 to-emerald-800";
    const type = pic.split(":")[1];
    switch (type) {
      case "blue": return "from-blue-600 to-indigo-800";
      case "purple": return "from-purple-600 to-pink-800";
      case "amber": return "from-amber-600 to-orange-800";
      case "rose": return "from-rose-600 to-red-800";
      case "slate": return "from-slate-600 to-slate-800";
      default: return "from-emerald-600 to-emerald-800";
    }
  };

  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    }
  };

  const activeLinkClass = "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100/80 dark:border-emerald-900/30 font-bold shadow-sm";
  const inactiveLinkClass = "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white border border-transparent";

  return (
    <div className={cn(
      "bg-card border-r border-border flex flex-col h-screen sticky top-0 z-50 transition-all duration-300 ease-in-out shrink-0",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Header — Logo Kalla Beton */}
      <div className={cn(
        "p-5 border-b border-border flex items-center transition-all duration-300",
        isCollapsed ? "flex-col justify-center gap-3" : "flex-row justify-between"
      )}>
        <div className="flex items-center gap-3">
          <img src="/logo-kalla.png" alt="Kalla Beton Logo" className="w-9 h-9 object-contain rounded-lg" />
          {!isCollapsed && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-slate-950 dark:text-white font-extrabold text-sm leading-none tracking-tight">Kalla Beton</h1>
              <p className="text-slate-400 dark:text-slate-500 text-[9px] font-bold mt-1">Precast System</p>
            </div>
          )}
        </div>
        <button 
          onClick={toggleCollapse}
          className={cn(
            "p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all border border-border",
            isCollapsed ? "mt-1" : ""
          )}
          title={isCollapsed ? "Tampilkan Sidebar" : "Sembunyikan Sidebar"}
        >
          <ChevronRight className={cn("w-4 h-4 transition-transform duration-300", !isCollapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
        
        {/* SECTION 1: OVERVIEW */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-3 mb-2">
              Overview
            </p>
          )}
          <Link
            href="/"
            title="Dashboard"
            className={cn(
              "flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group",
              isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
              pathname === "/" ? activeLinkClass : inactiveLinkClass,
              (!isCollapsed && pathname !== "/") && "hover:translate-x-1"
            )}
          >
            <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Dashboard</span>}
            </div>
            {(!isCollapsed && pathname === "/") && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />}
          </Link>
          <a
            href="/tv"
            target="_blank"
            title="Mode Layar TV"
            className={cn(
              "flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group",
              isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
              inactiveLinkClass,
              !isCollapsed && "hover:translate-x-1"
            )}
          >
            <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
              <Monitor className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-350" />
              {!isCollapsed && <span>Mode Layar TV</span>}
            </div>
            {!isCollapsed && <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-slate-400" />}
          </a>
        </div>

        {/* SECTION 2: OPERASIONAL */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-3 mb-2">
              Operasional
            </p>
          )}
          <div className="space-y-1">
            {[
              { label: "CRM & Penjualan", href: "/crm", icon: Users },
              { label: "Rencana Produksi", href: "/production", icon: Factory },
              { label: "Monitoring BKH", href: "/monitoring", icon: ClipboardList }
            ].map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group",
                    isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
                    isActive ? activeLinkClass : inactiveLinkClass,
                    (!isCollapsed && !isActive) && "hover:translate-x-1"
                  )}
                >
                  <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                  {(!isCollapsed && isActive) && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />}
                </Link>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: LOGISTIK & GUDANG */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-3 mb-2">
              Logistik & Gudang
            </p>
          )}
          <div className="space-y-1">
            {[
              { label: "Pengadaan & Supplier", href: "/procurement", icon: Building2 },
              { label: "Alokasi Bahan Baku", href: "/alokasi-material", icon: Truck },
              { label: "Gudang Proyek (FG)", href: "/inventory", icon: Package },
              { label: "Gudang Pusat (Raw Mat)", href: "/inventory/master", icon: Warehouse }
            ].map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group",
                    isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
                    isActive ? activeLinkClass : inactiveLinkClass,
                    (!isCollapsed && !isActive) && "hover:translate-x-1"
                  )}
                >
                  <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                  {(!isCollapsed && isActive) && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />}
                </Link>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: KEUANGAN & ADMIN */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-3 mb-2">
              Keuangan & Admin
            </p>
          )}
          <div className="space-y-1">
            <Link
              href="/budgeting"
              title="Kontrol Budget"
              className={cn(
                "flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group",
                isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
                pathname === "/budgeting" ? activeLinkClass : inactiveLinkClass,
                (!isCollapsed && pathname !== "/budgeting") && "hover:translate-x-1"
              )}
            >
              <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                <BarChart3 className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Kontrol Budget</span>}
              </div>
              {(!isCollapsed && pathname === "/budgeting") && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />}
            </Link>

            {(userRole === "admin" || userRole === "manager" || userRole === "assistant_manager") && (
              <Link
                href="/executive"
                title="Laporan Eksekutif"
                className={cn(
                  "flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group",
                  isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
                  pathname === "/executive" ? activeLinkClass : inactiveLinkClass,
                  (!isCollapsed && pathname !== "/executive") && "hover:translate-x-1"
                )}
              >
                <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Laporan Eksekutif</span>}
                </div>
                {(!isCollapsed && pathname === "/executive") && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />}
              </Link>
            )}
            
            {(userRole === "admin" || userRole === "manager" || userRole === "assistant_manager") && (
              <Link
                href="/admin"
                title="Manajemen Akun"
                className={cn(
                  "flex items-center rounded-xl text-xs font-semibold transition-all duration-200 group",
                  isCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
                  pathname === "/admin" ? activeLinkClass : inactiveLinkClass,
                  (!isCollapsed && pathname !== "/admin") && "hover:translate-x-1"
                )}
              >
                <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                  <Users className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Manajemen Akun</span>}
                </div>
                {(!isCollapsed && pathname === "/admin") && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />}
              </Link>
            )}
          </div>
        </div>

      </nav>

      {/* Footer Profile Section */}
      <div className="p-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/20">
        <Link 
          href="/profile"
          className={cn(
            "flex items-center bg-card hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-border hover:border-emerald-300 dark:hover:border-emerald-900 shadow-sm transition-all duration-300 cursor-pointer rounded-2xl w-full",
            isCollapsed ? "justify-center p-1.5" : "gap-3 px-3 py-2",
            pathname === "/profile" && "border-emerald-500 dark:border-emerald-800 bg-emerald-50/10"
          )}
          title="Buka Profil Saya"
        >
          {profilePic ? (
            profilePic.startsWith("data:") ? (
              <img 
                src={profilePic} 
                alt="Profile" 
                className="w-8 h-8 rounded-xl object-cover border border-border shadow-sm shrink-0" 
              />
            ) : (
              <div 
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-inner shrink-0 bg-gradient-to-br",
                  getPresetClass(profilePic)
                )}
                title={`${userName} (${displayRole})`}
              >
                {userInitial}
              </div>
            )
          ) : (
            <div 
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-850 flex items-center justify-center text-white font-bold text-xs shadow-inner shrink-0" 
              title={`${userName} (${displayRole})`}
            >
              {userInitial}
            </div>
          )}
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left animate-in fade-in duration-300">
              <p className="text-xs font-bold text-slate-950 dark:text-white truncate">{userName}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">{displayRole}</p>
            </div>
          )}
        </Link>
        
        <div className={cn("mt-4 flex gap-2", isCollapsed ? "flex-col" : "flex-row")}>
          <button 
            onClick={toggleTheme}
            className={cn(
              "flex items-center justify-center bg-card hover:bg-slate-50 dark:hover:bg-slate-800 border border-border hover:border-emerald-300 dark:hover:border-emerald-900 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer",
              isCollapsed ? "p-2.5 w-full" : "flex-1 py-2 gap-1.5"
            )}
            title={theme === "light" ? "Ganti ke Tema Gelap" : "Ganti ke Tema Terang"}
          >
            <span className="text-xs">{theme === "light" ? "🌙" : "☀️"}</span>
            {!isCollapsed && <span>{theme === "light" ? "Gelap" : "Terang"}</span>}
          </button>

          <button 
            onClick={handleLogout}
            className={cn(
              "flex items-center justify-center text-red-600 dark:text-red-400 bg-card hover:bg-red-50 dark:hover:bg-red-950/20 border border-border hover:border-red-300 dark:hover:border-red-900 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer",
              isCollapsed ? "p-2.5 w-full" : "flex-1 py-2 gap-1.5"
            )}
            title="Keluar Sistem"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Keluar</span>}
          </button>
        </div>
      </div>
    </div>
  );
}