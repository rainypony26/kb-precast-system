"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, formatDate } from "@/lib/utils";
import { 
  Building2, Users, FileText, Plus, Search, Trash2, Edit, 
  CheckCircle2, Truck, Phone, MapPin, Calendar, DollarSign, 
  AlertCircle, Loader2, X, PlusCircle, ArrowRight, Info
} from "lucide-react";
import type { SessionPayload } from "@/lib/auth";

interface ProcurementProps {
  initialMaterials: any[];
  initialSuppliers: any[];
  initialPos: any[];
  session: SessionPayload | null;
}

export default function ProcurementClient({
  initialMaterials,
  initialSuppliers,
  initialPos,
  session
}: ProcurementProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"SUPPLIER" | "PO" | "NEW_PO">("PO");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Supplier Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    phone: "",
    address: "",
    category: "SEMEN",
  });

  // PO Detail Modal
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [showPoDetailModal, setShowPoDetailModal] = useState(false);

  // New PO Form State
  const [newPoSupplierId, setNewPoSupplierId] = useState("");
  const [newPoNotes, setNewPoNotes] = useState("");
  const [newPoItems, setNewPoItems] = useState<Array<{ materialId: string; qty: string; pricePerUnit: string }>>([
    { materialId: "", qty: "", pricePerUnit: "" }
  ]);

  // ================= FILTERS =================
  const filteredSuppliers = useMemo(() => {
    return initialSuppliers.filter(s => {
      const matchSearch = !searchQuery || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [initialSuppliers, searchQuery]);

  const filteredPos = useMemo(() => {
    return initialPos.filter(po => {
      const matchSearch = !searchQuery || 
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "ALL" || po.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [initialPos, searchQuery, statusFilter]);

  // ================= SUPPLIER ACTIONS =================
  async function handleAddSupplier() {
    if (!supplierForm.name || !supplierForm.phone || !supplierForm.address || !supplierForm.category) {
      return alert("Lengkapi semua field supplier!");
    }
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierForm)
      });
      if (res.ok) {
        alert("Supplier berhasil ditambahkan!");
        setShowAddSupplierModal(false);
        setSupplierForm({ name: "", phone: "", address: "", category: "SEMEN" });
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Gagal: ${err.error}`);
      }
    } catch (e) {
      alert("Error koneksi!");
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSupplier() {
    if (!selectedSupplierId || !supplierForm.name || !supplierForm.phone || !supplierForm.address || !supplierForm.category) {
      return alert("Lengkapi semua field supplier!");
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierForm)
      });
      if (res.ok) {
        alert("Supplier berhasil diperbarui!");
        setShowEditSupplierModal(false);
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Gagal: ${err.error}`);
      }
    } catch (e) {
      alert("Error koneksi!");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSupplier(id: string, name: string) {
    if (!confirm(`Apakah Anda yakin ingin menghapus supplier "${name}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Supplier berhasil dihapus!");
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Gagal: ${err.error}`);
      }
    } catch (e) {
      alert("Error!");
    } finally {
      setLoading(false);
    }
  }

  function openEditSupplier(s: any) {
    setSelectedSupplierId(s.id);
    setSupplierForm({
      name: s.name,
      phone: s.phone,
      address: s.address,
      category: s.category,
    });
    setShowEditSupplierModal(true);
  }

  // ================= PO ACTIONS =================
  function handleAddPoItem() {
    setNewPoItems([...newPoItems, { materialId: "", qty: "", pricePerUnit: "" }]);
  }

  function handleRemovePoItem(index: number) {
    if (newPoItems.length === 1) return;
    setNewPoItems(newPoItems.filter((_, i) => i !== index));
  }

  function handlePoItemChange(index: number, field: string, value: string) {
    const updated = [...newPoItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewPoItems(updated);
  }

  // Hitung total nominal PO baru secara real-time
  const newPoTotal = useMemo(() => {
    return newPoItems.reduce((sum, item) => {
      const q = parseFloat(item.qty) || 0;
      const p = parseFloat(item.pricePerUnit) || 0;
      return sum + (q * p);
    }, 0);
  }, [newPoItems]);

  async function handleCreatePo(e: React.FormEvent) {
    e.preventDefault();
    if (!newPoSupplierId) return alert("Pilih supplier terlebih dahulu!");
    
    // Validasi items
    const invalidItem = newPoItems.some(item => !item.materialId || !item.qty || !item.pricePerUnit);
    if (invalidItem) return alert("Lengkapi material, kuantitas, dan harga satuan untuk semua baris item PO!");

    setLoading(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: newPoSupplierId,
          notes: newPoNotes,
          items: newPoItems,
          status: "PENDING"
        })
      });

      if (res.ok) {
        alert("Purchase Order berhasil diterbitkan!");
        // Reset Form
        setNewPoSupplierId("");
        setNewPoNotes("");
        setNewPoItems([{ materialId: "", qty: "", pricePerUnit: "" }]);
        setActiveTab("PO");
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Gagal: ${err.error}`);
      }
    } catch (e) {
      alert("Error koneksi!");
    } finally {
      setLoading(false);
    }
  }

  async function viewPoDetail(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPo(data);
        setShowPoDetailModal(true);
      } else {
        alert("Gagal memuat detail PO");
      }
    } catch (e) {
      alert("Error!");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyReceipt(id: string) {
    if (!confirm("Konfirmasi penerimaan fisik barang? Ini akan otomatis menambah stok Gudang Pusat dan mencatat data barang masuk.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}/receive`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || "Barang berhasil diverifikasi masuk!");
        setShowPoDetailModal(false);
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Gagal: ${err.error}`);
      }
    } catch (e) {
      alert("Error koneksi!");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePo(id: string, poNumber: string) {
    if (!confirm(`Apakah Anda yakin ingin menghapus PO "${poNumber}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Purchase Order berhasil dihapus!");
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Gagal: ${err.error}`);
      }
    } catch (e) {
      alert("Error!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-2">
              <Building2 className="w-8 h-8" />
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Pengadaan & Supplier</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Manajemen rantai pasok & stok bahan baku fisik</p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-border">
            <button 
              onClick={() => { setActiveTab("PO"); setSearchQuery(""); }} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === "PO" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
            >
              <FileText className="w-4 h-4" /> Purchase orders (PO)
            </button>
            <button 
              onClick={() => { setActiveTab("SUPPLIER"); setSearchQuery(""); }} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === "SUPPLIER" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
            >
              <Users className="w-4 h-4" /> Supplier vendor
            </button>
            <button 
              onClick={() => { setActiveTab("NEW_PO"); }} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === "NEW_PO" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
            >
              <Plus className="w-4 h-4" /> Buat PO baru
            </button>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS FOR TABLES */}
      {activeTab !== "NEW_PO" && (
        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 block">Pencarian</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground outline-none focus:border-emerald-500" 
                placeholder={activeTab === "PO" ? "Ketik nomor PO atau nama supplier..." : "Ketik nama supplier, kategori, alamat..."}
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
          </div>
          {activeTab === "PO" && (
            <div className="w-full md:w-48">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 block">Status Dokumen</label>
              <select 
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-emerald-500"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING">PENDING</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          )}
          {activeTab === "SUPPLIER" && (
            <button 
              onClick={() => setShowAddSupplierModal(true)} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold text-xs h-[38px] flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Tambah supplier
            </button>
          )}
        </div>
      )}

      {/* ================= TAB 1: SUPPLIER LIST ================= */}
      {activeTab === "SUPPLIER" && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-border text-slate-500 dark:text-slate-400 font-bold text-xs">
                <tr>
                  <th className="p-4">Nama Supplier</th>
                  <th className="p-4">Kategori Bahan</th>
                  <th className="p-4">Nomor Telepon</th>
                  <th className="p-4">Alamat</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">Belum ada data supplier yang sesuai pencarian.</td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="p-4 text-foreground font-black text-sm">{s.name}</td>
                      <td className="p-4">
                        <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md text-[10px] font-bold border border-emerald-100 dark:border-emerald-800">
                          {s.category}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-mono"><Phone size={12} className="inline mr-1 text-slate-400" />{s.phone}</td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-normal max-w-xs truncate" title={s.address}><MapPin size={12} className="inline mr-1 text-slate-400" />{s.address}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openEditSupplier(s)} className="p-1.5 hover:bg-slate-100 rounded-lg text-emerald-700 transition-colors" title="Edit Supplier">
                            <Edit size={14} />
                          </button>
                          {session?.role !== "staff" && (
                            <button onClick={() => handleDeleteSupplier(s.id, s.name)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors" title="Hapus Supplier">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: PURCHASE ORDERS ================= */}
      {activeTab === "PO" && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-border text-slate-500 dark:text-slate-400 font-bold text-xs">
                <tr>
                  <th className="p-4">Nomor PO</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Tanggal Order</th>
                  <th className="p-4 text-right">Total Nominal</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                {filteredPos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">Belum ada Purchase Order yang sesuai.</td>
                  </tr>
                ) : (
                  filteredPos.map((po) => {
                    let badgeColor = "bg-slate-100 text-slate-600 border-slate-200";
                    if (po.status === "PENDING") badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                    if (po.status === "SHIPPED") badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                    if (po.status === "COMPLETED") badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    if (po.status === "CANCELLED") badgeColor = "bg-red-50 text-red-700 border-red-200";

                    return (
                      <tr key={po.id} className="hover:bg-slate-50/50">
                        <td className="p-4 text-emerald-700 dark:text-emerald-400 font-black text-sm">{po.poNumber}</td>
                        <td className="p-4 text-foreground">
                          <div>{po.supplierName}</div>
                          <span className="text-[10px] text-slate-400 font-normal">{po.supplierCategory}</span>
                        </td>
                        <td className="p-4 text-slate-500 font-normal"><Calendar size={12} className="inline mr-1 text-slate-400" />{formatDate(po.orderDate)}</td>
                        <td className="p-4 text-right text-foreground font-mono text-sm">Rp {formatNumber(parseFloat(po.totalAmount))}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${badgeColor}`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => viewPoDetail(po.id)} 
                              className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-emerald-200/50 dark:border-emerald-800 transition-colors"
                            >
                              Detail
                            </button>
                            {po.status !== "COMPLETED" && session?.role !== "staff" && (
                              <button 
                                onClick={() => handleDeletePo(po.id, po.poNumber)} 
                                className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors" 
                                title="Hapus PO"
                              >
                                <Trash2 size={14} />
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
        </div>
      )}

      {/* ================= TAB 3: CREATE NEW PO ================= */}
      {activeTab === "NEW_PO" && (
        <form onSubmit={handleCreatePo} className="bg-card rounded-3xl border border-border p-8 shadow-sm space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Rilis purchase order bahan baku</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Buat dokumen PO untuk memesan bahan baku dari supplier rekanan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Pilih supplier vendor *</label>
              <select 
                className="w-full bg-card border border-border p-3 rounded-xl text-foreground font-bold outline-none focus:border-emerald-500"
                value={newPoSupplierId}
                onChange={e => setNewPoSupplierId(e.target.value)}
                required
              >
                <option value="">-- Pilih Supplier --</option>
                {initialSuppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Catatan tambahan (optional)</label>
              <input 
                className="w-full bg-card border border-border p-3 rounded-xl text-foreground outline-none focus:border-emerald-500"
                placeholder="Misal: Dikirim ke Gudang Pusat menggunakan truk..."
                value={newPoNotes}
                onChange={e => setNewPoNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Item bahan baku & harga pemesanan</h3>
              <button 
                type="button" 
                onClick={handleAddPoItem}
                className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold flex items-center gap-1.5 transition-colors"
              >
                <PlusCircle size={14} /> Tambah baris item
              </button>
            </div>

            <div className="space-y-3">
              {newPoItems.map((item, index) => (
                <div key={index} className="flex flex-col md:flex-row items-end gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 relative group animate-in slide-in-from-top-2 duration-200">
                  {/* Select Material */}
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Nama bahan baku *</label>
                    <select
                      className="w-full bg-card border border-border p-2.5 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                      value={item.materialId}
                      onChange={e => handlePoItemChange(index, "materialId", e.target.value)}
                      required
                    >
                      <option value="">-- Pilih Bahan Baku --</option>
                      {initialMaterials.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                      ))}
                    </select>
                  </div>

                  {/* Qty */}
                  <div className="w-full md:w-36">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Jumlah pesan *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      className="w-full bg-card border border-border p-2.5 rounded-xl text-xs font-bold font-mono outline-none focus:border-emerald-500 text-right"
                      value={item.qty}
                      onChange={e => handlePoItemChange(index, "qty", e.target.value)}
                      required
                    />
                  </div>

                  {/* Price per Unit */}
                  <div className="w-full md:w-44">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Harga beli per unit (Rp) *</label>
                    <input
                      type="number"
                      placeholder="Rp 0"
                      className="w-full bg-card border border-border p-2.5 rounded-xl text-xs font-bold font-mono outline-none focus:border-emerald-500 text-right"
                      value={item.pricePerUnit}
                      onChange={e => handlePoItemChange(index, "pricePerUnit", e.target.value)}
                      required
                    />
                  </div>

                  {/* Subtotal Item */}
                  <div className="w-full md:w-48 text-right bg-card p-2.5 rounded-xl border border-border flex flex-col justify-center min-h-[38px]">
                    <div className="text-[8px] text-slate-400 font-semibold">Subtotal</div>
                    <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                      Rp {formatNumber((parseFloat(item.qty) || 0) * (parseFloat(item.pricePerUnit) || 0))}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleRemovePoItem(index)}
                    disabled={newPoItems.length === 1}
                    className="p-2.5 bg-red-50 hover:bg-red-100 rounded-xl text-red-600 transition-colors disabled:opacity-30 disabled:hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Akumulasi total PO:</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">Rp {formatNumber(newPoTotal)}</div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <button 
                type="button"
                onClick={() => setActiveTab("PO")}
                className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 px-6 py-3.5 rounded-xl text-xs font-bold text-slate-600 transition-colors"
              >
                Batalkan
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-xl font-black text-xs flex justify-center items-center gap-2 shadow-sm transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Proses & rilis PO"} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ================= MODAL: ADD SUPPLIER ================= */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-card p-8 rounded-3xl w-full max-w-md border border-border shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowAddSupplierModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-50 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Tambah supplier baru</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Daftarkan supplier penyedia bahan baku operasional.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Nama perusahaan/toko *</label>
                <input 
                  className="w-full bg-card border border-border p-3 rounded-xl text-foreground font-bold outline-none focus:border-emerald-500" 
                  placeholder="Misal: PT Semen Tonasa" 
                  value={supplierForm.name} 
                  onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} 
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Kategori bahan utama *</label>
                <select 
                  className="w-full bg-card border border-border p-3 rounded-xl text-foreground font-bold outline-none focus:border-emerald-500" 
                  value={supplierForm.category} 
                  onChange={e => setSupplierForm({...supplierForm, category: e.target.value})}
                >
                  <option value="SEMEN">SEMEN (PC)</option>
                  <option value="PASIR">PASIR BETON</option>
                  <option value="SPLIT">SPLIT / CHIPPING</option>
                  <option value="BESI">BESI TULANGAN / PLAT</option>
                  <option value="KIMIA">KIMIA / ADDITIVE / SOLAR</option>
                  <option value="LAINNYA">LAINNYA / ALAT PENDUKUNG</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Nomor telepon/HP *</label>
                <input 
                  className="w-full bg-card border border-border p-3 rounded-xl text-foreground font-mono outline-none focus:border-emerald-500" 
                  placeholder="Misal: 081122334455" 
                  value={supplierForm.phone} 
                  onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} 
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Alamat kantor/gudang *</label>
                <textarea 
                  rows={3}
                  className="w-full bg-card border border-border p-3 rounded-xl text-foreground outline-none focus:border-emerald-500 resize-none" 
                  placeholder="Ketik alamat lengkap supplier..." 
                  value={supplierForm.address} 
                  onChange={e => setSupplierForm({...supplierForm, address: e.target.value})} 
                />
              </div>

              <button 
                onClick={handleAddSupplier} 
                disabled={loading} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 p-4 rounded-2xl font-black mt-4 text-white flex justify-center items-center shadow-sm transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan supplier vendor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT SUPPLIER ================= */}
      {showEditSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-card p-8 rounded-3xl w-full max-w-md border border-border shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowEditSupplierModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-50 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Ubah data supplier</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Perbarui detail kontak dan kategori supplier.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Nama perusahaan/toko *</label>
                <input 
                  className="w-full bg-card border border-border p-3 rounded-xl text-foreground font-bold outline-none focus:border-emerald-500" 
                  value={supplierForm.name} 
                  onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} 
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Kategori bahan utama *</label>
                <select 
                  className="w-full bg-card border border-border p-3 rounded-xl text-foreground font-bold outline-none focus:border-emerald-500" 
                  value={supplierForm.category} 
                  onChange={e => setSupplierForm({...supplierForm, category: e.target.value})}
                >
                  <option value="SEMEN">SEMEN (PC)</option>
                  <option value="PASIR">PASIR BETON</option>
                  <option value="SPLIT">SPLIT / CHIPPING</option>
                  <option value="BESI">BESI TULANGAN / PLAT</option>
                  <option value="KIMIA">KIMIA / ADDITIVE / SOLAR</option>
                  <option value="LAINNYA">LAINNYA / ALAT PENDUKUNG</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Nomor telepon/HP *</label>
                <input 
                  className="w-full bg-card border border-border p-3 rounded-xl text-foreground font-mono outline-none focus:border-emerald-500" 
                  value={supplierForm.phone} 
                  onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} 
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Alamat kantor/gudang *</label>
                <textarea 
                  rows={3}
                  className="w-full bg-card border border-border p-3 rounded-xl text-foreground outline-none focus:border-emerald-500 resize-none" 
                  value={supplierForm.address} 
                  onChange={e => setSupplierForm({...supplierForm, address: e.target.value})} 
                />
              </div>

              <button 
                onClick={handleEditSupplier} 
                disabled={loading} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 p-4 rounded-2xl font-black mt-4 text-white flex justify-center items-center shadow-sm transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PO DETAIL & RECEIVE ================= */}
      {showPoDetailModal && selectedPo && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-card rounded-3xl w-full max-w-2xl border border-border shadow-2xl relative flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-t-3xl">
              <div>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 px-2.5 py-0.5 rounded font-bold">
                  Detail purchase order
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-1.5 font-mono">
                  {selectedPo.poNumber}
                </h2>
              </div>
              <button 
                onClick={() => setShowPoDetailModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-1.5">
                  <div className="text-[9px] text-slate-500 dark:text-slate-400">Vendor supplier:</div>
                  <div className="text-foreground font-black text-sm">{selectedPo.supplierName}</div>
                  <div className="text-slate-500 font-normal"><Phone size={10} className="inline mr-1 text-slate-400" />{selectedPo.supplierPhone}</div>
                  <div className="text-slate-500 font-normal"><MapPin size={10} className="inline mr-1 text-slate-400" />{selectedPo.supplierAddress}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[9px] text-slate-500 dark:text-slate-400">Status & pengiriman:</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-400">Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      selectedPo.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" :
                      selectedPo.status === "SHIPPED" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {selectedPo.status}
                    </span>
                  </div>
                  <div className="text-slate-500 font-normal"><Calendar size={10} className="inline mr-1 text-slate-400" />Rilis: {formatDate(selectedPo.orderDate)}</div>
                  {selectedPo.notes && <div className="text-slate-400 font-normal italic mt-1 bg-card p-1.5 rounded border border-border">Catatan: "{selectedPo.notes}"</div>}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Daftar bahan baku pesanan</h3>
                <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-border text-slate-500 dark:text-slate-400 font-bold text-xs">
                      <tr>
                        <th className="p-3">Nama Bahan Baku</th>
                        <th className="p-3 text-right">Kuantitas</th>
                        <th className="p-3 text-right">Harga Unit</th>
                        <th className="p-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                      {selectedPo.items && selectedPo.items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-foreground">{item.materialName}</td>
                          <td className="p-3 text-right font-mono text-slate-600">{formatNumber(parseFloat(item.qty))} {item.materialUnit}</td>
                          <td className="p-3 text-right font-mono text-slate-500">Rp {formatNumber(parseFloat(item.pricePerUnit))}</td>
                          <td className="p-3 text-right font-mono text-foreground">Rp {formatNumber(parseFloat(item.qty) * parseFloat(item.pricePerUnit))}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 dark:bg-slate-900/50 font-black text-sm text-foreground border-t border-border">
                        <td colSpan={3} className="p-3 text-right">Total nominal PO:</td>
                        <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-mono">Rp {formatNumber(parseFloat(selectedPo.totalAmount))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex flex-col md:flex-row gap-3 bg-slate-50/30 rounded-b-3xl">
              <button 
                onClick={() => setShowPoDetailModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-bold text-slate-500 text-xs transition-colors"
              >
                Tutup detail
              </button>
              
              {/* Verifikasi Penerimaan Barang (Only show if status is not completed) */}
              {selectedPo.status !== "COMPLETED" && (
                <button 
                  onClick={() => handleVerifyReceipt(selectedPo.id)}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-xs flex justify-center items-center gap-1.5 shadow-sm transition-all"
                >
                  <Truck size={14} /> Verifikasi barang masuk
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
