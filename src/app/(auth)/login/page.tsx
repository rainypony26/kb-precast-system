"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login gagal");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      {/* Left Panel — Solid, Typographic, and Structural Branding (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 bg-[#091710] text-slate-100 relative overflow-hidden border-r border-slate-800">
        
        {/* Subtle branding logo */}
        <div className="flex items-center gap-3 relative z-10">
          <img 
            src="/logo.png" 
            alt="Kalla Beton Logo" 
            className="w-9 h-9 object-contain rounded-lg bg-white p-0.5"
          />
          <span className="text-white font-extrabold tracking-tight text-base">
            Kalla Beton
          </span>
        </div>

        {/* Strategic typographic layout */}
        <div className="relative z-10 max-w-lg my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-800/60 bg-emerald-950/40 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 text-xs font-semibold">
              Divisi Precast System
            </span>
          </div>

          <h1 className="text-4xl font-black text-white leading-tight mb-6 tracking-tight text-wrap-balance">
            Portal Pengendalian Operasi dan Produksi Precast
          </h1>

          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Pantau seluruh alur kerja proyek mulai dari rencana SPK, realisasi kas harian (BKH), QC cetak, pengiriman DO, hingga efisiensi budget HPP dalam satu ekosistem data yang terintegrasi dan andal.
          </p>

          {/* Clean information flow (replacing the generic SaaS-cliché number grid) */}
          <div className="border-t border-slate-800/80 pt-8 space-y-4">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Modul Sistem Utama:</div>
            <ul className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded bg-emerald-500" />
                CRM & Penjualan Proyek
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded bg-emerald-500" />
                Rencana Cetak SPK
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded bg-emerald-500" />
                Realisasi BKH & QC
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded bg-emerald-500" />
                Logistik Finished Goods
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded bg-emerald-500" />
                Mutasi Bahan Baku (Raw Mat)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded bg-emerald-500" />
                Kontrol Budget & RAB
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-slate-500 text-xs">
          © 2026 PT Kalla Beton. Divisi Precast System. All rights reserved.
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-slate-50 dark:bg-slate-900">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 lg:p-10 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          
          {/* Mobile branding */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img 
              src="/logo.png" 
              alt="Kalla Beton Logo" 
              className="w-8 h-8 object-contain rounded-lg"
            />
            <span className="text-slate-900 dark:text-white font-extrabold tracking-tight">Kalla Beton</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
              Selamat Datang
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Masuk dengan akun Anda untuk mengakses dashboard operasional.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                Nama Pengguna (Username)
              </label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda"
                  required
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all text-sm font-semibold"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password Anda"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all text-sm font-semibold"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400 flex-shrink-0" />
                <p className="text-xs font-bold leading-tight">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:bg-emerald-800 disabled:cursor-not-allowed disabled:scale-100 text-white font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Test Accounts Credentials hint */}
          <div className="mt-8 p-4 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20">
            <p className="text-emerald-800 dark:text-emerald-400 text-xs font-bold mb-3">
              Uji Coba dengan Akun Pengguna Default:
            </p>
            <div className="space-y-2">
              {[
                { u: "admin", p: "admin123", r: "Admin" },
                { u: "manager", p: "manager123", r: "Manajer" },
                { u: "staff", p: "staff123", r: "Staf" },
              ].map((u) => (
                <div 
                  key={u.u} 
                  className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 dark:text-slate-500 font-bold text-[10px]">User:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">{u.u}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 dark:text-slate-500 font-bold text-[10px]">Pass:</span>
                    <span className="text-slate-600 dark:text-slate-400 font-mono font-bold">{u.p}</span>
                  </div>
                  <span className="text-slate-400 dark:text-slate-500 font-bold text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {u.r}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
