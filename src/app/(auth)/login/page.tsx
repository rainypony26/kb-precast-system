"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-[#0d1a12] border-r border-[#1a3a22]">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#16a34a] flex items-center justify-center">
            <span className="text-white font-bold text-sm">KB</span>
          </div>
          <span className="text-white font-semibold tracking-tight">
            KB Precast System
          </span>
        </div>

        {/* Center content */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#16a34a]/30 bg-[#16a34a]/10 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="text-[#4ade80] text-xs font-medium tracking-wide">
              Kalla Beton Divisi Precast
            </span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Sistem Operasi
            <br />
            <span className="text-[#4ade80]">Produksi Precast</span>
          </h1>

          <p className="text-[#6b7280] text-lg leading-relaxed max-w-md">
            Pantau proyek, produksi, anggaran, dan pengadaan material dalam
            satu platform terintegrasi.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-12">
            {[
              { label: "Modul Aktif", value: "5" },
              { label: "Tabel Database", value: "12" },
              { label: "Real-time", value: "✓" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-white mb-1">
                  {s.value}
                </div>
                <div className="text-[#6b7280] text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-[#374151] text-sm">
          © 2026 Kalla Beton — Internal System
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-[#16a34a] flex items-center justify-center">
              <span className="text-white font-bold text-xs">KB</span>
            </div>
            <span className="text-white font-semibold">KB Precast System</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              Selamat datang
            </h2>
            <p className="text-[#6b7280]">
              Masuk untuk mengakses dashboard operasional
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-[#1f2937] text-white placeholder-[#4b5563] focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-[#1f2937] text-white placeholder-[#4b5563] focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#16a34a] hover:bg-[#15803d] disabled:bg-[#166534] disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          {/* Hint */}
          <div className="mt-8 p-4 rounded-xl bg-[#0d1a12] border border-[#1a3a22]">
            <p className="text-[#4b5563] text-xs mb-2 font-medium">
              Default login (ubah setelah masuk):
            </p>
            <div className="space-y-1">
              {[
                { u: "admin", p: "admin123", r: "Administrator" },
                { u: "manager", p: "manager123", r: "Manager" },
                { u: "staff", p: "staff123", r: "Staff" },
              ].map((u) => (
                <div key={u.u} className="flex items-center gap-2 text-xs">
                  <span className="text-[#16a34a] font-mono w-16">{u.u}</span>
                  <span className="text-[#374151]">/</span>
                  <span className="text-[#6b7280] font-mono">{u.p}</span>
                  <span className="text-[#374151] ml-auto">{u.r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
