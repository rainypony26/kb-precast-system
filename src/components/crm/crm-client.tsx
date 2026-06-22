"use client";

import { useState, useMemo } from "react";
import type { SessionPayload } from "@/lib/auth";
import { Search, Plus, X, Check, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Project = {
  id: string; 
  projectCode: string | null;
  projectName: string;
  customerName: string;
  picName: string;
  status: string;
  projectValue: string | null;
  tenderDate: Date | string | null;
  estimatedFinish: Date | string | null;
  location: string | null;
  notes: string | null;
  createdAt: Date | string | null;
  updatedAt?: Date | string | null;
};

type User = { id: string; fullName: string };

// ─── CONSTANTS & META ────────────────────────────────────────────────────────

const STATUS_LIST = ["TENDER", "PENAWARAN", "NEGO", "PO", "KONTRAK", "SELESAI", "BATAL"];

const STATUS_META: Record<string, { label: string; textClass: string; bgClass: string; borderClass: string }> = {
  TENDER:     { label: "Tender",     textClass: "text-slate-600 dark:text-slate-400", bgClass: "bg-slate-50 dark:bg-slate-900", borderClass: "border-slate-200 dark:border-slate-800" },
  PENAWARAN: { label: "Penawaran", textClass: "text-blue-700 dark:text-blue-400", bgClass: "bg-blue-50 dark:bg-blue-950/20",  borderClass: "border-blue-100 dark:border-blue-900/30" },
  NEGO:       { label: "Nego",       textClass: "text-amber-755 dark:text-amber-400", bgClass: "bg-amber-50 dark:bg-amber-950/20",   borderClass: "border-amber-100 dark:border-amber-900/30" },
  PO:         { label: "PO",         textClass: "text-purple-700 dark:text-purple-400", bgClass: "bg-purple-50 dark:bg-purple-950/20",  borderClass: "border-purple-100 dark:border-purple-900/30" },
  KONTRAK:    { label: "Kontrak",    textClass: "text-emerald-700 dark:text-emerald-400", bgClass: "bg-emerald-50 dark:bg-emerald-950/20",   borderClass: "border-emerald-100 dark:border-emerald-900/30" },
  SELESAI:    { label: "Selesai",    textClass: "text-teal-700 dark:text-teal-400", bgClass: "bg-teal-50 dark:bg-teal-950/20",  borderClass: "border-teal-100 dark:border-teal-900/30" },
  BATAL:      { label: "Batal",      textClass: "text-red-700 dark:text-red-400", bgClass: "bg-red-50 dark:bg-red-950/20",   borderClass: "border-red-100 dark:border-red-900/30" },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatRp(val: string | null) {
  if (!val) return "-";
  return "Rp " + Number(val).toLocaleString("id-ID");
}

function formatDate(val: Date | string | null) {
  if (!val) return "-";
  return new Date(val).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const EMPTY_FORM = {
  projectName: "", customerName: "", picName: "", status: "TENDER",
  projectValue: "", tenderDate: "", estimatedFinish: "", location: "", notes: "",
};

export default function CrmClient({
  initialProjects, users, session,
}: {
  initialProjects: Project[];
  users: User[];
  session: SessionPayload | null;
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  const stats = useMemo(() => {
    const s: Record<string, number> = {};
    STATUS_LIST.forEach((k) => (s[k] = 0));
    projects.forEach((p) => { if (s[p.status] !== undefined) s[p.status]++; });
    return s;
  }, [projects]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchStatus = filterStatus === "ALL" || p.status === filterStatus;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.projectName.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        p.picName.toLowerCase().includes(q) ||
        (p.projectCode ?? "").toLowerCase().includes(q) ||
        (p.location ?? "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [projects, search, filterStatus]);

  function openAdd() {
    setEditProject(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(p: Project) {
    setEditProject(p);
    setForm({
      projectName: p.projectName,
      customerName: p.customerName,
      picName: p.picName,
      status: p.status,
      projectValue: p.projectValue ?? "",
      tenderDate: p.tenderDate ? new Date(p.tenderDate).toISOString().split("T")[0] : "",
      estimatedFinish: p.estimatedFinish ? new Date(p.estimatedFinish).toISOString().split("T")[0] : "",
      location: p.location ?? "",
      notes: p.notes ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.projectName || !form.customerName || !form.picName) {
      alert("Nama proyek, customer, dan PIC wajib diisi!");
      return;
    }
    
    const payload = {
      ...form,
      projectValue: form.projectValue === "" ? null : form.projectValue,
      tenderDate: form.tenderDate === "" ? null : form.tenderDate,
      estimatedFinish: form.estimatedFinish === "" ? null : form.estimatedFinish,
      location: form.location === "" ? null : form.location,
      notes: form.notes === "" ? null : form.notes,
    };

    setLoading(true);
    try {
      if (editProject) {
        const res = await fetch(`/api/projects/${editProject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { alert("Error: " + (data.error ?? res.status)); return; }
        setProjects((prev) => prev.map((p) => (p.id === data.id ? data : p)));
        alert("Proyek berhasil diperbarui!");
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { alert("Error: " + (data.error ?? res.status)); return; }
        setProjects((prev) => [data, ...prev]);
        alert("Proyek baru berhasil ditambahkan!");
      }
      setShowForm(false);
    } catch (err) {
      alert("Gagal menyimpan: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    setStatusLoading(id);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const updated = await res.json();
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (detailProject?.id === id) setDetailProject(updated);
    } finally {
      setStatusLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin hapus proyek ini?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (detailProject?.id === id) setDetailProject(null);
  }

  return (
    <div className="p-8 min-h-screen text-slate-800 dark:text-slate-100 bg-background font-sans">
      
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">CRM & Pipeline Proyek</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Kelola data tender, negosiasi, dan PO proyek dalam satu alur kerja</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-sm transition-all duration-200 cursor-pointer"
          onClick={openAdd}
        >
          <Plus className="w-4 h-4" />
          Tambah Proyek
        </button>
      </div>

      {/* ─── STATUS SUMMARY CARD PILLS ─── */}
      <div className="flex gap-3 overflow-x-auto pb-3 mb-6 custom-scrollbar shrink-0">
        <div
          className={cn(
            "flex flex-col justify-center min-w-[100px] p-4 rounded-xl cursor-pointer border transition-all shadow-sm",
            filterStatus === "ALL" 
              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50" 
              : "bg-card border-border hover:border-slate-300 dark:hover:border-slate-700"
          )}
          onClick={() => setFilterStatus("ALL")}
        >
          <span className="text-xl font-black text-slate-900 dark:text-white">{projects.length}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase">Semua</span>
        </div>

        {STATUS_LIST.map((s) => {
          const m = STATUS_META[s];
          const isActive = filterStatus === s;
          return (
            <div
              key={s}
              className={cn(
                "flex flex-col justify-center min-w-[100px] p-4 rounded-xl cursor-pointer border transition-all shadow-sm",
                isActive 
                  ? `${m.bgClass} ${m.borderClass}` 
                  : "bg-card border-border hover:border-slate-300 dark:hover:border-slate-700"
              )}
              onClick={() => setFilterStatus(isActive ? "ALL" : s)}
            >
              <span className={cn("text-xl font-black", isActive ? m.textClass : "text-slate-800 dark:text-slate-200")}>
                {stats[s]}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase">{m.label}</span>
            </div>
          );
        })}
      </div>

      {/* ─── SEARCH & FILTER BAR ─── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all text-xs font-semibold"
            placeholder="Cari nama proyek, customer, PIC, atau lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 rounded-xl border border-border bg-card text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-600"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">Semua Status</option>
          {STATUS_LIST.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
      </div>

      {/* ─── DATA TABLE ─── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border text-slate-500 dark:text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-900/20">
                <th className="p-4">Kode</th>
                <th className="p-4">Nama Proyek</th>
                <th className="p-4">Customer / PIC</th>
                <th className="p-4">Lokasi</th>
                <th className="p-4">Nilai Proyek</th>
                <th className="p-4">Mulai</th>
                <th className="p-4">Selesai</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                    {search || filterStatus !== "ALL" ? "Tidak ada proyek yang cocok dengan filter" : "Belum ada proyek terdaftar. Klik + Tambah Proyek"}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const m = STATUS_META[p.status];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="p-4 text-slate-400 dark:text-slate-500 font-semibold font-mono text-[10px]">
                        {p.projectCode || "N/A"}
                      </td>
                      <td className="p-4 font-bold text-slate-800 dark:text-white max-w-[200px] truncate">
                        <button
                          onClick={() => setDetailProject(p)}
                          className="font-bold text-slate-800 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-450 transition-colors bg-transparent border-none p-0 cursor-pointer text-left focus:outline-none"
                        >
                          {p.projectName}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-700 dark:text-slate-300">{p.customerName}</div>
                        <div className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5">PIC: {p.picName}</div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-450 max-w-[120px] truncate">
                        {p.location ?? "-"}
                      </td>
                      <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatRp(p.projectValue)}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-semibold">
                        {formatDate(p.tenderDate)}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-semibold">
                        {formatDate(p.estimatedFinish)}
                      </td>
                      <td className="p-4">
                        {statusLoading === p.id ? (
                          <span className="text-[10px] text-slate-400 font-semibold">Menyimpan...</span>
                        ) : (
                          <select
                            className={cn(
                              "text-[10px] font-bold px-2.5 py-1 rounded-full border focus:outline-none cursor-pointer",
                              m.textClass, m.bgClass, m.borderClass
                            )}
                            value={p.status}
                            onChange={(e) => updateStatus(p.id, e.target.value)}
                          >
                            {STATUS_LIST.map((s) => (
                              <option key={s} value={s} className="bg-card text-slate-800 dark:text-white">
                                {STATUS_META[s].label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button 
                            className="px-2.5 py-1 text-[11px] font-bold border border-border hover:border-emerald-500/50 dark:hover:border-emerald-800 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg bg-card cursor-pointer transition-all"
                            onClick={() => openEdit(p)}
                          >
                            Edit
                          </button>
                          {session?.role === "admin" && (
                            <button 
                              className="px-2.5 py-1 text-[11px] font-bold border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 rounded-lg cursor-pointer transition-all"
                              onClick={() => handleDelete(p.id)}
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info stats */}
        <div className="p-4 border-t border-border color-slate-500 dark:color-slate-400 text-xs flex justify-between items-center bg-slate-55/30 dark:bg-slate-900/5">
          <span>Menampilkan <b>{filtered.length}</b> dari {projects.length} proyek</span>
          {(search || filterStatus !== "ALL") && (
            <button
              onClick={() => { setSearch(""); setFilterStatus("ALL"); }}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline bg-transparent border-none p-0 cursor-pointer"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {/* ===== FORM MODAL (ADD / EDIT) ===== */}
      {showForm && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                {editProject ? "Edit Data Proyek" : "Tambah Proyek Baru"}
              </h2>
              <button 
                onClick={() => setShowForm(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 cursor-pointer border border-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Proyek */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">Nama Proyek *</label>
                <input 
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs font-semibold" 
                  placeholder="Contoh: Proyek Jembatan Tol Makassar"
                  value={form.projectName} 
                  onChange={(e) => setForm({ ...form, projectName: e.target.value })} 
                />
              </div>

              {/* Customer */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">Nama Customer / Perusahaan *</label>
                <input 
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs font-semibold" 
                  placeholder="PT. Adhi Karya (Persero) Tbk"
                  value={form.customerName} 
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })} 
                />
              </div>

              {/* PIC */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">Nama PIC *</label>
                <input 
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs font-semibold" 
                  placeholder="Budi Santoso"
                  value={form.picName} 
                  onChange={(e) => setForm({ ...form, picName: e.target.value })} 
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">Status Pipeline</label>
                <select 
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-emerald-600 text-xs font-semibold cursor-pointer"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {STATUS_LIST.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </select>
              </div>

              {/* Nilai Proyek */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">Nilai Proyek (Rp)</label>
                <input 
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs font-semibold" 
                  type="number" 
                  placeholder="500000000"
                  value={form.projectValue} 
                  onChange={(e) => setForm({ ...form, projectValue: e.target.value })} 
                />
              </div>

              {/* Tanggal Mulai */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">Tanggal Mulai Proyek</label>
                <input 
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-emerald-600 text-xs font-semibold" 
                  type="date"
                  value={form.tenderDate} 
                  onChange={(e) => setForm({ ...form, tenderDate: e.target.value })} 
                />
              </div>

              {/* Estimasi Selesai */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">Estimasi Selesai Proyek</label>
                <input 
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-emerald-600 text-xs font-semibold" 
                  type="date"
                  value={form.estimatedFinish} 
                  onChange={(e) => setForm({ ...form, estimatedFinish: e.target.value })} 
                />
              </div>

              {/* Lokasi */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">Lokasi Proyek</label>
                <input 
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs font-semibold" 
                  placeholder="Makassar, Sulawesi Selatan"
                  value={form.location} 
                  onChange={(e) => setForm({ ...form, location: e.target.value })} 
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">Catatan</label>
                <textarea 
                  className="w-full px-3.5 py-2 rounded-lg border border-border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs font-semibold" 
                  rows={3} 
                  placeholder="Tulis catatan tambahan di sini..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{ resize: "vertical" }} 
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 border-t border-border pt-4">
              <button 
                className="px-4 py-2 border border-border hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-bold cursor-pointer transition-all"
                onClick={() => setShowForm(false)}
              >
                Batal
              </button>
              <button 
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold cursor-pointer transition-all" 
                onClick={handleSubmit} 
                disabled={loading}
              >
                {loading ? "Menyimpan..." : editProject ? "Simpan Perubahan" : "Tambah Proyek"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAIL SIDE PANEL ===== */}
      {detailProject && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 flex items-start justify-end"
          onClick={(e) => e.target === e.currentTarget && setDetailProject(null)}
        >
          <div className="bg-card border-l border-border w-full max-w-md h-screen overflow-y-auto p-6 md:p-8 shadow-2xl animate-in slide-in-from-right duration-350 ease-out-expo flex flex-col justify-between">
            <div className="flex flex-col flex-1">
              
              {/* Header Panel */}
              <div className="flex justify-between items-start mb-6 border-b border-border pb-4">
                <div>
                  <span className="text-[10px] font-semibold font-mono text-slate-400 dark:text-slate-500">{detailProject.projectCode || "Kode N/A"}</span>
                  <h2 className="text-base font-black text-slate-900 dark:text-white mt-1 leading-tight">{detailProject.projectName}</h2>
                </div>
                <button 
                  onClick={() => setDetailProject(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 cursor-pointer border border-transparent shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Pipeline Step Updater */}
              <div className="mb-6">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-3">
                  Perbarui Status Tahapan Proyek:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_LIST.map((s) => {
                    const m = STATUS_META[s];
                    const isActive = detailProject.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(detailProject.id, s)}
                        disabled={statusLoading === detailProject.id}
                        className={cn(
                          "flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                          isActive 
                            ? `${m.bgClass} ${m.borderClass} ${m.textClass}` 
                            : "border-border text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                        )}
                      >
                        {isActive && <Check className="w-3 h-3" />}
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field Info */}
              <div className="space-y-4">
                {[
                  { label: "Nama Customer", value: detailProject.customerName },
                  { label: "Nama PIC", value: detailProject.picName },
                  { label: "Lokasi Konstruksi", value: detailProject.location ?? "-" },
                  { label: "Nilai Proyek / Kontrak", value: formatRp(detailProject.projectValue), isHighlight: true },
                  { label: "Tanggal Mulai Proyek", value: formatDate(detailProject.tenderDate) },
                  { label: "Estimasi Selesai Proyek", value: formatDate(detailProject.estimatedFinish) },
                  { label: "Waktu Input Data", value: formatDate(detailProject.createdAt) },
                ].map(({ label, value, isHighlight }) => (
                  <div key={label} className="border-b border-border pb-3">
                    <div className="text-[10px] text-slate-450 dark:text-slate-500 font-bold mb-1">{label}</div>
                    <div className={cn("text-xs font-semibold", isHighlight ? "text-emerald-600 dark:text-emerald-450 font-black text-sm" : "text-slate-800 dark:text-slate-200")}>
                      {value}
                    </div>
                  </div>
                ))}

                {detailProject.notes && (
                  <div>
                    <div className="text-[10px] text-slate-455 dark:text-slate-500 font-bold mb-2">Catatan Tambahan</div>
                    <div className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-border">
                      {detailProject.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Panel Actions */}
            <div className="flex gap-3 border-t border-border pt-4 mt-6">
              <button 
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-border hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-bold cursor-pointer transition-all" 
                onClick={() => { openEdit(detailProject); setDetailProject(null); }}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Data
              </button>
              {session?.role === "admin" && (
                <button 
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold cursor-pointer transition-all" 
                  onClick={() => handleDelete(detailProject.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}