"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
// --- IMPORT TAMBAHAN ---
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { FileSpreadsheet, FileText } from "lucide-react";

// --- TYPES (Tetap Sama) ---
type PlanWithProgress = {
  id: string; spkNumber: string | null; targetVolume: number; unit: string;
  commenceDate: string; deadlineDate: string; status: string; dailyReports: DailyReport[];
  contract?: { project?: { projectName: string | null; customerName: string | null } };
  totalFG: number; totalDamaged: number; totalReturn: number; progressPercent: number;
  avgDaily: number; estDaysToFinish: number;
};

type DailyReport = {
  id: string; reportDate: string; fgQty: number; damagedQty: number; returnQty: number; notes: string | null;
};

export default function MonitoringClient({ userId, userRole }: { userId: string; userRole: string }) {
  const [plans, setPlans] = useState<PlanWithProgress[]>([]);
  // ... (State lainnya tetap sama sampai ke filteredPlans)
  const [selectedPlan, setSelectedPlan] = useState<PlanWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const timerRef = useRef<any>(null);

  const [form, setForm] = useState({
    planId: "", reportDate: new Date().toISOString().split("T")[0],
    fgQuantity: "", damagedQuantity: "", returnQuantity: "", notes: "",
  });

  const [editForm, setEditForm] = useState({
    fgQuantity: "", damagedQuantity: "", returnQuantity: "", notes: "",
  });

  const notify = (type: 'err' | 'succ', msg: string) => {
    if (type === 'err') setErrorMsg(msg); else setSuccessMsg(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setErrorMsg(""); setSuccessMsg(""); }, 3000);
  };

  const calculateDetailedProgress = useCallback((plan: any): PlanWithProgress => {
    const reports = plan.dailyReports || [];
    const totalFG = reports.reduce((s: number, r: any) => s + Number(r.fgQty ?? 0), 0);
    const totalDamaged = reports.reduce((s: number, r: any) => s + Number(r.damagedQty ?? 0), 0);
    const totalReturn = reports.reduce((s: number, r: any) => s + Number(r.returnQty ?? 0), 0);
    const target = Number(plan.targetVolume || 0);
    const progressPercent = target > 0 ? (totalFG / target) * 100 : 0;
    const avgDaily = reports.length > 0 ? totalFG / reports.length : 0;
    const remainingTarget = Math.max(0, target - totalFG);
    const estDaysToFinish = avgDaily > 0 ? Math.ceil(remainingTarget / avgDaily) : 0;

    return { ...plan, totalFG, totalDamaged, totalReturn, progressPercent, avgDaily, estDaysToFinish };
  }, []);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/daily-reports");
      const data = await res.json();
      if (Array.isArray(data)) setPlans(data.map(p => calculateDetailedProgress(p)));
    } catch { notify('err', "Gagal memuat data monitoring."); }
    finally { setLoading(false); }
  }, [calculateDetailedProgress]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  useEffect(() => {
    if (selectedPlan) {
      const updated = plans.find(p => p.id === selectedPlan.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedPlan)) setSelectedPlan(updated);
    }
  }, [plans, selectedPlan]);

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
      const q = searchQuery.toLowerCase();
      return matchStatus && (
        (p.spkNumber?.toLowerCase() || "").includes(q) || 
        (p.contract?.project?.projectName?.toLowerCase() || "").includes(q)
      );
    });
  }, [plans, statusFilter, searchQuery]);

  // --- FUNGSI EXPORT (SUNTIKAN BARU) ---
  const handleDownloadExcel = () => {
    const excelData = filteredPlans.map(p => ({
      "No. SPK": p.spkNumber,
      "Nama Proyek": p.contract?.project?.projectName,
      "Target": `${p.targetVolume} ${p.unit}`,
      "Realisasi FG": p.totalFG,
      "Progress": `${p.progressPercent.toFixed(1)}%`,
      "Est. Selesai": `${p.estDaysToFinish} Hari`,
      "Status": p.status
    }));
    exportToExcel(excelData, `Laporan_Produksi_${new Date().toLocaleDateString()}`);
  };

  const handleDownloadPDF = () => {
    const headers = [["No. SPK", "Proyek", "Target", "FG", "Progress", "Status"]];
    const body = filteredPlans.map(p => [
      p.spkNumber,
      p.contract?.project?.projectName,
      p.targetVolume,
      p.totalFG,
      `${p.progressPercent.toFixed(1)}%`,
      p.status
    ]);
    exportToPDF("LAPORAN MONITORING PRODUKSI KALLA BETON", headers, body, "Laporan_Monitoring_Kalla_Beton");
  };

  // ... (Handle functions aslinu tetap ada di bawah sini)
  const handleEditReport = async () => {
    if (!editingReport) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/daily-reports/${editingReport.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      notify('succ', "Koreksi berhasil disimpan!");
      setShowEditModal(false);
      await fetchPlans();
    } catch { notify('err', "Gagal update data."); }
    finally { setSubmitting(false); }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm("Hapus laporan ini secara permanen?")) return;
    try {
      const res = await fetch(`/api/daily-reports/${id}`, { method: "DELETE" });
      if (res.ok) { notify('succ', "Laporan dihapus!"); await fetchPlans(); }
      else throw new Error();
    } catch { notify('err', "Gagal menghapus."); }
  };

  const handleSubmitReport = async () => {
    if (!form.planId || !form.reportDate || form.fgQuantity === "") return notify('err', "FG wajib diisi!");
    setSubmitting(true);
    try {
      const res = await fetch("/api/daily-reports", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      notify('succ', "BKH Berhasil Disimpan!");
      setShowReportModal(false);
      setForm({ planId: "", reportDate: new Date().toISOString().split("T")[0], fgQuantity: "", damagedQuantity: "", returnQuantity: "", notes: "" });
      await fetchPlans();
    } catch { notify('err', "Gagal menyimpan laporan."); }
    finally { setSubmitting(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#1a1d2e", border: "1.5px solid #3d4268", borderRadius: "10px", 
    padding: "12px", color: "white", outline: "none", boxSizing: "border-box", fontSize: "14px"
  };

  return (
    <div style={{ background: "#0b0d11", minHeight: "100vh", color: "#e2e8f0", padding: "28px", fontFamily: "sans-serif" }}>
      {/* ... style aslimu ... */}
      <style>{`
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .modal-box { background: #161a23; border-radius: 24px; padding: 32px; width: 500px; border: 1px solid #2d3748; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
        .slide-panel { position: fixed; right: 0; top: 0; bottom: 0; width: 440px; background: #161a23; border-left: 1px solid #2d3748; padding: 32px; z-index: 90; overflow-y: auto; transition: 0.3s; }
        .btn-primary { background: #10b981; color: white; border: none; padding: 14px 28px; border-radius: 12px; cursor: pointer; font-weight: 700; transition: 0.2s; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); }
        .btn-primary:hover { background: #059669; transform: translateY(-1px); }
        .card-spk { background: #161a23; padding: 24px; border-radius: 20px; border: 1px solid #2d3748; cursor: pointer; transition: 0.3s; }
        .card-spk:hover { border-color: #10b981; transform: translateY(-4px); }
        .toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); padding: 14px 28px; border-radius: 14px; z-index: 200; font-weight: 700; }
        .input-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 100%; }
        
        /* Tambahan Style Tombol Export */
        .btn-export { background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 10px 18px; border-radius: 12px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
        .btn-export:hover { border-color: #10b981; color: #fff; background: #0f172a; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 900, margin: 0, color: "#fff" }}>LIVE MONITORING</h1>
          <p style={{ color: "#718096", margin: "4px 0 0", fontSize: "14px" }}>Visualisasi Produksi Precast Kalla Beton</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {/* TOMBOL EXPORT BARU */}
          <button className="btn-export" onClick={handleDownloadExcel}><FileSpreadsheet size={18}/> EXCEL</button>
          <button className="btn-export" onClick={handleDownloadPDF}><FileText size={18}/> PDF</button>
          <button className="btn-primary" onClick={() => setShowReportModal(true)}>+ INPUT BKH HARIAN</button>
        </div>
      </div>

      {/* ... SISANYA 100% SAMA SEPERTI KODEMU ... */}
      {/* Filter Bar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
        <input 
          style={{ flex: 1, maxWidth: "400px", background: "#161a23", border: "1px solid #2d3748", borderRadius: "14px", padding: "14px 20px", color: "white", outline: "none" }} 
          placeholder="🔍 Cari nomor SPK atau Proyek..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {["ALL", "AKTIF", "SELESAI"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{ background: statusFilter === s ? "#10b981" : "#161a23", border: "1px solid #2d3748", color: "white", padding: "0 24px", borderRadius: "14px", cursor: "pointer", fontWeight: 600 }}>{s}</button>
        ))}
      </div>

      {/* Grid Dashboard */}
      {loading ? <p style={{ textAlign: "center", color: "#718096" }}>Menghubungkan ke sistem...</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "24px" }}>
          {filteredPlans.map(plan => (
            <div key={plan.id} onClick={() => setSelectedPlan(plan)} className="card-spk">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "5px 12px", borderRadius: "8px" }}>{plan.spkNumber}</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: plan.status === 'AKTIF' ? '#10b981' : '#718096' }}>{plan.status}</span>
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 20px", color: "#fff" }}>{plan.contract?.project?.projectName || "Proyek Tanpa Nama"}</h3>
              
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px", fontWeight: 700 }}>
                  <span>Progres Real-time</span>
                  <span style={{ color: "#10b981" }}>{plan.progressPercent.toFixed(1)}%</span>
                </div>
                <div style={{ background: "#2d3748", height: "12px", borderRadius: "20px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(plan.progressPercent, 100)}%`, background: "linear-gradient(90deg, #10b981, #34d399)", height: "100%", transition: "1s ease" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "#0b0d11", padding: "14px", borderRadius: "14px", border: "1px solid #1a202c" }}>
                  <div style={{ fontSize: "10px", color: "#718096", fontWeight: 800 }}>TOTAL FG</div>
                  <div style={{ fontSize: "18px", fontWeight: 900 }}>{plan.totalFG} <span style={{ fontSize: "11px", fontWeight: 400 }}>{plan.unit}</span></div>
                </div>
                <div style={{ background: "#0b0d11", padding: "14px", borderRadius: "14px", border: "1px solid #1a202c" }}>
                  <div style={{ fontSize: "10px", color: "#718096", fontWeight: 800 }}>EST. SELESAI</div>
                  <div style={{ fontSize: "18px", fontWeight: 900 }}>{plan.estDaysToFinish || "-"} <span style={{ fontSize: "11px", fontWeight: 400 }}>Hari</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide Panel Detail */}
      {selectedPlan && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 89 }} onClick={() => setSelectedPlan(null)} />
          <div className="slide-panel">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px", alignItems: "center" }}>
              <h2 style={{ fontSize: "22px", fontWeight: 900, margin: 0 }}>Analisa SPK</h2>
              <button onClick={() => setSelectedPlan(null)} style={{ background: "#1a202c", border: "none", color: "#718096", width: "40px", height: "40px", borderRadius: "12px", cursor: "pointer", fontSize: "20px" }}>✕</button>
            </div>
            
            <div style={{ background: "#0b0d11", padding: "20px", borderRadius: "18px", marginBottom: "30px" }}>
              <div style={{ fontSize: "12px", color: "#718096", marginBottom: "4px" }}>NOMOR SPK</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#10b981", marginBottom: "15px" }}>{selectedPlan.spkNumber}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div><div style={{ fontSize: "10px", color: "#718096" }}>TARGET</div><div style={{ fontWeight: 700 }}>{selectedPlan.targetVolume} {selectedPlan.unit}</div></div>
                <div><div style={{ fontSize: "10px", color: "#718096" }}>AVG PROD</div><div style={{ fontWeight: 700 }}>{selectedPlan.avgDaily.toFixed(1)}/Hr</div></div>
              </div>
            </div>

            <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "20px", color: "#718096" }}>RIWAYAT BKH ({selectedPlan.dailyReports.length})</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {selectedPlan.dailyReports.slice().reverse().map(r => (
                <div key={r.id} style={{ background: "#1a1f29", padding: "18px", borderRadius: "18px", borderLeft: "5px solid #10b981" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontWeight: 800, fontSize: "14px" }}>📅 {new Date(r.reportDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button style={{ color: "#60a5fa", background: "rgba(96,165,250,0.1)", border: "none", padding: "6px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "11px", fontWeight: 700 }} onClick={() => { setEditingReport(r); setEditForm({ fgQuantity: String(r.fgQty), damagedQuantity: String(r.damagedQty), returnQuantity: String(r.returnQty), notes: r.notes || "" }); setShowEditModal(true); }}>EDIT</button>
                      {userRole === "admin" && <button style={{ color: "#f87171", background: "rgba(248,113,113,0.1)", border: "none", padding: "6px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "11px", fontWeight: 700 }} onClick={() => handleDeleteReport(r.id)}>HAPUS</button>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "20px", fontSize: "13px" }}>
                    <span>FG: <b style={{ color: "#34d399" }}>{r.fgQty}</b></span>
                    <span>Cacat: <b style={{ color: "#f87171" }}>{r.damagedQty}</b></span>
                    <span>Retur: <b>{r.returnQty}</b></span>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{ width: "100%", marginTop: "32px" }} onClick={() => { setForm({...form, planId: selectedPlan.id}); setShowReportModal(true); }}>+ TAMBAH LAPORAN BARU</button>
          </div>
        </>
      )}

      {/* Modal Input BKH (FIXED GRID) */}
      {showReportModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h2 style={{ fontSize: "22px", fontWeight: 900, marginBottom: "24px", textAlign: "center" }}>📝 Input BKH Baru</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#718096", display: "block", marginBottom: "8px" }}>PILIH SPK AKTIF</label>
                <select style={inputStyle} value={form.planId} onChange={e => setForm({...form, planId: e.target.value})}>
                  <option value="">-- Pilih SPK --</option>
                  {plans.filter(p => p.status === "AKTIF").map(p => <option key={p.id} value={p.id}>{p.spkNumber} - {p.contract?.project?.projectName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#718096", display: "block", marginBottom: "8px" }}>TANGGAL PRODUKSI</label>
                <input type="date" style={inputStyle} value={form.reportDate} onChange={e => setForm({...form, reportDate: e.target.value})} />
              </div>
              <div className="input-grid">
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#10b981", display: "block", marginBottom: "6px" }}>FG</label>
                  <input type="number" style={inputStyle} placeholder="0" value={form.fgQuantity} onChange={e => setForm({...form, fgQuantity: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#f87171", display: "block", marginBottom: "6px" }}>CACAT</label>
                  <input type="number" style={inputStyle} placeholder="0" value={form.damagedQuantity} onChange={e => setForm({...form, damagedQuantity: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#718096", display: "block", marginBottom: "6px" }}>RETUR</label>
                  <input type="number" style={inputStyle} placeholder="0" value={form.returnQuantity} onChange={e => setForm({...form, returnQuantity: e.target.value})} />
                </div>
              </div>
              <textarea style={{ ...inputStyle, height: "100px", resize: "none" }} placeholder="Catatan kendala produksi..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                <button style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "#2d3748", color: "white", border: "none", cursor: "pointer", fontWeight: 700 }} onClick={() => setShowReportModal(false)}>BATAL</button>
                <button className="btn-primary" style={{ flex: 2 }} onClick={handleSubmitReport} disabled={submitting}>SIMPAN LAPORAN</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit BKH (FIXED GRID) */}
      {showEditModal && editingReport && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h2 style={{ fontSize: "22px", fontWeight: 900, marginBottom: "24px", textAlign: "center" }}>✏️ Koreksi Laporan</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="input-grid">
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#10b981" }}>FG</label>
                  <input type="number" style={inputStyle} value={editForm.fgQuantity} onChange={e => setEditForm({...editForm, fgQuantity: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#f87171" }}>CACAT</label>
                  <input type="number" style={inputStyle} value={editForm.damagedQuantity} onChange={e => setEditForm({...editForm, damagedQuantity: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#718096" }}>RETUR</label>
                  <input type="number" style={inputStyle} value={editForm.returnQuantity} onChange={e => setEditForm({...editForm, returnQuantity: e.target.value})} />
                </div>
              </div>
              <textarea style={{ ...inputStyle, height: "100px", resize: "none" }} placeholder="Alasan koreksi data..." value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
              <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                <button style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "#2d3748", color: "white", border: "none", cursor: "pointer", fontWeight: 700 }} onClick={() => setShowEditModal(false)}>BATAL</button>
                <button className="btn-primary" style={{ flex: 2 }} onClick={handleEditReport} disabled={submitting}>SIMPAN PERUBAHAN</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}