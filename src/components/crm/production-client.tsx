"use client";

import { useState, useMemo } from "react";
import type { SessionPayload } from "@/lib/auth";

type Project = {
  id: string; projectCode: string | null; projectName: string;
  customerName: string; status: string;
};

type Contract = {
  id: string; projectId: string; contractNumber: string;
  contractValue: string; startDate: string; endDate: string;
  notes: string | null; createdAt: string | null;
  projectName?: string | null; projectCode?: string | null; customerName?: string | null;
};

type BomItem = { materialName: string; estimatedQty: string; unit: string; procurementType: string; unitPrice: string; notes?: string };
type ManpowerItem = { sourceType: string; headcount: string | number; roleDescription: string; dailyRate: string; notes?: string };

type Plan = {
  id: string; contractId: string; spkNumber: string | null;
  targetVolume: number; unit: string;
  commenceDate: string; deadlineDate: string;
  status: string; notes: string | null; createdAt: string | null;
  contractNumber?: string | null; projectName?: string | null; projectCode?: string | null;
  bomItems?: BomItem[];
  manpowerItems?: ManpowerItem[];
};

const PLAN_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:   { label: "Draft",   color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)" },
  AKTIF:   { label: "Aktif",   color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)" },
  SELESAI: { label: "Selesai", color: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)" },
  BATAL:   { label: "Batal",   color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)" },
};

function fmt(val: string | null) {
  if (!val) return "-";
  return "Rp " + Number(val).toLocaleString("id-ID");
}
function fmtDate(val: string | null) {
  if (!val) return "-";
  return new Date(val).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const EMPTY_CONTRACT = { projectId: "", contractNumber: "", contractValue: "", notes: "" };
const EMPTY_BOM: BomItem = { materialName: "", estimatedQty: "", unit: "m3", procurementType: "BELI_BARU", unitPrice: "" };
const EMPTY_MP: ManpowerItem = { sourceType: "INTERNAL", headcount: "", roleDescription: "", dailyRate: "" };

export default function ProductionClient({
  kontrakProjects, initialContracts, initialPlans, session,
}: {
  kontrakProjects: Project[];
  initialContracts: Contract[];
  initialPlans: Plan[];
  session: SessionPayload | null;
}) {
  const [tab, setTab] = useState<"contracts" | "spk">("contracts");
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [search, setSearch] = useState("");

  // Contract state
  const [showContractForm, setShowContractForm] = useState(false);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [contractForm, setContractForm] = useState(EMPTY_CONTRACT);
  const [contractLoading, setContractLoading] = useState(false);
  const [detailContract, setDetailContract] = useState<Contract | null>(null);

  // SPK state
  const [showSpkForm, setShowSpkForm] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [spkContractId, setSpkContractId] = useState("");
  const [spkForm, setSpkForm] = useState({ targetVolume: "", unit: "pcs", notes: "" });
  const [bomItems, setBomItems] = useState<BomItem[]>([{ ...EMPTY_BOM }]);
  const [manpowerItems, setManpowerItems] = useState<ManpowerItem[]>([{ ...EMPTY_MP }]);
  const [spkLoading, setSpkLoading] = useState(false);
  const [detailPlan, setDetailPlan] = useState<Plan | null>(null);

  const filteredContracts = useMemo(() => contracts.filter(c =>
    !search || c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
    (c.projectName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.customerName ?? "").toLowerCase().includes(search.toLowerCase())
  ), [contracts, search]);

  const filteredPlans = useMemo(() => plans.filter(p =>
    !search || (p.spkNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.projectName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.contractNumber ?? "").toLowerCase().includes(search.toLowerCase())
  ), [plans, search]);

  // ================= ACTION KONTRAK =================
  function openAddContract() {
    setEditContract(null);
    setContractForm(EMPTY_CONTRACT);
    setShowContractForm(true);
  }

  function openEditContract(c: Contract) {
    setEditContract(c);
    setContractForm({
      projectId: c.projectId,
      contractNumber: c.contractNumber,
      contractValue: c.contractValue,
      notes: c.notes ?? "",
    });
    setShowContractForm(true);
  }

  async function submitContract() {
    if (!contractForm.projectId || !contractForm.contractNumber || !contractForm.contractValue) {
      alert("Proyek, nomor kontrak, dan nilai wajib diisi!"); return;
    }
    setContractLoading(true);
    try {
      if (editContract) {
        const res = await fetch(`/api/contracts/${editContract.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contractForm),
        });
        const data = await res.json();
        if (!res.ok) { alert("Error: " + (data.error ?? res.status)); return; }
        const proj = kontrakProjects.find(p => p.id === contractForm.projectId);
        setContracts(prev => prev.map(c => c.id === data.id ? { ...data, projectName: proj?.projectName, projectCode: proj?.projectCode, customerName: proj?.customerName } : c));
        alert("Kontrak berhasil diperbarui!");
      } else {
        const res = await fetch("/api/contracts", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contractForm),
        });
        const data = await res.json();
        if (!res.ok) { alert("Error: " + (data.error ?? res.status)); return; }
        const proj = kontrakProjects.find(p => p.id === contractForm.projectId);
        setContracts(prev => [{ ...data, projectName: proj?.projectName, projectCode: proj?.projectCode, customerName: proj?.customerName }, ...prev]);
        alert("Kontrak baru berhasil ditambahkan!");
      }
      setShowContractForm(false);
    } catch (err) { alert("Gagal: " + String(err)); }
    finally { setContractLoading(false); }
  }

  async function handleDeleteContract(id: string) {
    if (!confirm("Yakin hapus kontrak ini? Data terkait mungkin ikut terhapus.")) return;
    try {
      await fetch(`/api/contracts/${id}`, { method: "DELETE" });
      setContracts(prev => prev.filter(c => c.id !== id));
      if (detailContract?.id === id) setDetailContract(null);
    } catch (err) { alert("Gagal menghapus kontrak"); }
  }

  // ================= ACTION SPK =================
  function openAddSpk() {
    setEditPlan(null);
    setSpkContractId("");
    setSpkForm({ targetVolume: "", unit: "pcs", notes: "" });
    setBomItems([{ ...EMPTY_BOM }]);
    setManpowerItems([{ ...EMPTY_MP }]);
    setShowSpkForm(true);
  }

  function openEditSpk(p: Plan) {
    setEditPlan(p);
    setSpkContractId(p.contractId);
    setSpkForm({ targetVolume: String(p.targetVolume), unit: p.unit, notes: p.notes ?? "" });
    // Masukkan data BOM dan MP yang lama dari database ke dalam form edit
    setBomItems(p.bomItems?.length ? p.bomItems : [{ ...EMPTY_BOM }]);
    setManpowerItems(p.manpowerItems?.length ? p.manpowerItems.map(m => ({...m, headcount: String(m.headcount)})) : [{ ...EMPTY_MP }]);
    setShowSpkForm(true);
  }

  async function submitSpk() {
    if (!spkContractId || !spkForm.targetVolume) {
      alert("Kontrak dan target volume wajib diisi!"); return;
    }
    setSpkLoading(true);
    try {
      const validBom = bomItems.filter(b => b.materialName && b.estimatedQty);
      const validMp = manpowerItems.filter(m => m.roleDescription && m.headcount);
      const payload = { 
        contractId: spkContractId, 
        ...spkForm, 
        notes: spkForm.notes === "" ? null : spkForm.notes,
        bomItems: validBom, 
        manpowerItems: validMp 
      };

      if (editPlan) {
        const res = await fetch(`/api/production-plans/${editPlan.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { alert("Error: " + (data.error ?? res.status)); return; }
        const cont = contracts.find(c => c.id === spkContractId);
        setPlans(prev => prev.map(p => p.id === data.id ? { ...data, contractNumber: cont?.contractNumber, projectName: cont?.projectName, projectCode: cont?.projectCode } : p));
        alert("SPK beserta Material dan Manpower berhasil diperbarui!");
      } else {
        const res = await fetch("/api/production-plans", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { alert("Error: " + (data.error ?? res.status)); return; }
        const cont = contracts.find(c => c.id === spkContractId);
        setPlans(prev => [{ ...data, contractNumber: cont?.contractNumber, projectName: cont?.projectName, projectCode: cont?.projectCode }, ...prev]);
        setTab("spk");
        alert("SPK baru berhasil diterbitkan!");
      }
      setShowSpkForm(false);
    } catch (err) { alert("Gagal: " + String(err)); }
    finally { setSpkLoading(false); }
  }

  async function handleDeletePlan(id: string) {
    if (!confirm("Yakin membatalkan/menghapus SPK ini?")) return;
    try {
      await fetch(`/api/production-plans/${id}`, { method: "DELETE" });
      setPlans(prev => prev.filter(p => p.id !== id));
      if (detailPlan?.id === id) setDetailPlan(null);
    } catch (err) { alert("Gagal menghapus SPK"); }
  }

  async function updatePlanStatus(id: string, status: string) {
    const res = await fetch(`/api/production-plans/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setPlans(prev => prev.map(p => p.id === id ? { ...p, status: data.status } : p));
    if (detailPlan?.id === id) setDetailPlan(prev => prev ? { ...prev, status: data.status } : null);
  }

  return (
    <>
      <style>{`
        .prod-wrap { min-height:100vh; background:#0f172a; padding:2rem; }
        .tab-btn { padding:.5rem 1.25rem; border-radius:.6rem; border:1px solid #334155;
          font-size:.85rem; font-weight:600; cursor:pointer; transition:all .15s; background:transparent; }
        .tab-btn.active { background:rgba(74,222,128,0.12); border-color:rgba(74,222,128,0.4); color:#4ade80; }
        .tab-btn:not(.active) { color:#64748b; }
        .tab-btn:not(.active):hover { border-color:#475569; color:#94a3b8; }
        .btn-green { background:#16a34a; color:#fff; border:none; border-radius:.6rem;
          padding:.5rem 1.25rem; font-size:.85rem; font-weight:600; cursor:pointer; transition:background .15s; }
        .btn-green:hover { background:#15803d; }
        .btn-green:disabled { background:#166534; opacity:.6; cursor:not-allowed; }
        .btn-ghost { background:transparent; color:#94a3b8; border:1px solid #334155;
          border-radius:.6rem; padding:.4rem .9rem; font-size:.8rem; cursor:pointer; transition:all .15s; }
        .btn-ghost:hover { border-color:#4ade80; color:#4ade80; }
        .btn-sm { background:transparent; color:#64748b; border:1px solid #334155;
          border-radius:.5rem; padding:.25rem .6rem; font-size:.75rem; cursor:pointer; transition:all .15s; }
        .btn-sm:hover { border-color:#4ade80; color:#4ade80; }
        .btn-danger { background:transparent; color:#f87171; border:1px solid rgba(248,113,113,.25);
          border-radius:.5rem; padding:.25rem .6rem; font-size:.75rem; cursor:pointer; transition:all .15s;}
        .btn-danger:hover { background:rgba(248,113,113,.15); }
        .tbl-row:hover { background:#162032; }
        .inp { width:100%; background:#1e293b; border:1px solid #334155; border-radius:.6rem;
          color:#f1f5f9; font-size:.875rem; padding:.55rem .85rem; outline:none; transition:border-color .15s; box-sizing:border-box; }
        .inp:focus { border-color:#4ade80; }
        .inp::placeholder { color:#475569; }
        .inp-sm { background:#0f172a; border:1px solid #334155; border-radius:.5rem;
          color:#f1f5f9; font-size:.8rem; padding:.4rem .6rem; outline:none; width:100%; box-sizing:border-box; }
        .inp-sm:focus { border-color:#4ade80; }
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); z-index:50;
          display:flex; align-items:flex-start; justify-content:center; padding:2rem 1rem; overflow-y:auto; }
        .modal { background:#1e293b; border:1px solid #334155; border-radius:1.25rem;
          width:100%; max-width:680px; padding:2rem; margin:auto; }
        .modal-lg { max-width:820px; }
        .label { font-size:.78rem; color:#64748b; margin-bottom:.3rem; display:block; font-weight:500; }
        .section-head { color:#64748b; font-size:.75rem; font-weight:700; text-transform:uppercase;
          letter-spacing:.06em; margin:1.25rem 0 .6rem; padding-bottom:.4rem; border-bottom:1px solid #334155; }
        .detail-panel { position:fixed; right:0; top:0; height:100vh; width:450px;
          background:#1e293b; border-left:1px solid #334155; overflow-y:auto;
          padding:1.75rem; z-index:40; }
        .badge { display:inline-flex; align-items:center; padding:.2rem .65rem;
          border-radius:999px; font-size:.72rem; font-weight:700; border:1px solid; }
        .empty-state { padding:3rem; text-align:center; color:#475569; }
        .bom-row { display:grid; grid-template-columns:2fr 1fr 1fr 1.5fr 1fr auto; gap:.4rem; align-items:center; }
        .mp-row { display:grid; grid-template-columns:1.5fr 1fr 2fr 1fr auto; gap:.4rem; align-items:center; }
      `}</style>

      <div className="prod-wrap">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.5rem" }}>
          <div>
            <h1 style={{ color:"#f1f5f9", fontSize:"1.4rem", fontWeight:700, margin:0 }}>Rencana Produksi</h1>
            <p style={{ color:"#64748b", fontSize:".85rem", margin:".25rem 0 0" }}>Kelola kontrak dan Surat Perintah Kerja (SPK)</p>
          </div>
          <div style={{ display:"flex", gap:".75rem" }}>
            <button className="btn-ghost" onClick={openAddContract}>+ Input Kontrak</button>
            <button className="btn-green" onClick={openAddSpk}>+ Buat SPK</button>
          </div>
        </div>

        <div style={{ display:"flex", gap:"1rem", marginBottom:"1.5rem", flexWrap:"wrap" }}>
          {[
            { label: "Proyek Kontrak", value: kontrakProjects.length, color: "#4ade80" },
            { label: "Total Kontrak", value: contracts.length, color: "#60a5fa" },
            { label: "SPK Aktif", value: plans.filter(p => p.status === "AKTIF").length, color: "#fbbf24" },
            { label: "SPK Selesai", value: plans.filter(p => p.status === "SELESAI").length, color: "#34d399" },
          ].map(s => (
            <div key={s.label} style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:".75rem",
              padding:".9rem 1.25rem", minWidth:140 }}>
              <div style={{ color: s.color, fontSize:"1.6rem", fontWeight:700 }}>{s.value}</div>
              <div style={{ color:"#64748b", fontSize:".78rem", marginTop:".15rem" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem", gap:"1rem", flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:".5rem" }}>
            <button className={`tab-btn ${tab === "contracts" ? "active" : ""}`} onClick={() => setTab("contracts")}>
              Kontrak ({contracts.length})
            </button>
            <button className={`tab-btn ${tab === "spk" ? "active" : ""}`} onClick={() => setTab("spk")}>
              SPK / Rencana Produksi ({plans.length})
            </button>
          </div>
          <div style={{ position:"relative", minWidth:260 }}>
            <svg style={{ position:"absolute", left:".75rem", top:"50%", transform:"translateY(-50%)" }}
              width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
            </svg>
            <input className="inp" style={{ paddingLeft:"2.25rem" }}
              placeholder={tab === "contracts" ? "Cari kontrak / proyek..." : "Cari SPK / proyek..."}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* ===== TAB: CONTRACTS ===== */}
        {tab === "contracts" && (
          <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"1rem", overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".85rem" }}>
                <thead>
                  <tr style={{ background:"#162032", borderBottom:"1px solid #334155" }}>
                    {["No. Kontrak","Proyek","Customer","Nilai Kontrak","Mulai","Selesai","Aksi"].map(h => (
                      <th key={h} style={{ padding:".75rem 1rem", color:"#64748b", fontWeight:600, fontSize:".75rem", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.length === 0 && (
                    <tr><td colSpan={7} className="empty-state">
                      {kontrakProjects.length === 0
                        ? "Belum ada proyek berstatus KONTRAK. Ubah status proyek di CRM terlebih dahulu."
                        : "Belum ada kontrak. Klik + Input Kontrak untuk menambah."}
                    </td></tr>
                  )}
                  {filteredContracts.map(c => (
                    <tr key={c.id} className="tbl-row" style={{ borderBottom:"1px solid #1a2744", transition:"background .12s" }}>
                      <td style={{ padding:".7rem 1rem", color:"#4ade80", fontFamily:"monospace", fontSize:".82rem", fontWeight:600 }}>{c.contractNumber}</td>
                      <td style={{ padding:".7rem 1rem" }}>
                        <div style={{ color:"#f1f5f9", fontWeight:600 }}>{c.projectName ?? "-"}</div>
                        <div style={{ color:"#64748b", fontSize:".75rem" }}>{c.projectCode ?? ""}</div>
                      </td>
                      <td style={{ padding:".7rem 1rem", color:"#94a3b8" }}>{c.customerName ?? "-"}</td>
                      <td style={{ padding:".7rem 1rem", color:"#4ade80", fontWeight:600, whiteSpace:"nowrap" }}>{fmt(c.contractValue)}</td>
                      <td style={{ padding:".7rem 1rem", color:"#94a3b8", whiteSpace:"nowrap", fontSize:".8rem" }}>{fmtDate(c.startDate)}</td>
                      <td style={{ padding:".7rem 1rem", color:"#94a3b8", whiteSpace:"nowrap", fontSize:".8rem" }}>{fmtDate(c.endDate)}</td>
                      <td style={{ padding:".7rem 1rem" }}>
                        <div style={{ display:"flex", gap:".4rem", alignItems:"center" }}>
                          <button className="btn-sm" onClick={() => { setSpkContractId(c.id); openAddSpk(); }}>+ SPK</button>
                          <button className="btn-ghost" onClick={() => setDetailContract(c)}>Detail</button>
                          <button className="btn-ghost" onClick={() => openEditContract(c)}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding:".65rem 1rem", borderTop:"1px solid #334155", color:"#64748b", fontSize:".75rem" }}>
              {filteredContracts.length} dari {contracts.length} kontrak
            </div>
          </div>
        )}

        {/* ===== TAB: SPK ===== */}
        {tab === "spk" && (
          <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:"1rem", overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".85rem" }}>
                <thead>
                  <tr style={{ background:"#162032", borderBottom:"1px solid #334155" }}>
                    {["No. SPK","Proyek / Kontrak","Target Volume","Mulai","Deadline","Status","Aksi"].map(h => (
                      <th key={h} style={{ padding:".75rem 1rem", color:"#64748b", fontWeight:600, fontSize:".75rem", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.length === 0 && (
                    <tr><td colSpan={7} className="empty-state">
                      Belum ada SPK. Buat kontrak terlebih dahulu lalu klik + Buat SPK.
                    </td></tr>
                  )}
                  {filteredPlans.map(p => {
                    const st = PLAN_STATUS[p.status] ?? PLAN_STATUS.DRAFT;
                    return (
                      <tr key={p.id} className="tbl-row" style={{ borderBottom:"1px solid #1a2744", transition:"background .12s" }}>
                        <td style={{ padding:".7rem 1rem", color:"#60a5fa", fontFamily:"monospace", fontSize:".82rem", fontWeight:600 }}>
                          <button onClick={() => setDetailPlan(p)}
                            style={{ background:"none", border:"none", color:"#60a5fa", cursor:"pointer", fontFamily:"monospace", fontSize:".82rem", fontWeight:600, padding:0 }}>
                            {p.spkNumber ?? "-"}
                          </button>
                        </td>
                        <td style={{ padding:".7rem 1rem" }}>
                          <div style={{ color:"#f1f5f9", fontWeight:600 }}>{p.projectName ?? "-"}</div>
                          <div style={{ color:"#64748b", fontSize:".75rem" }}>Kontrak: {p.contractNumber ?? "-"}</div>
                        </td>
                        <td style={{ padding:".7rem 1rem", color:"#e2e8f0", whiteSpace:"nowrap" }}>
                          {Number(p.targetVolume).toLocaleString("id-ID")} {p.unit}
                        </td>
                        <td style={{ padding:".7rem 1rem", color:"#94a3b8", whiteSpace:"nowrap", fontSize:".8rem" }}>{fmtDate(p.commenceDate)}</td>
                        <td style={{ padding:".7rem 1rem", color:"#94a3b8", whiteSpace:"nowrap", fontSize:".8rem" }}>{fmtDate(p.deadlineDate)}</td>
                        <td style={{ padding:".7rem 1rem" }}>
                          <select
                            style={{ background: st.bg, color: st.color, border:`1px solid ${st.border}`,
                              borderRadius:".5rem", fontSize:".78rem", padding:".25rem .5rem", outline:"none", cursor:"pointer" }}
                            value={p.status}
                            onChange={e => updatePlanStatus(p.id, e.target.value)}>
                            {Object.entries(PLAN_STATUS).map(([k, v]) => (
                              <option key={k} value={k} style={{ background:"#1e293b", color:"#f1f5f9" }}>{v.label}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding:".7rem 1rem" }}>
                          <div style={{ display:"flex", gap:".4rem" }}>
                            <button className="btn-sm" onClick={() => setDetailPlan(p)}>Detail</button>
                            <button className="btn-ghost" onClick={() => openEditSpk(p)}>Edit</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding:".65rem 1rem", borderTop:"1px solid #334155", color:"#64748b", fontSize:".75rem" }}>
              {filteredPlans.length} dari {plans.length} SPK
            </div>
          </div>
        )}
      </div>

      {/* ===== FORM: INPUT KONTRAK ===== */}
      {showContractForm && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowContractForm(false)}>
          <div className="modal">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
              <h2 style={{ color:"#f1f5f9", fontSize:"1.1rem", fontWeight:700, margin:0 }}>
                {editContract ? "Edit Data Kontrak" : "Input Data Kontrak"}
              </h2>
              <button onClick={() => setShowContractForm(false)} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:"1.2rem" }}>✕</button>
            </div>

            {kontrakProjects.length === 0 ? (
              <div style={{ padding:"2rem", textAlign:"center", color:"#64748b" }}>
                <p>Belum ada proyek dengan status <strong style={{ color:"#4ade80" }}>KONTRAK</strong>.</p>
                <p style={{ fontSize:".85rem", marginTop:".5rem" }}>Ubah status proyek di halaman CRM terlebih dahulu.</p>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <label className="label">Pilih Proyek (Status: Kontrak) *</label>
                  <select className="inp" value={contractForm.projectId} disabled={!!editContract}
                    onChange={e => setContractForm({ ...contractForm, projectId: e.target.value })}
                    style={{ opacity: editContract ? 0.7 : 1 }}>
                    <option value="">-- Pilih Proyek --</option>
                    {kontrakProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.projectCode ? `[${p.projectCode}] ` : ""}{p.projectName} — {p.customerName}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label className="label">Nomor Kontrak *</label>
                  <input className="inp" placeholder="Contoh: KTR-2026-001"
                    value={contractForm.contractNumber} onChange={e => setContractForm({ ...contractForm, contractNumber: e.target.value })} />
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label className="label">Nilai Kontrak (Rp) *</label>
                  <input className="inp" type="number" placeholder="Contoh: 750000000"
                    value={contractForm.contractValue} onChange={e => setContractForm({ ...contractForm, contractValue: e.target.value })} />
                </div>
                
                <div style={{ gridColumn:"1/-1" }}>
                   <p style={{ fontSize:".7rem", color:"#94a3b8", fontStyle:"italic" }}>* Tanggal Kontrak otomatis menyesuaikan dengan Tanggal Proyek.</p>
                </div>

                <div style={{ gridColumn:"1/-1" }}>
                  <label className="label">Catatan Tambahan</label>
                  <textarea className="inp" rows={2} value={contractForm.notes}
                    onChange={e => setContractForm({ ...contractForm, notes: e.target.value })}
                    style={{ resize:"vertical" }} />
                </div>
              </div>
            )}

            {kontrakProjects.length > 0 && (
              <div style={{ display:"flex", gap:".75rem", justifyContent:"flex-end", marginTop:"1.5rem" }}>
                <button className="btn-ghost" onClick={() => setShowContractForm(false)}>Batal</button>
                <button className="btn-green" onClick={submitContract} disabled={contractLoading}>
                  {contractLoading ? "Menyimpan..." : editContract ? "Simpan Perubahan" : "Simpan Kontrak"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== FORM: BUAT / EDIT SPK ===== */}
      {showSpkForm && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowSpkForm(false)}>
          <div className={`modal modal-lg`}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
              <h2 style={{ color:"#f1f5f9", fontSize:"1.1rem", fontWeight:700, margin:0 }}>
                {editPlan ? "Edit SPK (Surat Perintah Kerja)" : "Buat SPK Baru"}
              </h2>
              <button onClick={() => setShowSpkForm(false)} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:"1.2rem" }}>✕</button>
            </div>

            {contracts.length === 0 ? (
              <div style={{ padding:"2rem", textAlign:"center", color:"#64748b" }}>
                Belum ada kontrak. Input kontrak terlebih dahulu.
              </div>
            ) : (
              <>
                <div style={{ marginBottom:"1rem" }}>
                  <label className="label">Pilih Kontrak Induk *</label>
                  <select className="inp" value={spkContractId} disabled={!!editPlan} 
                    onChange={e => setSpkContractId(e.target.value)}
                    style={{ opacity: editPlan ? 0.7 : 1 }}>
                    <option value="">-- Pilih Kontrak --</option>
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>[{c.contractNumber}] {c.projectName ?? "-"} — {c.customerName ?? "-"}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem", marginBottom:".5rem" }}>
                  <div style={{ gridColumn:"1/3" }}>
                    <label className="label">Target Volume SPK *</label>
                    <input className="inp" type="number" placeholder="Contoh: 1000"
                      value={spkForm.targetVolume} onChange={e => setSpkForm({ ...spkForm, targetVolume: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Satuan *</label>
                    <select className="inp" value={spkForm.unit} onChange={e => setSpkForm({ ...spkForm, unit: e.target.value })}>
                      {["pcs","m3","m2","m","kg","ton","unit","set"].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>

                  <div style={{ gridColumn:"1/-1" }}>
                     <p style={{ fontSize:".7rem", color:"#94a3b8", fontStyle:"italic" }}>* Tanggal Produksi otomatis mengikuti jadwal kontrak/proyek.</p>
                  </div>
                </div>

                {/* FORM BOM & MANPOWER (Sekarang bisa diedit!) */}
                <p className="section-head">Material BOM (Bill of Materials)</p>
                <div style={{ display:"flex", flexDirection:"column", gap:".4rem", marginBottom:".5rem" }}>
                  <div className="bom-row" style={{ marginBottom:".2rem" }}>
                    {["Nama Material","Qty","Satuan","Pengadaan","Harga/Satuan",""].map(h => (
                      <div key={h} style={{ fontSize:".72rem", color:"#64748b", fontWeight:600 }}>{h}</div>
                    ))}
                  </div>
                  {bomItems.map((b, i) => (
                    <div key={i} className="bom-row">
                      <input className="inp-sm" placeholder="Semen, Pasir..." value={b.materialName}
                        onChange={e => { const n=[...bomItems]; n[i].materialName=e.target.value; setBomItems(n); }} />
                      <input className="inp-sm" type="number" placeholder="0" value={b.estimatedQty}
                        onChange={e => { const n=[...bomItems]; n[i].estimatedQty=e.target.value; setBomItems(n); }} />
                      <select className="inp-sm" value={b.unit}
                        onChange={e => { const n=[...bomItems]; n[i].unit=e.target.value; setBomItems(n); }}>
                        {["m3","m2","kg","ton","pcs","zak","liter"].map(u=><option key={u}>{u}</option>)}
                      </select>
                      <select className="inp-sm" value={b.procurementType}
                        onChange={e => { const n=[...bomItems]; n[i].procurementType=e.target.value; setBomItems(n); }}>
                        <option value="BELI_BARU">Beli Baru</option>
                        <option value="STOK_GUDANG">Stok Gudang</option>
                        <option value="SUBKON">Subkon</option>
                      </select>
                      <input className="inp-sm" type="number" placeholder="0" value={b.unitPrice}
                        onChange={e => { const n=[...bomItems]; n[i].unitPrice=e.target.value; setBomItems(n); }} />
                      <button onClick={() => setBomItems(bomItems.filter((_,j)=>j!==i))}
                        style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:"1rem", padding:"0 .25rem" }}>✕</button>
                    </div>
                  ))}
                  <button className="btn-sm" style={{ alignSelf:"flex-start" }} onClick={() => setBomItems([...bomItems, { ...EMPTY_BOM }])}>
                    + Tambah Material
                  </button>
                </div>

                <p className="section-head">Rencana Manpower</p>
                <div style={{ display:"flex", flexDirection:"column", gap:".4rem", marginBottom:".5rem" }}>
                  <div className="mp-row" style={{ marginBottom:".2rem" }}>
                    {["Sumber","Jumlah","Posisi / Peran","Rate/Hari",""].map(h => (
                      <div key={h} style={{ fontSize:".72rem", color:"#64748b", fontWeight:600 }}>{h}</div>
                    ))}
                  </div>
                  {manpowerItems.map((m, i) => (
                    <div key={i} className="mp-row">
                      <select className="inp-sm" value={m.sourceType}
                        onChange={e => { const n=[...manpowerItems]; n[i].sourceType=e.target.value; setManpowerItems(n); }}>
                        <option value="INTERNAL">Internal</option>
                        <option value="SUBKON">Subkon</option>
                      </select>
                      <input className="inp-sm" type="number" placeholder="0" value={m.headcount}
                        onChange={e => { const n=[...manpowerItems]; n[i].headcount=e.target.value; setManpowerItems(n); }} />
                      <input className="inp-sm" placeholder="Operator..." value={m.roleDescription}
                        onChange={e => { const n=[...manpowerItems]; n[i].roleDescription=e.target.value; setManpowerItems(n); }} />
                      <input className="inp-sm" type="number" placeholder="0" value={m.dailyRate}
                        onChange={e => { const n=[...manpowerItems]; n[i].dailyRate=e.target.value; setManpowerItems(n); }} />
                      <button onClick={() => setManpowerItems(manpowerItems.filter((_,j)=>j!==i))}
                        style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:"1rem", padding:"0 .25rem" }}>✕</button>
                    </div>
                  ))}
                  <button className="btn-sm" style={{ alignSelf:"flex-start" }} onClick={() => setManpowerItems([...manpowerItems, { ...EMPTY_MP }])}>
                    + Tambah Manpower
                  </button>
                </div>

                <div style={{ marginTop:"1rem" }}>
                  <label className="label">Catatan SPK</label>
                  <textarea className="inp" rows={2} value={spkForm.notes}
                    onChange={e => setSpkForm({ ...spkForm, notes: e.target.value })} style={{ resize:"vertical" }} />
                </div>

                <div style={{ display:"flex", gap:".75rem", justifyContent:"flex-end", marginTop:"1.5rem" }}>
                  <button className="btn-ghost" onClick={() => setShowSpkForm(false)}>Batal</button>
                  <button className="btn-green" onClick={submitSpk} disabled={spkLoading}>
                    {spkLoading ? "Menyimpan..." : editPlan ? "Simpan Perubahan SPK" : "Terbitkan SPK"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== DETAIL PANEL KONTRAK ===== */}
      {detailContract && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:39 }} onClick={() => setDetailContract(null)} />
          <div className="detail-panel">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.25rem" }}>
              <div>
                <div style={{ color:"#64748b", fontSize:".75rem", fontFamily:"monospace" }}>{detailContract.contractNumber}</div>
                <h2 style={{ color:"#f1f5f9", fontSize:"1.05rem", fontWeight:700, margin:".2rem 0 0" }}>{detailContract.projectName ?? "-"}</h2>
              </div>
              <button onClick={() => setDetailContract(null)} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:"1.2rem", flexShrink:0 }}>✕</button>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:".75rem" }}>
              {[
                { label: "Customer", value: detailContract.customerName ?? "-" },
                { label: "Nilai Kontrak", value: fmt(detailContract.contractValue) },
                { label: "Tanggal Mulai", value: fmtDate(detailContract.startDate) },
                { label: "Tanggal Selesai", value: fmtDate(detailContract.endDate) },
                { label: "Dibuat", value: fmtDate(detailContract.createdAt) },
              ].map(({ label, value }) => (
                <div key={label} style={{ borderBottom:"1px solid #334155", paddingBottom:".65rem" }}>
                  <div style={{ color:"#64748b", fontSize:".73rem", marginBottom:".15rem" }}>{label}</div>
                  <div style={{ color:"#e2e8f0", fontSize:".875rem" }}>{value}</div>
                </div>
              ))}
              {detailContract.notes && (
                <div>
                  <div style={{ color:"#64748b", fontSize:".73rem", marginBottom:".3rem" }}>Catatan</div>
                  <div style={{ background:"#0f172a", borderRadius:".5rem", padding:".65rem", color:"#94a3b8", fontSize:".83rem", lineHeight:1.6 }}>
                    {detailContract.notes}
                  </div>
                </div>
              )}
            </div>

            {session?.role === "admin" && (
              <div style={{ marginTop: "2rem" }}>
                <button className="btn-danger" style={{ width: "100%", padding: ".7rem" }} onClick={() => handleDeleteContract(detailContract.id)}>
                  Hapus Data Kontrak
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== DETAIL PANEL SPK (FULL MATERIAL) ===== */}
      {detailPlan && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:39 }} onClick={() => setDetailPlan(null)} />
          <div className="detail-panel">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.25rem" }}>
              <div>
                <div style={{ color:"#64748b", fontSize:".75rem", fontFamily:"monospace" }}>{detailPlan.spkNumber}</div>
                <h2 style={{ color:"#f1f5f9", fontSize:"1.05rem", fontWeight:700, margin:".2rem 0 0" }}>{detailPlan.projectName ?? "-"}</h2>
              </div>
              <button onClick={() => setDetailPlan(null)} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:"1.2rem", flexShrink:0 }}>✕</button>
            </div>

            <div style={{ display:"flex", flexWrap:"wrap", gap:".4rem", marginBottom:"1.25rem" }}>
              {Object.entries(PLAN_STATUS).map(([k, v]) => {
                const isActive = detailPlan.status === k;
                return (
                  <button key={k} onClick={() => updatePlanStatus(detailPlan.id, k)}
                    style={{ padding:".3rem .75rem", borderRadius:"999px", border:`1px solid ${isActive ? v.border : "#334155"}`,
                      background: isActive ? v.bg : "transparent", color: isActive ? v.color : "#64748b",
                      fontSize:".75rem", fontWeight:600, cursor:"pointer" }}>
                    {isActive ? "✓ " : ""}{v.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:".75rem" }}>
              {[
                { label: "Kontrak", value: detailPlan.contractNumber ?? "-" },
                { label: "Target Volume", value: `${Number(detailPlan.targetVolume).toLocaleString("id-ID")} ${detailPlan.unit}` },
                { label: "Commence Date", value: fmtDate(detailPlan.commenceDate) },
                { label: "Deadline", value: fmtDate(detailPlan.deadlineDate) },
                { label: "Dibuat", value: fmtDate(detailPlan.createdAt) },
              ].map(({ label, value }) => (
                <div key={label} style={{ borderBottom:"1px solid #334155", paddingBottom:".65rem" }}>
                  <div style={{ color:"#64748b", fontSize:".73rem", marginBottom:".15rem" }}>{label}</div>
                  <div style={{ color:"#e2e8f0", fontSize:".875rem" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* TABEL MATERIAL BOM */}
            {detailPlan.bomItems && detailPlan.bomItems.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ color:"#64748b", fontSize:".75rem", fontWeight:700, textTransform:"uppercase", marginBottom:".5rem" }}>Daftar Material (BOM)</div>
                  <div style={{ background:"#0f172a", borderRadius:".5rem", overflow:"hidden" }}>
                     <table style={{ width:"100%", fontSize:".75rem", color:"#cbd5e1", borderCollapse:"collapse" }}>
                        <thead>
                          <tr style={{ background:"#162032", borderBottom:"1px solid #334155" }}>
                             <th style={{ padding:".5rem", textAlign:"left" }}>Material</th>
                             <th style={{ padding:".5rem", textAlign:"center" }}>Qty</th>
                             <th style={{ padding:".5rem", textAlign:"center" }}>Pengadaan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailPlan.bomItems.map((b, i) => (
                             <tr key={i} style={{ borderBottom:"1px solid #1e293b" }}>
                                <td style={{ padding:".5rem" }}>{b.materialName}</td>
                                <td style={{ padding:".5rem", textAlign:"center" }}>{b.estimatedQty} {b.unit}</td>
                                <td style={{ padding:".5rem", textAlign:"center" }}>
                                  <span style={{ padding:".1rem .3rem", background:"#334155", borderRadius:".2rem", fontSize:".65rem" }}>{b.procurementType}</span>
                                </td>
                             </tr>
                          ))}
                        </tbody>
                     </table>
                  </div>
                </div>
            )}
            
            {/* TABEL MANPOWER */}
            {detailPlan.manpowerItems && detailPlan.manpowerItems.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ color:"#64748b", fontSize:".75rem", fontWeight:700, textTransform:"uppercase", marginBottom:".5rem" }}>Daftar Manpower</div>
                  <div style={{ background:"#0f172a", borderRadius:".5rem", overflow:"hidden" }}>
                     <table style={{ width:"100%", fontSize:".75rem", color:"#cbd5e1", borderCollapse:"collapse" }}>
                        <thead>
                          <tr style={{ background:"#162032", borderBottom:"1px solid #334155" }}>
                             <th style={{ padding:".5rem", textAlign:"left" }}>Posisi / Peran</th>
                             <th style={{ padding:".5rem", textAlign:"center" }}>Jumlah</th>
                             <th style={{ padding:".5rem", textAlign:"center" }}>Sumber</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailPlan.manpowerItems.map((m, i) => (
                             <tr key={i} style={{ borderBottom:"1px solid #1e293b" }}>
                                <td style={{ padding:".5rem" }}>{m.roleDescription}</td>
                                <td style={{ padding:".5rem", textAlign:"center" }}>{m.headcount} Orang</td>
                                <td style={{ padding:".5rem", textAlign:"center" }}>
                                  <span style={{ padding:".1rem .3rem", background:"#334155", borderRadius:".2rem", fontSize:".65rem" }}>{m.sourceType}</span>
                                </td>
                             </tr>
                          ))}
                        </tbody>
                     </table>
                  </div>
                </div>
            )}

            {detailPlan.notes && (
              <div style={{ marginTop:"1rem" }}>
                <div style={{ color:"#64748b", fontSize:".73rem", marginBottom:".3rem" }}>Catatan Tambahan</div>
                <div style={{ background:"#0f172a", borderRadius:".5rem", padding:".65rem", color:"#94a3b8", fontSize:".83rem", lineHeight:1.6 }}>
                  {detailPlan.notes}
                </div>
              </div>
            )}

            {session?.role === "admin" && (
              <div style={{ marginTop: "2rem" }}>
                <button className="btn-danger" style={{ width: "100%", padding: ".7rem" }} onClick={() => handleDeletePlan(detailPlan.id)}>
                  Batalkan / Hapus SPK
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}