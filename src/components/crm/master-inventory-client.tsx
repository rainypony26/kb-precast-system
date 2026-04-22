"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, formatDate } from "@/lib/utils";
import { 
  PackagePlus, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  History, 
  Warehouse,
  Loader2,
  Edit,    // Tambahan Icon
  Trash2   // Tambahan Icon
} from "lucide-react";

interface MasterInventoryProps {
  initialMaterials: any[];
  inboundHistory: any[];
  outboundHistory: any[];
}

export default function MasterInventoryClient({ 
  initialMaterials, 
  inboundHistory, 
  outboundHistory 
}: MasterInventoryProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false); // Modal Edit Baru
  const [showInboundModal, setShowInboundModal] = useState(false);
  const [showOutboundModal, setShowOutboundModal] = useState(false);

  // Form States
  const [materialForm, setMaterialForm] = useState({ name: "", category: "Raw Material", unit: "Kg" });
  const [editingId, setEditingId] = useState<string | null>(null); // State ID yang sedang diedit
  
  const [inboundForm, setInboundForm] = useState({
    materialId: "", vendorName: "", qty: "", entryDate: new Date().toISOString().split("T")[0], notes: ""
  });
  const [outboundForm, setOutboundForm] = useState({
    materialId: "", recipient: "", qty: "", exitDate: new Date().toISOString().split("T")[0], notes: ""
  });

  // 1. Tambah Jenis Material Baru
  async function handleAddMaterial() {
    if (!materialForm.name || !materialForm.unit) return alert("Isi maki' nama dan satuan!");
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(materialForm),
      });
      if (res.ok) {
        alert("Material baru berhasil ditambahkan!");
        setShowAddModal(false);
        setMaterialForm({ name: "", category: "Raw Material", unit: "Kg" });
        router.refresh();
      } else {
        const data = await res.json();
        alert("Gagal: " + data.error);
      }
    } catch (e) { alert("Eror koneksi!"); }
    finally { setLoading(false); }
  }

  // 2. Edit Material (Update Nama/Kategori/Unit)
  async function handleEditMaterial() {
    if (!materialForm.name || !materialForm.unit) return alert("Data tidak boleh kosong!");
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/master/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(materialForm),
      });
      if (res.ok) {
        alert("Material berhasil diperbarui!");
        setShowEditModal(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert("Gagal: " + data.error);
      }
    } catch (e) { alert("Eror koneksi!"); }
    finally { setLoading(false); }
  }

  // 3. Hapus Material
  async function handleDeleteMaterial(id: string, name: string) {
    if (!confirm(`Yakin maki' mau hapus material "${name}"? Data riwayat mungkin akan berpengaruh.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/master/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Material berhasil dihapus!");
        router.refresh();
      } else {
        const data = await res.json();
        alert("Gagal: " + data.error);
      }
    } catch (e) { alert("Eror!"); }
    finally { setLoading(false); }
  }

  // Fungsi Pembantu buat Buka Modal Edit
  function openEditModal(m: any) {
    setEditingId(m.id);
    setMaterialForm({ name: m.name, category: m.category, unit: m.unit });
    setShowEditModal(true);
  }

  // 4. Input Barang Masuk (Inbound)
  async function handleInbound() {
    if (!inboundForm.materialId || !inboundForm.qty) return alert("Lengkapi data barang masuk!");
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inboundForm),
      });
      if (res.ok) {
        alert("Stok berhasil ditambah!");
        setShowInboundModal(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert("Gagal: " + data.error);
      }
    } catch (e) { alert("Eror!"); }
    finally { setLoading(false); }
  }

  // 5. Input Barang Keluar (Outbound)
  async function handleOutbound() {
    if (!outboundForm.materialId || !outboundForm.qty) return alert("Lengkapi data barang keluar!");
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(outboundForm),
      });
      if (res.ok) {
        alert("Stok berhasil dipotong!");
        setShowOutboundModal(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert("Gagal: " + data.error);
      }
    } catch (e) { alert("Eror!"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Warehouse className="w-6 h-6" />
            <h1 className="text-3xl font-black italic tracking-tighter">GUDANG PUSAT</h1>
          </div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Sistem Kontrol Raw Material Kalla Beton</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setMaterialForm({ name: "", category: "Raw Material", unit: "Kg" }); setShowAddModal(true); }} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs border border-slate-700 transition-all">
            <PackagePlus className="w-4 h-4" /> JENIS BARANG
          </button>
          <button onClick={() => setShowInboundModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-900/20 transition-all">
            <ArrowDownCircle className="w-4 h-4" /> BARANG MASUK
          </button>
          <button onClick={() => setShowOutboundModal(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-orange-900/20 transition-all">
            <ArrowUpCircle className="w-4 h-4" /> BARANG KELUAR
          </button>
        </div>
      </div>

      {/* Stock Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {initialMaterials.map((m: any) => (
          <div key={m.id} className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-xl group hover:border-emerald-500/50 transition-all relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] bg-slate-900 text-slate-500 px-2 py-1 rounded font-black uppercase">{m.category}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(m)} className="p-1.5 hover:bg-slate-700 rounded-lg text-blue-400">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDeleteMaterial(m.id, m.name)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-white truncate mb-1">{m.name}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400">{formatNumber(parseFloat(m.stock))}</span>
              <span className="text-slate-500 font-bold text-xs uppercase">{m.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tables Section (History) - Tidak Ada Ubah Sesuai Permintaan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inbound History Table */}
        <div className="bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-black uppercase text-slate-300">Riwayat Barang Masuk</h2>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/30 text-slate-500 uppercase font-bold border-b border-slate-800">
              <tr>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Item</th>
                <th className="p-4">Vendor</th>
                <th className="p-4 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {inboundHistory.map((h: any) => (
                <tr key={h.id} className="hover:bg-slate-800/30">
                  <td className="p-4 text-slate-400">{formatDate(h.date)}</td>
                  <td className="p-4 font-bold text-white">{h.materialName}</td>
                  <td className="p-4 text-slate-400 italic">{h.vendor}</td>
                  <td className="p-4 text-right font-mono text-blue-400">+{formatNumber(h.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Outbound History Table */}
        <div className="bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-black uppercase text-slate-300">Riwayat Barang Keluar</h2>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/30 text-slate-500 uppercase font-bold border-b border-slate-800">
              <tr>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Item</th>
                <th className="p-4">Penerima</th>
                <th className="p-4 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {outboundHistory.map((h: any) => (
                <tr key={h.id} className="hover:bg-slate-800/30">
                  <td className="p-4 text-slate-400">{formatDate(h.date)}</td>
                  <td className="p-4 font-bold text-white">{h.materialName}</td>
                  <td className="p-4 text-slate-400 italic">{h.recipient}</td>
                  <td className="p-4 text-right font-mono text-orange-400">-{formatNumber(h.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Modal: Tambah Jenis Material */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-[#1e293b] p-8 rounded-3xl w-full max-w-md border border-slate-700 shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-1 italic">DAFTARKAN MATERIAL</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">Tambah Master Data Barang</p>
            <div className="space-y-4">
              <input className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-emerald-500 transition-all" placeholder="Nama Barang (Contoh: Semen)" value={materialForm.name} onChange={e => setMaterialForm({...materialForm, name: e.target.value})} />
              <select className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white" value={materialForm.category} onChange={e => setMaterialForm({...materialForm, category: e.target.value})}>
                <option value="Raw Material">Raw Material</option>
                <option value="Additive">Additive</option>
                <option value="BBM">BBM / Solar</option>
                <option value="Sparepart">Sparepart</option>
              </select>
              <input className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white" placeholder="Satuan (Kg, Batang, Zak)" value={materialForm.unit} onChange={e => setMaterialForm({...materialForm, unit: e.target.value})} />
              <button onClick={handleAddMaterial} disabled={loading} className="w-full bg-emerald-600 p-4 rounded-2xl font-black mt-4 hover:bg-emerald-500 transition-all text-white flex justify-center">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "SIMPAN MASTER BARANG"}
              </button>
              <button onClick={() => setShowAddModal(false)} className="w-full text-slate-500 font-bold text-xs">BATALKAN</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: EDIT Jenis Material (Baru) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-[#1e293b] p-8 rounded-3xl w-full max-w-md border border-slate-700 shadow-2xl">
            <h2 className="text-2xl font-black text-blue-400 mb-1 italic">EDIT MATERIAL</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">Ubah Master Data Barang</p>
            <div className="space-y-4">
              <input className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-blue-500 transition-all" value={materialForm.name} onChange={e => setMaterialForm({...materialForm, name: e.target.value})} />
              <select className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white" value={materialForm.category} onChange={e => setMaterialForm({...materialForm, category: e.target.value})}>
                <option value="Raw Material">Raw Material</option>
                <option value="Additive">Additive</option>
                <option value="BBM">BBM / Solar</option>
                <option value="Sparepart">Sparepart</option>
              </select>
              <input className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white" value={materialForm.unit} onChange={e => setMaterialForm({...materialForm, unit: e.target.value})} />
              <button onClick={handleEditMaterial} disabled={loading} className="w-full bg-blue-600 p-4 rounded-2xl font-black mt-4 hover:bg-blue-500 transition-all text-white flex justify-center">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "SIMPAN PERUBAHAN"}
              </button>
              <button onClick={() => setShowEditModal(false)} className="w-full text-slate-500 font-bold text-xs">BATALKAN</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inbound & Outbound Sesuai Kode Kamu (Tidak Berubah) */}
      {showInboundModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-[#1e293b] p-8 rounded-3xl w-full max-w-md border border-slate-700 shadow-2xl">
            <h2 className="text-2xl font-black text-blue-500 mb-1 italic">INPUT BARANG MASUK</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">Penerimaan dari Vendor/Suplier</p>
            <div className="space-y-4">
              <select className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white" onChange={e => setInboundForm({...inboundForm, materialId: e.target.value})}>
                <option value="">-- Pilih Material --</option>
                {initialMaterials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white" placeholder="Nama Vendor / Suplier" onChange={e => setInboundForm({...inboundForm, vendorName: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white" placeholder="Jumlah" onChange={e => setInboundForm({...inboundForm, qty: e.target.value})} />
                <input type="date" className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white" value={inboundForm.entryDate} onChange={e => setInboundForm({...inboundForm, entryDate: e.target.value})} />
              </div>
              <textarea className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white h-20" placeholder="Keterangan / No. Surat Jalan" onChange={e => setInboundForm({...inboundForm, notes: e.target.value})}></textarea>
              <button onClick={handleInbound} disabled={loading} className="w-full bg-blue-600 p-4 rounded-2xl font-black mt-4 hover:bg-blue-500 text-white flex justify-center">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "TAMBAH STOK SEKARANG"}
              </button>
              <button onClick={() => setShowInboundModal(false)} className="w-full text-slate-500 font-bold text-xs">BATALKAN</button>
            </div>
          </div>
        </div>
      )}

      {showOutboundModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-[#1e293b] p-8 rounded-3xl w-full max-w-md border border-slate-700 shadow-2xl">
            <h2 className="text-2xl font-black text-orange-500 mb-1 italic">CATAT BARANG KELUAR</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">Penggunaan Material Lapangan</p>
            <div className="space-y-4">
              <select className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white" onChange={e => setOutboundForm({...outboundForm, materialId: e.target.value})}>
                <option value="">-- Pilih Material --</option>
                {initialMaterials.map((m: any) => <option key={m.id} value={m.id}>{m.name} (Stok: {formatNumber(parseFloat(m.stock))})</option>)}
              </select>
              <input className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white" placeholder="Tujuan / Penerima" onChange={e => setOutboundForm({...outboundForm, recipient: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white" placeholder="Jumlah" onChange={e => setOutboundForm({...outboundForm, qty: e.target.value})} />
                <input type="date" className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white" value={outboundForm.exitDate} onChange={e => setOutboundForm({...outboundForm, exitDate: e.target.value})} />
              </div>
              <textarea className="w-full bg-[#0f172a] border border-slate-700 p-3 rounded-xl text-white h-20" placeholder="Keterangan Pemakaian" onChange={e => setOutboundForm({...outboundForm, notes: e.target.value})}></textarea>
              <button onClick={handleOutbound} disabled={loading} className="w-full bg-orange-600 p-4 rounded-2xl font-black mt-4 hover:bg-orange-500 text-white flex justify-center">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "POTONG STOK SEKARANG"}
              </button>
              <button onClick={() => setShowOutboundModal(false)} className="w-full text-slate-500 font-bold text-xs">BATALKAN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}