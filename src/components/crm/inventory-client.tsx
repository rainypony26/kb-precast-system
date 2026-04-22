"use client";

import { useState } from "react";
import { formatNumber, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function InventoryClient({ initialLogs, bomItems }: any) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    bomId: "",
    transactionType: "OUT",
    qty: "",
    transactionDate: new Date().toISOString().split("T")[0],
    notes: ""
  });

  async function handleSave() {
    // 1. Validasi awal di client
    if (!form.bomId || !form.qty) {
      alert("Pilih material sama isi jumlahnya dulu, bosku!");
      return;
    }

    setLoading(true);
    try {
      // 2. Cari data BOM. Ingat: id itu UUID (string), jadi jangan pakai parseInt!
      const selectedBom = bomItems.find((b: any) => b.id === form.bomId);

      if (!selectedBom) {
        alert("Material tidak ditemukan di daftar BOM!");
        setLoading(false);
        return;
      }

      // 3. Kirim data
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          qty: parseFloat(form.qty),
          planId: selectedBom.planId, // Ambil planId dari hasil find
          unit: selectedBom.unit,
        }),
      });

      if (res.ok) {
        alert("Mantap! Data masuk mi.");
        setShowModal(false);
        router.refresh();
      } else {
        const errorData = await res.json();
        alert(`Gagal ki simpan: ${errorData.error}`);
      }
    } catch (error) {
      alert("Ada masalah koneksi ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 bg-[#0f172a] min-h-screen text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Gudang</h1>
          <p className="text-slate-400 text-sm">Update stok material Kalla Beton</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-emerald-600 px-4 py-2 rounded-lg font-bold">
          + Catat Transaksi
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-[#1e293b] rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#162032] text-slate-400 border-b border-slate-800 font-bold">
            <tr>
              <th className="p-4">Tanggal</th>
              <th className="p-4">Material</th>
              <th className="p-4">Tipe</th>
              <th className="p-4">Jumlah</th>
              <th className="p-4">No. SPK</th>
              <th className="p-4">Proyek</th>
            </tr>
          </thead>
          <tbody>
            {initialLogs.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">Belum ada data transaksi.</td></tr>
            ) : (
              initialLogs.map((log: any) => (
                <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="p-4">{formatDate(log.transactionDate)}</td>
                  <td className="p-4 font-semibold text-emerald-400">{log.materialName}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${log.transactionType === 'IN' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {log.transactionType}
                    </span>
                  </td>
                  <td className="p-4">{formatNumber(log.qty)} {log.unit}</td>
                  <td className="p-4 text-slate-400">{log.spkNumber || "-"}</td>
                  <td className="p-4 text-slate-400">{log.projectName || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e293b] p-6 rounded-2xl w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-bold mb-4">Catat Arus Barang</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Material (BOM SPK)</label>
                <select 
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 text-sm"
                  value={form.bomId}
                  onChange={(e) => setForm({...form, bomId: e.target.value})}
                >
                  <option value="">-- Pilih Material --</option>
                  {bomItems.map((item: any) => (
                    <option key={item.id} value={item.id}>[{item.spkNumber}] {item.materialName}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Jenis Transaksi</label>
                  <select 
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 text-sm"
                    value={form.transactionType}
                    onChange={(e) => setForm({...form, transactionType: e.target.value})}
                  >
                    <option value="OUT">Keluar (Produksi)</option>
                    <option value="IN">Masuk (Suplai)</option>
                    <option value="RETURN">Retur / Sisa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Jumlah</label>
                  <input 
                    type="number" 
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 text-sm" 
                    value={form.qty}
                    onChange={(e) => setForm({...form, qty: e.target.value})}
                  />
                </div>
              </div>
              <button onClick={handleSave} disabled={loading} className="w-full bg-emerald-600 p-2 rounded-lg font-bold mt-4">
                {loading ? "Menyimpan..." : "Simpan Sekarang"}
              </button>
              <button onClick={() => setShowModal(false)} className="w-full text-slate-500 text-sm">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}