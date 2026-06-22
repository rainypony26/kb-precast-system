"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Users, PlusCircle, UserCheck, UserX, Key, Trash2, Edit3, 
  CheckCircle, AlertCircle, ShieldAlert, Calendar
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type DbUser = {
  id: string;
  username: string;
  fullName: string;
  role: "admin" | "manager" | "staff" | "assistant_manager";
  isActive: boolean;
  profilePic: string | null;
  createdAt: string;
};

export default function AdminClient({ session }: { session: any }) {
  const [usersList, setUsersList] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Modals & Forms State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DbUser | null>(null);

  const [addForm, setAddForm] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "staff"
  });

  const [editForm, setEditForm] = useState({
    fullName: "",
    role: "staff",
    password: "" // Optional for password reset
  });

  const timerRef = useRef<any>(null);

  const notify = (type: 'err' | 'succ', msg: string) => {
    if (type === 'err') setErrorMsg(msg); else setSuccessMsg(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setErrorMsg(""); setSuccessMsg(""); }, 3000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Gagal mengambil data pengguna.");
      const data = await res.json();
      setUsersList(data);
    } catch (err: any) {
      notify('err', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    if (!addForm.username || !addForm.password || !addForm.fullName) {
      return notify('err', "Semua kolom input wajib diisi!");
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat akun.");
      }

      notify('succ', `Akun @${data.username} berhasil didaftarkan!`);
      setShowAddModal(false);
      setAddForm({ username: "", password: "", fullName: "", role: "staff" });
      fetchUsers();
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    if (!editForm.fullName) {
      return notify('err', "Nama lengkap wajib diisi!");
    }

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editForm.fullName,
          role: editForm.role,
          password: editForm.password || undefined // Only reset if entered
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui data.");
      }

      notify('succ', "Detail pengguna berhasil diperbarui!");
      setShowEditModal(false);
      setSelectedUser(null);
      setEditForm({ fullName: "", role: "staff", password: "" });
      fetchUsers();
      
      // Dispatch event to sync sidebar name if edited self
      if (selectedUser.id === session.userId) {
        window.dispatchEvent(new Event("profile-updated"));
      }
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const toggleUserStatus = async (user: DbUser) => {
    const nextStatus = !user.isActive;
    const confirmMsg = nextStatus 
      ? `Aktifkan kembali akses akun @${user.username}?` 
      : `Bekukan (Suspend) akses akun @${user.username}? Pengguna ini tidak akan bisa login ke web.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui status.");
      }

      notify('succ', `Akun @${user.username} berhasil ${nextStatus ? "Diaktifkan" : "Ditangguhkan"}!`);
      fetchUsers();
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleDeleteUser = async (user: DbUser) => {
    if (!confirm(`Hapus akun @${user.username} secara permanen? Tindakan ini tidak dapat dibatalkan.`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE"
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus.");
      }

      notify('succ', "Akun berhasil dihapus secara permanen!");
      fetchUsers();
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return { text: "Admin", color: "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" };
      case "manager": return { text: "Manager", color: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" };
      case "assistant_manager": return { text: "Asisten Manager", color: "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20" };
      default: return { text: "Staff Lapangan", color: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20" };
    }
  };

  const getPresetClass = (pic: string | null) => {
    if (!pic || !pic.startsWith("preset:")) return "from-emerald-500 to-emerald-700";
    const type = pic.split(":")[1];
    switch (type) {
      case "blue": return "from-blue-500 to-indigo-700";
      case "purple": return "from-purple-500 to-pink-700";
      case "amber": return "from-amber-500 to-orange-700";
      case "rose": return "from-rose-500 to-red-700";
      case "slate": return "from-slate-600 to-slate-800";
      default: return "from-emerald-500 to-emerald-700";
    }
  };

  return (
    <div className="min-h-screen bg-background p-8 text-slate-800 dark:text-slate-100 font-sans">
      
      {/* Toast Notifications */}
      {errorMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 px-6 py-3.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold font-mono">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-6 py-3.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold font-mono">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="text-emerald-600" size={28} /> Manajemen Akun Pengguna
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Kelola data login karyawan, otoritas peran, dan status aktifasi pengguna</p>
        </div>
        <div>
          <button 
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            onClick={() => setShowAddModal(true)}
          >
            <PlusCircle size={16} /> Tambah Akun Baru
          </button>
        </div>
      </div>

      {/* Advisory Alert */}
      <div className="bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-5 mb-8 flex gap-4 items-center">
        <div className="p-3 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
          <ShieldAlert size={20} />
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-900 dark:text-white">Kebijakan Akuntabilitas Akun (Audit)</h3>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">
            Demi menjaga integritas log historis laporan kas dan produksi precast, disarankan untuk <b>menonaktifkan (Suspend)</b> akun karyawan yang resign daripada menghapusnya secara permanen. Menghapus akun diperbolehkan hanya jika akun tersebut belum mencatat transaksi di sistem.
          </p>
        </div>
      </div>

      {/* Users List Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : usersList.length === 0 ? (
          <div className="py-20 text-center text-slate-400 italic">Belum ada akun pengguna terdaftar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-border text-slate-500 dark:text-slate-400 font-bold text-xs">
                  <th className="p-4">Pengguna</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Otoritas Peran</th>
                  <th className="p-4">Tanggal Daftar</th>
                  <th className="p-4">Status Akun</th>
                  <th className="p-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                {usersList.map(u => {
                  const roleLabel = getRoleLabel(u.role);
                  const userInitial = u.fullName.substring(0, 2).toUpperCase();
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        {u.profilePic ? (
                          u.profilePic.startsWith("data:") ? (
                            <img src={u.profilePic} alt="Profile" className="w-8 h-8 rounded-lg object-cover border border-border" />
                          ) : (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px] bg-gradient-to-br ${getPresetClass(u.profilePic)}`}>
                              {userInitial}
                            </div>
                          )
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-[10px]">
                            {userInitial}
                          </div>
                        )}
                        <div>
                          <span className="text-slate-800 dark:text-slate-100 font-black block">{u.fullName}</span>
                          {u.id === session.userId && (
                            <span className="text-[9px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-black mt-0.5 inline-block">
                              Akun Anda
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-400">@{u.username}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black border ${roleLabel.color}`}>
                          {roleLabel.text}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-normal flex items-center gap-1.5 pt-6">
                        <Calendar size={13} className="text-slate-400 dark:text-slate-500" />
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${u.isActive ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/20"}`}>
                          {u.isActive ? "● Aktif" : "● Ditangguhkan"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button 
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
                            title="Edit Akun"
                            onClick={() => {
                              setSelectedUser(u);
                              setEditForm({ fullName: u.fullName, role: u.role, password: "" });
                              setShowEditModal(true);
                            }}
                          >
                            <Edit3 size={14} />
                          </button>
                          
                          {u.id !== session.userId && (
                            <>
                              <button 
                                className={`p-1.5 border rounded-lg transition-all ${u.isActive ? "hover:bg-red-50 border-red-100 text-red-600 hover:border-red-300" : "hover:bg-emerald-50 border-emerald-100 text-emerald-600 hover:border-emerald-300"}`}
                                title={u.isActive ? "Suspend Akun (Bekukan)" : "Aktifkan Akun"}
                                onClick={() => toggleUserStatus(u)}
                              >
                                {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                              </button>

                              <button 
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-500/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                                title="Hapus Permanen"
                                onClick={() => handleDeleteUser(u)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== MODAL: TAMBAH USER BARU ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl w-full max-w-md p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 text-center flex justify-center items-center gap-1.5">
              <PlusCircle className="text-emerald-600" /> Registrasi Akun Karyawan Baru
            </h2>
            
            <div className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Nama Lengkap Karyawan *</label>
                <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl outline-none focus:border-emerald-500 text-foreground"
                  placeholder="Misal: Andi Saputra" value={addForm.fullName} onChange={e => setAddForm({...addForm, fullName: e.target.value})} />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Username Login *</label>
                <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-mono text-foreground"
                  placeholder="Misal: andisaputra" value={addForm.username} onChange={e => setAddForm({...addForm, username: e.target.value})} />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal block mt-1">Username hanya huruf kecil tanpa spasi.</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Password Awal *</label>
                <input type="password" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-mono text-foreground"
                  placeholder="••••••••" value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Otoritas Peran (Jabatan) *</label>
                <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-bold text-foreground"
                  value={addForm.role} onChange={e => setAddForm({...addForm, role: e.target.value})}>
                  <option value="staff">Staff Lapangan (BKH & Gudang)</option>
                  <option value="assistant_manager">Asisten Manager</option>
                  <option value="manager">Manager (Approval & Budgeting)</option>
                  <option value="admin">Administrator (Akses Penuh)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl font-bold" onClick={() => setShowAddModal(false)}>
                  Batal
                </button>
                <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold min-w-[100px]"
                  onClick={handleAddUser}>
                  Daftarkan Akun
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: EDIT USER DETAILS / RESET PASSWORD ===== */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl w-full max-w-md p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 text-center flex justify-center items-center gap-1.5">
              <Edit3 className="text-blue-600" size={20} /> Modifikasi Data Akun (@{selectedUser.username})
            </h2>
            
            <div className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Nama Lengkap Karyawan *</label>
                <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl outline-none focus:border-emerald-500 text-foreground"
                  value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Otoritas Peran (Jabatan) *</label>
                <select className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-bold text-foreground"
                  value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}
                  disabled={selectedUser.id === session.userId}
                >
                  <option value="staff">Staff Lapangan (BKH & Gudang)</option>
                  <option value="assistant_manager">Asisten Manager</option>
                  <option value="manager">Manager (Approval & Budgeting)</option>
                  <option value="admin">Administrator (Akses Penuh)</option>
                </select>
                {selectedUser.id === session.userId && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal block mt-1">Anda tidak dapat menurunkan jabatan akun Anda sendiri demi keamanan.</span>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <label className="text-[11px] font-black text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
                  <Key size={13} /> Reset / Ganti Password Baru (Opsional)
                </label>
                <input type="password" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-mono text-foreground"
                  placeholder="Ketik password baru jika ingin diganti" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal block mt-1">Kosongkan kolom ini jika tidak ingin mengubah password user.</span>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl font-bold" onClick={() => { setShowEditModal(false); setSelectedUser(null); }}>
                  Batal
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold min-w-[100px]"
                  onClick={handleEditUser}>
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
