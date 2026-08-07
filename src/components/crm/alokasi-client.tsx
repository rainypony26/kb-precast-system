"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, formatRupiah, formatDate } from "@/lib/utils";
import { Truck, Plus, Trash2, Loader2, Package, ArrowDownToLine } from "lucide-react";
import type { SessionPayload } from "@/lib/auth";

interface AllocationRow {
  materialId: string;
  qty: string;
  unitPrice: string;
}

interface AlokasiClientProps {
  initialMaterials: any[];
  initialProjects: any[];
  initialHistory: any[];
  session: SessionPayload | null;
}

export default function AlokasiClient({ initialMaterials, initialProjects, initialHistory, session }: AlokasiClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [rows, setRows] = useState<AllocationRow[]>([{ materialId: "", qty: "", unitPrice: "" }]);
  const [notes, setNotes] = useState("");

  // ── Row helpers ──
  const addRow = () => setRows([...rows, { materialId: "", qty: "", unitPrice: "" }]);
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: keyof AllocationRow, value: string) => {
    const next = [...rows];
    next[idx] = { ...next[idx], [field]: value };
    setRows(next);
  };

  // ── Grand total ──
  const grandTotal = rows.reduce((sum, r) => {
    const q = parseFloat(r.qty) || 0;
    const p = parseFloat(r.unitPrice) || 0;
    return sum + q * p;
  }, 0);

  // ── Submit ──
  async function handleSubmit() {
    if (!selectedProjectId) return alert("Pilih proyek terlebih dahulu!");
    const validRows = rows.filter(r => r.materialId && r.qty && r.unitPrice);
    if (validRows.length === 0) return alert("Tambahkan minimal 1 material dengan qty dan harga!");

    // Validasi nilai positif
    for (const r of validRows) {
      if (Number(r.qty) <= 0) {
        return alert("Kuantitas material alokasi harus lebih besar dari 0!");
      }
      if (Number(r.unitPrice) < 0) {
        return alert("Harga satuan material alokasi tidak boleh bernilai negatif!");
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/alokasi-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId, items: validRows, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal alokasi!");
      if (data.bomUpdated) {
        alert("✅ Alokasi material berhasil! Material juga otomatis masuk ke BOM RAB proyek.");
      } else {
        alert("Alokasi material berhasil! (Belum ada RAB Approved untuk proyek ini — material akan masuk BOM setelah RAB disetujui)");
      }
      // Reset form
      setRows([{ materialId: "", qty: "", unitPrice: "" }]);
      setSelectedProjectId("");
      setNotes("");
      router.refresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Delete history ──
  async function handleDelete(id: string) {
    if (!confirm("Hapus alokasi ini? Stok material akan dikembalikan ke Gudang Pusat.")) return;
    try {
      const res = await fetch(`/api/alokasi-material/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus!");
      alert("Alokasi dihapus & stok dikembalikan!");
      router.refresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center justify-center">
          <Truck className="w-6 h-6 text-emerald-700 dark:text-emerald-450" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Alokasi Material ke Proyek</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Transfer bahan baku dari Gudang Pusat ke proyek — harga diinput manual. Material otomatis masuk ke BOM RAB proyek.</p>
        </div>
      </div>

      {/* ── FORM CARD ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-8">
        <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 mb-5">Form alokasi baru</h2>

        {/* Project selector */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-450 block mb-1.5">Proyek tujuan *</label>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-border rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
          >
            <option value="">— Pilih proyek —</option>
            {initialProjects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.projectCode || "—"} — {p.projectName} ({p.contractNumber})
              </option>
            ))}
          </select>
        </div>

        {/* Material rows */}
        <div className="space-y-3 mb-5">
          <div className="grid grid-cols-12 gap-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1">
            <div className="col-span-4">Material</div>
            <div className="col-span-2">Kuantitas</div>
            <div className="col-span-3">Harga satuan (Rp)</div>
            <div className="col-span-2 text-right">Subtotal</div>
            <div className="col-span-1" />
          </div>

          {rows.map((row, idx) => {
            const mat = initialMaterials.find((m: any) => m.id === row.materialId);
            const subtotal = (parseFloat(row.qty) || 0) * (parseFloat(row.unitPrice) || 0);
            return (
              <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-slate-50/30 dark:bg-slate-900/30 p-3 rounded-xl border border-border">
                {/* Material dropdown */}
                <select
                  value={row.materialId}
                  onChange={e => updateRow(idx, "materialId", e.target.value)}
                  className="col-span-4 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-border rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">— Pilih material —</option>
                  {initialMaterials.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit} — stok: {parseFloat(m.stock || 0).toFixed(1)})
                    </option>
                  ))}
                </select>

                {/* Qty input */}
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  placeholder="0"
                  value={row.qty}
                  onChange={e => updateRow(idx, "qty", e.target.value)}
                  className="col-span-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-border rounded-lg px-3 py-2 text-xs font-mono text-center outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />

                {/* Unit price input (MANUAL) */}
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={row.unitPrice}
                  onChange={e => updateRow(idx, "unitPrice", e.target.value)}
                  className="col-span-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-border rounded-lg px-3 py-2 text-xs font-mono text-right outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />

                {/* Subtotal */}
                <div className="col-span-2 text-right text-xs font-black text-slate-800 dark:text-slate-200">
                  {formatRupiah(subtotal)}
                </div>

                {/* Remove button */}
                <div className="col-span-1 flex justify-center">
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(idx)} className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add row + grand total */}
        <div className="flex justify-between items-center pt-3 border-t border-border">
          <button onClick={addRow} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-xl transition-all border border-emerald-600 dark:border-emerald-700 bg-card">
            <Plus size={14} /> Tambah baris material
          </button>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">Total alokasi</span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-450">{formatRupiah(grandTotal)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-450 block mb-1.5">Catatan (opsional)</label>
          <input
            type="text"
            placeholder="Mis: Material tambahan untuk pondasi area B"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white border border-border rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</> : <><ArrowDownToLine size={16} /> Alokasikan Material</>}
        </button>
      </div>

      {/* ── HISTORY TABLE ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-sm font-black text-slate-400 dark:text-slate-500">Riwayat alokasi material</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 font-bold border-b border-border">
                <th className="p-4">Tanggal</th>
                <th className="p-4">Proyek</th>
                <th className="p-4">Material</th>
                <th className="p-4 text-right">Qty</th>
                <th className="p-4 text-right">Harga satuan</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4">Catatan</th>
                {session?.role === "admin" && <th className="p-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialHistory.length === 0 ? (
                <tr>
                  <td colSpan={session?.role === "admin" ? 8 : 7} className="p-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                      <p className="italic text-xs">Belum ada riwayat alokasi material ke proyek.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                initialHistory.map((h: any) => {
                  const qty = parseFloat(h.qty) || 0;
                  const price = parseFloat(h.unitPrice) || 0;
                  return (
                    <tr key={h.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 text-slate-400 dark:text-slate-500 font-semibold text-xs">{formatDate(h.exitDate)}</td>
                      <td className="p-4 font-black text-slate-800 dark:text-slate-200 text-xs">{h.projectName || "—"}</td>
                      <td className="p-4">
                        <span className="font-bold text-slate-750 dark:text-slate-300">{h.materialName || "—"}</span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{qty} {h.unit}</td>
                      <td className="p-4 text-right font-mono text-xs text-slate-550 dark:text-slate-400">{formatRupiah(price)}</td>
                      <td className="p-4 text-right font-black text-emerald-700 dark:text-emerald-450">{formatRupiah(qty * price)}</td>
                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400 max-w-[150px] truncate">{h.notes || "—"}</td>
                      {session?.role === "admin" && (
                        <td className="p-4 text-center">
                          <button onClick={() => handleDelete(h.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs font-semibold">
                            Hapus
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
