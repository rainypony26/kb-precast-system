"use client";

import { useState, useEffect, useRef } from "react";
import { 
  User, Key, Camera, CheckCircle, AlertCircle, Lock, Shield, 
  Sparkles, Palette, UploadCloud, RefreshCw
} from "lucide-react";

type UserProfile = {
  id: string;
  username: string;
  fullName: string;
  role: "admin" | "manager" | "staff" | "assistant_manager";
  isActive: boolean;
  profilePic: string | null;
  createdAt: string;
};

export default function ProfileClient({ session }: { session: any }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Edit fields
  const [fullName, setFullName] = useState("");
  const [profilePic, setProfilePic] = useState<string | null>(null);
  
  // Password fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const notificationTimer = useRef<any>(null);

  const notify = (type: "err" | "succ", msg: string) => {
    if (type === "err") setErrorMsg(msg); else setSuccessMsg(msg);
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => {
      setErrorMsg("");
      setSuccessMsg("");
    }, 4000);
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me");
      if (!res.ok) throw new Error("Gagal mengambil data profil.");
      const data = await res.json();
      setProfile(data);
      setFullName(data.fullName);
      setProfilePic(data.profilePic);
    } catch (err: any) {
      notify("err", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePresetSelect = (presetName: string) => {
    setProfilePic(`preset:${presetName}`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g., max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return notify("err", "Ukuran gambar terlalu besar! Maksimal 2MB.");
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePic(reader.result as string);
    };
    reader.onerror = () => {
      notify("err", "Gagal membaca file gambar.");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      return notify("err", "Nama lengkap wajib diisi!");
    }

    // Password validation
    if (newPassword || confirmPassword || oldPassword) {
      if (!oldPassword) {
        return notify("err", "Password lama Anda harus diisi untuk mengubah password.");
      }
      if (newPassword.length < 6) {
        return notify("err", "Password baru minimal 6 karakter.");
      }
      if (newPassword !== confirmPassword) {
        return notify("err", "Konfirmasi password baru tidak cocok.");
      }
    }

    setUpdating(true);
    try {
      const payload: Record<string, any> = {
        fullName: fullName.trim(),
        profilePic: profilePic,
      };

      if (newPassword) {
        payload.oldPassword = oldPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan perubahan.");
      }

      notify("succ", "Profil Anda berhasil diperbarui!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Update local profile state
      setProfile(data);
      
      // Dispatch event to sync sidebar details
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err: any) {
      notify("err", err.message);
    } finally {
      setUpdating(false);
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

  const presets = ["emerald", "blue", "purple", "amber", "rose", "slate"];
  const userInitial = fullName ? fullName.substring(0, 2).toUpperCase() : "US";
  const userRoleLabel = profile?.role === "admin" 
    ? "Administrator" 
    : profile?.role === "manager" 
    ? "Manager" 
    : profile?.role === "assistant_manager" 
    ? "Asisten Manager" 
    : "Staff Lapangan";

  return (
    <div className="min-h-screen bg-background p-8 text-slate-800 dark:text-slate-100 font-sans">
      
      {/* Toast Notifications */}
      {errorMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-6 py-3.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold font-mono">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-6 py-3.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold font-mono">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm mb-8">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <User className="text-emerald-600" size={28} /> Pengaturan Profil Saya
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Perbarui foto profil, nama lengkap, dan kredensial password akun Anda</p>
      </div>

      {loading ? (
        <div className="bg-card rounded-3xl border border-border p-20 flex justify-center items-center shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-emerald-600" />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">Memuat data akun...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: PROFILE PIC & AVATAR GENERATOR */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center text-center">
              
              {/* Profile Pic Display */}
              <div className="relative group mb-6">
                {profilePic ? (
                  profilePic.startsWith("data:") ? (
                    <img 
                      src={profilePic} 
                      alt="Uploaded Avatar" 
                      className="w-32 h-32 rounded-3xl object-cover border-4 border-card shadow-md transition-transform duration-300 group-hover:scale-105" 
                    />
                  ) : (
                    <div className={`w-32 h-32 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-md bg-gradient-to-br transition-transform duration-300 group-hover:scale-105 ${getPresetClass(profilePic)}`}>
                      {userInitial}
                    </div>
                  )
                ) : (
                  <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-3xl font-black shadow-md transition-transform duration-300 group-hover:scale-105">
                    {userInitial}
                  </div>
                )}
                
                {/* Upload Hover Overlay */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-slate-900/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-white/20 text-white cursor-pointer"
                  title="Unggah Foto Kustom"
                >
                  <Camera size={24} className="animate-pulse" />
                </button>
              </div>

              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />

              {/* Profile Meta Info */}
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{profile?.fullName}</h2>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">@{profile?.username}</p>
              
              <div className="mt-4 flex flex-col items-center gap-1.5 w-full">
                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 text-[10px] font-black rounded-full">
                  {userRoleLabel}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                  Akun Dibuat: {new Date(profile?.createdAt || "").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* AVATAR COLOR GENERATOR CARD */}
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
              <h3 className="text-xs font-black text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                <Palette className="text-emerald-600" size={16} /> Pilihan Avatar Preset
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed mb-4">
                Pilih palet gradien premium di bawah jika Anda tidak ingin menggunakan foto pribadi Anda.
              </p>

              <div className="grid grid-cols-3 gap-2">
                {presets.map((preset) => {
                  const activePreset = profilePic === `preset:${preset}` || (!profilePic && preset === "emerald");
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={`h-10 rounded-xl bg-gradient-to-br cursor-pointer border-2 transition-all flex items-center justify-center font-bold text-white text-[10px] ${getPresetClass(`preset:${preset}`)} ${activePreset ? "border-emerald-600 scale-95 shadow-inner" : "border-transparent hover:scale-105 shadow-sm"}`}
                    >
                      {preset.charAt(0).toUpperCase() + preset.slice(1)}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-border mt-5 pt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 border border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <UploadCloud size={14} /> Unggah Foto Kustom
                </button>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 text-center block mt-1.5">Mendukung format JPG, PNG, atau WEBP, maks. 2MB.</span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: PROFILE DETAILS & CHANGE PASSWORD */}
          <form onSubmit={handleSaveProfile} className="lg:col-span-2 space-y-6">
            
            {/* GENERAL DETAILS */}
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-5">
              <h3 className="text-xs font-black text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                <Sparkles className="text-emerald-600" size={16} /> Detail Informasi Akun
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Username Login (Unik)</label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-slate-400 dark:text-slate-500 select-none cursor-not-allowed">
                    <Lock size={14} className="mr-2" />
                    <span className="font-mono">@{profile?.username}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal block mt-1">Username tidak dapat diubah demi integritas log audit.</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Jabatan Otoritas Peran</label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-slate-400 dark:text-slate-500 select-none cursor-not-allowed">
                    <Shield size={14} className="mr-2" />
                    <span>{userRoleLabel}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal block mt-1">Hubungi Administrator jika ada penyesuaian peran jabatan.</span>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Nama Lengkap Pengguna *</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                    placeholder="Masukkan nama lengkap karyawan"
                  />
                </div>
              </div>
            </div>

            {/* SECURITY / PASSWORD RESET */}
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-5">
              <h3 className="text-xs font-black text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                <Key className="text-emerald-600" size={16} /> Ganti Password
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                Biarkan kolom password di bawah ini kosong jika Anda tidak berniat untuk memperbarui password login Anda.
              </p>

              <div className="space-y-4 text-xs font-bold">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Password Lama Saat Ini</label>
                  <input 
                    type="password" 
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-mono text-slate-800 dark:text-slate-100"
                    placeholder="Masukkan password Anda sekarang"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Password Baru</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-mono text-slate-800 dark:text-slate-100"
                      placeholder="Password baru (min. 6 karakter)"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Konfirmasi Password Baru</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl outline-none focus:border-emerald-500 font-mono text-slate-800 dark:text-slate-100"
                      placeholder="Konfirmasi password baru"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BUTTON SUBMIT */}
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={fetchProfile}
                className="px-5 py-3 border border-border hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all bg-card hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Reset Form
              </button>
              <button 
                type="submit"
                disabled={updating}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/70 text-white rounded-xl text-xs font-bold transition-all shadow-md min-w-[150px] flex items-center justify-center gap-1.5"
              >
                {updating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </button>
            </div>

          </form>

        </div>
      )}

    </div>
  );
}
