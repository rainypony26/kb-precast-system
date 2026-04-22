"use client";

import { useState, useMemo } from "react";
import type { SessionPayload } from "@/lib/auth";

type Project = {
  id: string; // Ganti ke string karena kita pakai UUID
  projectCode: string | null; // Tambahkan | null supaya Vercel aman
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

const STATUS_LIST = ["TENDER", "PENAWARAN", "NEGO", "PO", "KONTRAK", "SELESAI", "BATAL"];

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  TENDER:     { label: "Tender",     color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)" },
  PENAWARAN: { label: "Penawaran", color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)" },
  NEGO:       { label: "Nego",       color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)" },
  PO:         { label: "PO",         color: "#c084fc", bg: "rgba(192,132,252,0.12)", border: "rgba(192,132,252,0.3)" },
  KONTRAK:    { label: "Kontrak",    color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)" },
  SELESAI:    { label: "Selesai",    color: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)" },
  BATAL:      { label: "Batal",     color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)" },
};

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

  // Stats
  const stats = useMemo(() => {
    const s: Record<string, number> = {};
    STATUS_LIST.forEach((k) => (s[k] = 0));
    projects.forEach((p) => { if (s[p.status] !== undefined) s[p.status]++; });
    return s;
  }, [projects]);

  // Filter + search
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
    setLoading(true);
    try {
      if (editProject) {
        const res = await fetch(`/api/projects/${editProject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { alert("Error: " + (data.error ?? res.status)); return; }
        setProjects((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { alert("Error: " + (data.error ?? res.status)); return; }
        setProjects((prev) => [data, ...prev]);
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
    <>
      <style>{`
        .crm-wrap { min-height:100vh; background:#0f172a; padding:2rem; }
        .stat-pill { display:flex; flex-direction:column; align-items:center; justify-content:center;
          padding:.75rem 1.25rem; border-radius:.75rem; cursor:pointer; transition:all .15s; min-width:90px; }
        .stat-pill:hover { filter:brightness(1.1); }
        .tbl-row { transition:background .12s; }
        .tbl-row:hover { background:#162032; }
        .btn-green { background:#16a34a; color:#fff; border:none; border-radius:.6rem;
          padding:.5rem 1.25rem; font-size:.85rem; font-weight:600; cursor:pointer; transition:background .15s; }
        .btn-green:hover { background:#15803d; }
        .btn-ghost { background:transparent; color:#94a3b8; border:1px solid #334155;
          border-radius:.6rem; padding:.4rem 1rem; font-size:.8rem; cursor:pointer; transition:all .15s; }
        .btn-ghost:hover { border-color:#4ade80; color:#4ade80; }
        .btn-danger { background:transparent; color:#f87171; border:1px solid rgba(248,113,113,.3);
          border-radius:.6rem; padding:.4rem .8rem; font-size:.8rem; cursor:pointer; transition:all .15s; }
        .btn-danger:hover { background:rgba(248,113,113,.1); }
        .inp { width:100%; background:#1e293b; border:1px solid #334155; border-radius:.6rem;
          color:#f1f5f9; font-size:.875rem; padding:.55rem .85rem; outline:none; transition:border-color .15s; box-sizing:border-box; }
        .inp:focus { border-color:#4ade80; }
        .inp::placeholder { color:#475569; }
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:50;
          display:flex; align-items:center; justify-content:center; padding:1rem; }
        .modal { background:#1e293b; border:1px solid #334155; border-radius:1.25rem;
          width:100%; max-width:600px; max-height:90vh; overflow-y:auto; padding:2rem; }
        .label { font-size:.78rem; color:#64748b; margin-bottom:.3rem; display:block; font-weight:500; letter-spacing:.03em; }
        .status-badge { display:inline-flex; align-items:center; padding:.25rem .75rem;
          border-radius:999px; font-size:.75rem; font-weight:600; border:1px solid; }
        .select-status { background:#0f172a; border:1px solid #334155; border-radius:.5rem;
          color:#f1f5f9; font-size:.8rem; padding:.3rem .6rem; cursor:pointer; outline:none; }
        .detail-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:40;
          display:flex; align-items:flex-start; justify-content:flex-end; }
        .detail-panel { background:#1e293b; border-left:1px solid #334155; width:420px;
          height:100vh; overflow-y:auto; padding:2rem; }
        .pipeline-step { display:flex; align-items:center; gap:.5rem; padding:.5rem .75rem;
          border-radius:.5rem; font-size:.8rem; font-weight:600; cursor:pointer;
          border:1px solid transparent; transition:all .15s; }
        .pipeline-step:hover { filter:brightness(1.15); }
      `}</style>

      <div className="crm-wrap">
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.5rem" }}>
          <div>
            <h1 style={{ color:"#f1f5f9", fontSize:"1.4rem", fontWeight:700, margin:0 }}>CRM & Sales Pipeline</h1>
            <p style={{ color:"#64748b", fontSize:".85rem", margin:".25rem 0 0" }}>Kelola semua proyek dari tender hingga kontrak</p>
          </div>
          <button className="btn-green" onClick={openAdd}>+ Tambah Proyek</button>
        </div>

        {/* Status Summary Pills */}
        <div style={{ display:"flex", gap:".75rem", flexWrap:"wrap", marginBottom:"1.5rem" }}>
          <div
            className="stat-pill"
            onClick={() => setFilterStatus("ALL")}
            style={{
              background: filterStatus === "ALL" ? "rgba(74,222,128,0.12)" : "#1e293b",
              border: `1px solid ${filterStatus === "ALL" ? "rgba(74,222,128,0.4)" : "#334155"}`,
            }}>
            <span style={{ color:"#f1f5f9", fontSize:"1.4rem", fontWeight:700 }}>{projects.length}</span>
            <span style={{ color:"#64748b", fontSize:".72rem", marginTop:".1rem" }}>Semua</span>
          </div>
          {STATUS_LIST.map((s) => {
            const m = STATUS_META[s];
            const active = filterStatus === s;
            return (
              <div
                key={s}
                className="stat-pill"
                onClick={() => setFilterStatus(active ? "ALL" : s)}
                style={{
                  background: active ? m.bg : "#1e293b",
                  border: `1px solid ${active ? m.border : "#334155"}`,
                }}>
                <span style={{ color: m.color, fontSize:"1.4rem", fontWeight:700 }}>{stats[s]}</span>
                <span style={{ color:"#64748b", fontSize:".72rem", marginTop:".1rem" }}>{m.label}</span>
              </div>
            );
          })}
        </div>

        {/* Search + filter bar */}
        <div style={{ display:"flex", gap:".75rem", marginBottom:"1.25rem", alignItems:"center" }}>
          <div style={{ position:"relative", flex:1 }}>
            <svg style={{ position:"absolute", left:".75rem", top:"50%", transform:"translateY(-50%)" }}
              width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="inp"
              style={{ paddingLeft:"2.25rem" }}
              placeholder="Cari nama proyek, customer, PIC, lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select-status"
            style={{ padding:".55rem 1rem", fontSize:".85rem" }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="ALL">Semua Status</option>
            {STATUS_LIST.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"1rem", overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".85rem" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #334155", background:"#162032" }}>
                  {["Kode","Nama Proyek","Customer / PIC","Lokasi","Nilai Proyek","Tgl Mulai","Tgl Selesai","Status","Aksi"].map((h) => (
                    <th key={h} style={{ padding:".75rem 1rem", color:"#64748b", fontWeight:600,
                      fontSize:".75rem", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding:"3rem", textAlign:"center", color:"#475569" }}>
                      {search || filterStatus !== "ALL" ? "Tidak ada proyek yang cocok" : "Belum ada proyek. Klik + Tambah Proyek"}
                    </td>
                  </tr>
                )}
                {filtered.map((p) => {
                  const m = STATUS_META[p.status];
                  return (
                    <tr key={p.id} className="tbl-row" style={{ borderBottom:"1px solid #1e293b" }}>
                      <td style={{ padding:".7rem 1rem", color:"#64748b", whiteSpace:"nowrap", fontFamily:"monospace", fontSize:".8rem" }}>
                        {p.projectCode}
                      </td>
                      <td style={{ padding:".7rem 1rem" }}>
                        <button
                          onClick={() => setDetailProject(p)}
                          style={{ background:"none", border:"none", color:"#f1f5f9", cursor:"pointer",
                            fontWeight:600, fontSize:".85rem", textAlign:"left", padding:0 }}>
                          {p.projectName}
                        </button>
                      </td>
                      <td style={{ padding:".7rem 1rem" }}>
                        <div style={{ color:"#e2e8f0", fontSize:".85rem" }}>{p.customerName}</div>
                        <div style={{ color:"#64748b", fontSize:".75rem" }}>PIC: {p.picName}</div>
                      </td>
                      <td style={{ padding:".7rem 1rem", color:"#94a3b8", fontSize:".8rem", maxWidth:120 }}>
                        {p.location ?? "-"}
                      </td>
                      <td style={{ padding:".7rem 1rem", color:"#4ade80", fontWeight:600, whiteSpace:"nowrap" }}>
                        {formatRp(p.projectValue)}
                      </td>
                      <td style={{ padding:".7rem 1rem", color:"#94a3b8", whiteSpace:"nowrap", fontSize:".8rem" }}>
                        {formatDate(p.tenderDate)}
                      </td>
                      <td style={{ padding:".7rem 1rem", color:"#94a3b8", whiteSpace:"nowrap", fontSize:".8rem" }}>
                        {formatDate(p.estimatedFinish)}
                      </td>
                      <td style={{ padding:".7rem 1rem" }}>
                        {statusLoading === p.id ? (
                          <span style={{ color:"#64748b", fontSize:".75rem" }}>Menyimpan...</span>
                        ) : (
                          <select
                            className="select-status"
                            value={p.status}
                            onChange={(e) => updateStatus(p.id, e.target.value)}
                            style={{ color: m.color, borderColor: m.border, background: m.bg }}>
                            {STATUS_LIST.map((s) => (
                              <option key={s} value={s} style={{ background:"#1e293b", color:"#f1f5f9" }}>
                                {STATUS_META[s].label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td style={{ padding:".7rem 1rem" }}>
                        <div style={{ display:"flex", gap:".4rem" }}>
                          <button className="btn-ghost" onClick={() => openEdit(p)}>Edit</button>
                          {session?.role === "admin" && (
                            <button className="btn-danger" onClick={() => handleDelete(p.id)}>Hapus</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div style={{ padding:".75rem 1.25rem", borderTop:"1px solid #334155",
            color:"#64748b", fontSize:".78rem", display:"flex", justifyContent:"space-between" }}>
            <span>Menampilkan {filtered.length} dari {projects.length} proyek</span>
            {(search || filterStatus !== "ALL") && (
              <button
                onClick={() => { setSearch(""); setFilterStatus("ALL"); }}
                style={{ background:"none", border:"none", color:"#4ade80", cursor:"pointer", fontSize:".78rem" }}>
                Reset filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== FORM MODAL ===== */}
      {showForm && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
              <h2 style={{ color:"#f1f5f9", fontSize:"1.1rem", fontWeight:700, margin:0 }}>
                {editProject ? "Edit Proyek" : "Tambah Proyek Baru"}
              </h2>
              <button onClick={() => setShowForm(false)}
                style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:"1.25rem" }}>✕</button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
              {/* Nama Proyek */}
              <div style={{ gridColumn:"1/-1" }}>
                <label className="label">Nama Proyek *</label>
                <input className="inp" placeholder="Contoh: Proyek Jembatan Tol Makassar"
                  value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} />
              </div>

              {/* Customer */}
              <div>
                <label className="label">Nama Customer / Perusahaan *</label>
                <input className="inp" placeholder="PT. ..."
                  value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </div>

              {/* PIC */}
              <div>
                <label className="label">Nama PIC (Person in Charge) *</label>
                <input className="inp" placeholder="Nama penanggung jawab"
                  value={form.picName} onChange={(e) => setForm({ ...form, picName: e.target.value })} />
              </div>

              {/* Status */}
              <div>
                <label className="label">Status Pipeline</label>
                <select className="inp" value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUS_LIST.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </select>
              </div>

              {/* Nilai Proyek */}
              <div>
                <label className="label">Nilai Proyek (Rp)</label>
                <input className="inp" type="number" placeholder="Contoh: 500000000"
                  value={form.projectValue} onChange={(e) => setForm({ ...form, projectValue: e.target.value })} />
              </div>

              {/* Tanggal Mulai Proyek */}
              <div>
                <label className="label">Tanggal Mulai Proyek *</label>
                <input className="inp" type="date"
                  value={form.tenderDate} onChange={(e) => setForm({ ...form, tenderDate: e.target.value })} />
              </div>

              {/* Est. Selesai Proyek */}
              <div>
                <label className="label">Estimasi Selesai Proyek *</label>
                <input className="inp" type="date"
                  value={form.estimatedFinish} onChange={(e) => setForm({ ...form, estimatedFinish: e.target.value })} />
              </div>

              {/* Lokasi */}
              <div style={{ gridColumn:"1/-1" }}>
                <label className="label">Lokasi Proyek</label>
                <input className="inp" placeholder="Contoh: Makassar, Sulawesi Selatan"
                  value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>

              {/* Notes */}
              <div style={{ gridColumn:"1/-1" }}>
                <label className="label">Catatan</label>
                <textarea className="inp" rows={3} placeholder="Catatan tambahan (opsional)..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{ resize:"vertical" }} />
              </div>
            </div>

            <div style={{ display:"flex", gap:".75rem", justifyContent:"flex-end", marginTop:"1.5rem" }}>
              <button className="btn-ghost" onClick={() => setShowForm(false)}>Batal</button>
              <button className="btn-green" onClick={handleSubmit} disabled={loading}>
                {loading ? "Menyimpan..." : editProject ? "Simpan Perubahan" : "Tambah Proyek"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAIL SIDE PANEL ===== */}
      {detailProject && (
        <div className="detail-overlay" onClick={(e) => e.target === e.currentTarget && setDetailProject(null)}>
          <div className="detail-panel">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.5rem" }}>
              <div>
                <span style={{ color:"#64748b", fontSize:".75rem", fontFamily:"monospace" }}>{detailProject.projectCode}</span>
                <h2 style={{ color:"#f1f5f9", fontSize:"1.1rem", fontWeight:700, margin:".25rem 0 0" }}>{detailProject.projectName}</h2>
              </div>
              <button onClick={() => setDetailProject(null)}
                style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:"1.25rem", flexShrink:0 }}>✕</button>
            </div>

            {/* Pipeline steps */}
            <div style={{ marginBottom:"1.5rem" }}>
              <p style={{ color:"#64748b", fontSize:".75rem", fontWeight:600, marginBottom:".6rem", textTransform:"uppercase", letterSpacing:".05em" }}>
                Update Status Pipeline
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:".4rem" }}>
                {STATUS_LIST.map((s) => {
                  const m = STATUS_META[s];
                  const isActive = detailProject.status === s;
                  return (
                    <button
                      key={s}
                      className="pipeline-step"
                      onClick={() => updateStatus(detailProject.id, s)}
                      disabled={statusLoading === detailProject.id}
                      style={{
                        background: isActive ? m.bg : "transparent",
                        border: `1px solid ${isActive ? m.border : "#334155"}`,
                        color: isActive ? m.color : "#64748b",
                      }}>
                      {isActive && "✓ "}{m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail info */}
            <div style={{ display:"flex", flexDirection:"column", gap:".85rem" }}>
              {[
                { label: "Customer", value: detailProject.customerName },
                { label: "PIC", value: detailProject.picName },
                { label: "Lokasi", value: detailProject.location ?? "-" },
                { label: "Nilai Proyek", value: formatRp(detailProject.projectValue) },
                { label: "Tanggal Mulai Proyek", value: formatDate(detailProject.tenderDate) },
                { label: "Estimasi Selesai Proyek", value: formatDate(detailProject.estimatedFinish) },
                { label: "Dibuat", value: formatDate(detailProject.createdAt) },
              ].map(({ label, value }) => (
                <div key={label} style={{ borderBottom:"1px solid #334155", paddingBottom:".75rem" }}>
                  <div style={{ color:"#64748b", fontSize:".75rem", marginBottom:".2rem" }}>{label}</div>
                  <div style={{ color:"#e2e8f0", fontSize:".9rem" }}>{value}</div>
                </div>
              ))}

              {detailProject.notes && (
                <div>
                  <div style={{ color:"#64748b", fontSize:".75rem", marginBottom:".35rem" }}>Catatan</div>
                  <div style={{ color:"#94a3b8", fontSize:".85rem", lineHeight:1.6,
                    background:"#0f172a", borderRadius:".5rem", padding:".75rem" }}>
                    {detailProject.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display:"flex", gap:".5rem", marginTop:"1.5rem" }}>
              <button className="btn-ghost" style={{ flex:1 }} onClick={() => { openEdit(detailProject); setDetailProject(null); }}>
                Edit Data
              </button>
              {session?.role === "admin" && (
                <button className="btn-danger" onClick={() => handleDelete(detailProject.id)}>Hapus</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}