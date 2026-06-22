"use client";

import { useState, useMemo } from "react";
import type { SessionPayload } from "@/lib/auth";
import { AlertTriangle, CheckCircle2, XCircle, FileText, Check, Ban, Eye, Edit3, Trash2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

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

type MasterMaterial = { id: string; name: string; unit: string; category: string | null };
type BomItem = { materialId?: string; materialName: string; estimatedQty: string; unit: string; procurementType: string; unitPrice: string; notes?: string };
type ManpowerItem = { sourceType: string; headcount: string | number; roleDescription: string; dailyRate: string; notes?: string };

type Rab = {
  id: string; contractId: string; rabNumber: string;
  targetVolume: number; unit: string;
  depreciationMethod: string; depreciationValue: string;
  fixedCostMethod: string; fixedCostValue: string;
  overheadHo: string; status: string; notes: string | null; createdAt: string | null;
  projectName?: string | null; projectCode?: string | null; customerName?: string | null;
  contractNumber?: string | null; contractValue?: string | null;
  bomItems?: BomItem[];
  manpowerItems?: ManpowerItem[];
};

type Plan = {
  id: string; contractId: string; rabId: string | null; spkNumber: string | null;
  targetVolume: number; unit: string; overheadPercentage?: number;
  commenceDate: string; deadlineDate: string;
  status: string; notes: string | null; createdAt: string | null;
  contractNumber?: string | null; projectName?: string | null; projectCode?: string | null;
  rabNumber?: string | null;
  bomItems?: BomItem[];
  manpowerItems?: ManpowerItem[];
};

const PLAN_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:   { label: "Draft",   color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" },
  AKTIF:   { label: "Aktif",   color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  SELESAI: { label: "Selesai", color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" },
  BATAL:   { label: "Batal",   color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
};

const RAB_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:    { label: "Draft",    color: "#475569", bg: "#f8fafc", border: "#e2e8f0" },
  APPROVED: { label: "Disetujui", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  REJECTED: { label: "Ditolak",   color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
};

function fmt(val: string | number | null) {
  if (!val) return "Rp 0";
  return "Rp " + Number(val).toLocaleString("id-ID");
}

function fmtDate(val: string | null) {
  if (!val) return "-";
  return new Date(val).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const EMPTY_CONTRACT = { projectId: "", contractNumber: "", contractValue: "", notes: "" };
const EMPTY_BOM: BomItem = { materialId: "", materialName: "", estimatedQty: "", unit: "m3", procurementType: "BELI_BARU", unitPrice: "" };
const EMPTY_MP: ManpowerItem = { sourceType: "INTERNAL", headcount: "", roleDescription: "", dailyRate: "" };

export default function ProductionClient({
  kontrakProjects, initialContracts, initialPlans, initialRabs = [], masterMaterials, session,
}: {
  kontrakProjects: Project[];
  initialContracts: Contract[];
  initialPlans: Plan[];
  initialRabs?: Rab[];
  masterMaterials: MasterMaterial[];
  session: SessionPayload | null;
}) {
  const [tab, setTab] = useState<"contracts" | "rab" | "spk">("contracts");
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [rabsState, setRabsState] = useState<Rab[]>(initialRabs);
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [search, setSearch] = useState("");

  // Contract Modal State
  const [showContractForm, setShowContractForm] = useState(false);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [contractForm, setContractForm] = useState(EMPTY_CONTRACT);
  const [contractLoading, setContractLoading] = useState(false);
  const [detailContract, setDetailContract] = useState<Contract | null>(null);

  // RAB Modal State
  const [showRabForm, setShowRabForm] = useState(false);
  const [editRab, setEditRab] = useState<Rab | null>(null);
  const [rabContractId, setRabContractId] = useState("");
  const [rabForm, setRabForm] = useState({
    targetVolume: "", unit: "pcs",
    depreciationMethod: "DIRECT", depreciationValue: "",
    fixedCostMethod: "DIRECT", fixedCostValue: "",
    overheadHo: "", notes: ""
  });
  const [rabBomItems, setRabBomItems] = useState<BomItem[]>([{ ...EMPTY_BOM }]);
  const [rabManpowerItems, setRabManpowerItems] = useState<ManpowerItem[]>([{ ...EMPTY_MP }]);
  const [rabLoading, setRabLoading] = useState(false);
  const [detailRab, setDetailRab] = useState<Rab | null>(null);

  // SPK Modal State
  const [showSpkForm, setShowSpkForm] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [spkContractId, setSpkContractId] = useState("");
  const [spkRabId, setSpkRabId] = useState("");
  const [spkForm, setSpkForm] = useState({ targetVolume: "", unit: "pcs", overheadPercentage: "10", notes: "" });
  const [bomItems, setBomItems] = useState<BomItem[]>([{ ...EMPTY_BOM }]);
  const [manpowerItems, setManpowerItems] = useState<ManpowerItem[]>([{ ...EMPTY_MP }]);
  const [spkLoading, setSpkLoading] = useState(false);
  const [detailPlan, setDetailPlan] = useState<Plan | null>(null);

  // Filtering Lists
  const filteredContracts = useMemo(() => {
    return contracts
      .filter(c =>
        !search || c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
        (c.projectName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.customerName ?? "").toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => (a.customerName || "").localeCompare(b.customerName || ""));
  }, [contracts, search]);

  const filteredRabs = useMemo(() => {
    return rabsState
      .filter(r =>
        !search || r.rabNumber.toLowerCase().includes(search.toLowerCase()) ||
        (r.projectName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (r.customerName ?? "").toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => (a.projectName || "").localeCompare(b.projectName || ""));
  }, [rabsState, search]);

  const filteredPlans = useMemo(() => {
    return plans
      .filter(p =>
        !search || (p.spkNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (p.projectName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (p.contractNumber ?? "").toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => (a.projectName || "").localeCompare(b.projectName || ""));
  }, [plans, search]);

  // Selected Contract Info for RAB Real-time calculations
  const selectedContractForRab = useMemo(() => {
    return contracts.find(c => c.id === rabContractId) || null;
  }, [contracts, rabContractId]);

  // Calculate Real-time HPP and costs in RAB Form
  const rabFormCalcs = useMemo(() => {
    const vol = Number(rabForm.targetVolume) || 1;
    
    // 1. BOM Cost
    const bomTotal = rabBomItems.reduce((sum, item) => {
      const q = parseFloat(item.estimatedQty) || 0;
      const p = parseFloat(item.unitPrice) || 0;
      return sum + (q * p);
    }, 0);

    // 2. Manpower Cost (standard formula: headcount * rate * 30 days)
    const mpTotal = rabManpowerItems.reduce((sum, item) => {
      const hc = parseFloat(String(item.headcount)) || 0;
      const rate = parseFloat(item.dailyRate) || 0;
      return sum + (hc * rate * 30);
    }, 0);

    // 3. Variable Cost (BOM + Manpower)
    const variableCost = bomTotal + mpTotal;

    // 4. Fixed Cost
    let fixedCost = 0;
    const fcVal = parseFloat(rabForm.fixedCostValue) || 0;
    if (rabForm.fixedCostMethod === "DIRECT") {
      fixedCost = fcVal;
    } else {
      fixedCost = fcVal * vol;
    }

    // 5. Depreciation Cost
    let depreciation = 0;
    const depVal = parseFloat(rabForm.depreciationValue) || 0;
    if (rabForm.depreciationMethod === "DIRECT") {
      depreciation = depVal;
    } else {
      // Calculate duration of contract in days
      let days = 30;
      if (selectedContractForRab && selectedContractForRab.startDate && selectedContractForRab.endDate) {
        const diff = new Date(selectedContractForRab.endDate).getTime() - new Date(selectedContractForRab.startDate).getTime();
        days = Math.ceil(diff / (1000 * 60 * 60 * 24)) || 30;
      }
      depreciation = depVal * days;
    }

    // 6. Overhead HO
    const ohHO = parseFloat(rabForm.overheadHo) || 0;

    // 7. Full Cost
    const fullCost = variableCost + fixedCost + depreciation + ohHO;

    // 8. HPP unit
    const hppUnit = fullCost / vol;

    // 9. Contract Price per unit
    let sellPriceUnit = 0;
    if (selectedContractForRab) {
      sellPriceUnit = Number(selectedContractForRab.contractValue) / vol;
    }

    const isLoss = hppUnit > sellPriceUnit && sellPriceUnit > 0;

    return {
      bomTotal,
      mpTotal,
      variableCost,
      fixedCost,
      depreciation,
      fullCost,
      hppUnit,
      sellPriceUnit,
      isLoss
    };
  }, [rabForm, rabBomItems, rabManpowerItems, selectedContractForRab]);

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
    if (!confirm("Yakin hapus kontrak ini? Data terkait (RAB, SPK) mungkin ikut terhapus.")) return;
    try {
      const res = await fetch(`/api/contracts/${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.details || data.error || "Gagal hapus kontrak!");
      
      setContracts(prev => prev.filter(c => c.id !== id));
      setRabsState(prev => prev.filter(r => r.contractId !== id));
      setPlans(prev => prev.filter(p => p.contractId !== id));
      if (detailContract?.id === id) setDetailContract(null);
      alert("✅ Kontrak berhasil dihapus!");
    } catch (err: any) { 
      alert("💥 Error: " + err.message); 
    }
  }

  // ================= ACTION RAB =================
  function openAddRab(contractId: string) {
    setEditRab(null);
    setRabContractId(contractId);
    setRabForm({
      targetVolume: "", unit: "pcs",
      depreciationMethod: "DIRECT", depreciationValue: "0",
      fixedCostMethod: "DIRECT", fixedCostValue: "0",
      overheadHo: "0", notes: ""
    });
    setRabBomItems([{ ...EMPTY_BOM }]);
    setRabManpowerItems([{ ...EMPTY_MP }]);
    setShowRabForm(true);
  }

  function openEditRab(r: Rab) {
    setEditRab(r);
    setRabContractId(r.contractId);
    setRabForm({
      targetVolume: String(r.targetVolume),
      unit: r.unit,
      depreciationMethod: r.depreciationMethod || "DIRECT",
      depreciationValue: String(r.depreciationValue || 0),
      fixedCostMethod: r.fixedCostMethod || "DIRECT",
      fixedCostValue: String(r.fixedCostValue || 0),
      overheadHo: String(r.overheadHo || 0),
      notes: r.notes || ""
    });
    setRabBomItems(r.bomItems?.length ? r.bomItems : [{ ...EMPTY_BOM }]);
    setRabManpowerItems(r.manpowerItems?.length ? r.manpowerItems.map(m => ({ ...m, headcount: String(m.headcount) })) : [{ ...EMPTY_MP }]);
    setShowRabForm(true);
  }

  async function submitRab() {
    if (!rabContractId || !rabForm.targetVolume) {
      alert("Kontrak dan target volume wajib diisi!"); return;
    }
    setRabLoading(true);
    try {
      const validBom = rabBomItems.filter(b => b.materialName && b.estimatedQty);
      const validMp = rabManpowerItems.filter(m => m.roleDescription && m.headcount);
      const payload = {
        contractId: rabContractId,
        ...rabForm,
        bomItems: validBom,
        manpowerItems: validMp
      };

      if (editRab) {
        const res = await fetch(`/api/rabs/${editRab.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { alert("Error: " + (data.error ?? res.status)); return; }
        const cont = contracts.find(c => c.id === rabContractId);
        setRabsState(prev => prev.map(r => r.id === data.id ? { ...data, contractNumber: cont?.contractNumber, projectName: cont?.projectName, projectCode: cont?.projectCode, customerName: cont?.customerName } : r));
        alert("RAB berhasil diperbarui!");
      } else {
        const res = await fetch("/api/rabs", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { alert("Error: " + (data.error ?? res.status)); return; }
        const cont = contracts.find(c => c.id === rabContractId);
        setRabsState(prev => [{ ...data, contractNumber: cont?.contractNumber, projectName: cont?.projectName, projectCode: cont?.projectCode, customerName: cont?.customerName }, ...prev]);
        setTab("rab");
        alert("RAB baru berhasil dibuat!");
      }
      setShowRabForm(false);
    } catch (err) { alert("Gagal: " + String(err)); }
    finally { setRabLoading(false); }
  }

  async function handleDeleteRab(id: string) {
    if (!confirm("Yakin menghapus RAB ini?")) return;
    try {
      const res = await fetch(`/api/rabs/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal hapus RAB!");
      setRabsState(prev => prev.filter(r => r.id !== id));
      if (detailRab?.id === id) setDetailRab(null);
      alert("✅ RAB berhasil dihapus!");
    } catch (err: any) { alert("Error: " + err.message); }
  }

  async function updateRabStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/rabs/${id}/approve`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal update status!");
      setRabsState(prev => prev.map(r => r.id === id ? { ...r, status: data.status } : r));
      if (detailRab?.id === id) setDetailRab(prev => prev ? { ...prev, status: data.status } : null);
      alert(`✅ Status RAB berhasil diubah ke: ${status}`);
    } catch (err: any) { alert("Error: " + err.message); }
  }

  // ================= ACTION SPK =================
  async function loadRabDetailsForSpk(rabId: string) {
    if (!rabId) return;
    try {
      const res = await fetch(`/api/rabs/${rabId}`);
      if (!res.ok) throw new Error("Gagal mengambil detail RAB");
      const data = await res.json();
      
      // Update cache in rabsState
      setRabsState(prev => prev.map(r => r.id === rabId ? { ...r, bomItems: data.bomItems, manpowerItems: data.manpowerItems } : r));
      
      // Set table items
      setBomItems(data.bomItems?.length ? data.bomItems : [{ ...EMPTY_BOM }]);
      setManpowerItems(data.manpowerItems?.length ? data.manpowerItems.map((m: any) => ({ ...m, headcount: String(m.headcount) })) : [{ ...EMPTY_MP }]);
    } catch (err) {
      console.error(err);
    }
  }

  function openAddSpk(contractId: string, rab?: Rab) {
    setEditPlan(null);
    setSpkContractId(contractId);
    if (rab) {
      setSpkRabId(rab.id);
      setSpkForm({
        targetVolume: String(rab.targetVolume),
        unit: rab.unit,
        overheadPercentage: "10",
        notes: ""
      });
      // Copy BOM & Manpower directly from RAB!
      setBomItems(rab.bomItems?.length ? rab.bomItems : [{ ...EMPTY_BOM }]);
      setManpowerItems(rab.manpowerItems?.length ? rab.manpowerItems.map(m => ({ ...m, headcount: String(m.headcount) })) : [{ ...EMPTY_MP }]);
      
      // Async fetch to ensure we have the latest/full details
      loadRabDetailsForSpk(rab.id);
    } else {
      setSpkRabId("");
      setSpkForm({ targetVolume: "", unit: "pcs", overheadPercentage: "10", notes: "" });
      setBomItems([{ ...EMPTY_BOM }]);
      setManpowerItems([{ ...EMPTY_MP }]);
    }
    setShowSpkForm(true);
  }

  function openEditSpk(p: Plan) {
    setEditPlan(p);
    setSpkContractId(p.contractId);
    setSpkRabId(p.rabId || "");
    setSpkForm({ targetVolume: String(p.targetVolume), unit: p.unit, overheadPercentage: String(p.overheadPercentage ?? 10), notes: p.notes ?? "" });
    setBomItems(p.bomItems?.length ? p.bomItems : [{ ...EMPTY_BOM }]);
    setManpowerItems(p.manpowerItems?.length ? p.manpowerItems.map(m => ({ ...m, headcount: String(m.headcount) })) : [{ ...EMPTY_MP }]);
    setShowSpkForm(true);
  }

  async function submitSpk() {
    if (!spkContractId || !spkForm.targetVolume) {
      alert("Kontrak dan target volume wajib diisi!"); return;
    }
    
    // PASTIKAN SPK TERHUBUNG KE APPROVED RAB
    if (!spkRabId) {
      alert("SPK wajib terhubung dengan RAB yang telah disetujui (Approved)!"); return;
    }

    const selectedRab = rabsState.find(r => r.id === spkRabId);
    if (selectedRab && selectedRab.status !== "APPROVED") {
      alert("RAB yang dipilih harus berstatus APPROVED!"); return;
    }

    setSpkLoading(true);
    try {
      const validBom = bomItems.filter(b => b.materialId && b.estimatedQty);
      const validMp = manpowerItems.filter(m => m.roleDescription && m.headcount);
      const payload = {
        contractId: spkContractId,
        rabId: spkRabId,
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
        const associatedRab = rabsState.find(r => r.id === spkRabId);
        setPlans(prev => prev.map(p => p.id === data.id ? { ...data, contractNumber: cont?.contractNumber, projectName: cont?.projectName, projectCode: cont?.projectCode, rabNumber: associatedRab?.rabNumber } : p));
        alert("SPK berhasil diperbarui!");
      } else {
        const res = await fetch("/api/production-plans", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { alert("Error: " + (data.error ?? res.status)); return; }
        const cont = contracts.find(c => c.id === spkContractId);
        const associatedRab = rabsState.find(r => r.id === spkRabId);
        setPlans(prev => [{ ...data, contractNumber: cont?.contractNumber, projectName: cont?.projectName, projectCode: cont?.projectCode, rabNumber: associatedRab?.rabNumber }, ...prev]);
        setTab("spk");
        alert("SPK baru berhasil diterbitkan!");
      }
      setShowSpkForm(false);
    } catch (err) { alert("Gagal: " + String(err)); }
    finally { setSpkLoading(false); }
  }

  async function handleDeletePlan(id: string) {
    if (!confirm("Yakin menghapus SPK ini? Laporan harian dan logistik terkait ikut terhapus.")) return;
    try {
      const res = await fetch(`/api/production-plans/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Gagal hapus SPK!");
      setPlans(prev => prev.filter(p => p.id !== id));
      if (detailPlan?.id === id) setDetailPlan(null);
      alert("✅ SPK berhasil dihapus!");
    } catch (err: any) { alert("Error: " + err.message); }
  }

  async function updatePlanStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/production-plans/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      setPlans(prev => prev.map(p => p.id === id ? { ...p, status: data.status } : p));
      if (detailPlan?.id === id) setDetailPlan(prev => prev ? { ...prev, status: data.status } : null);
    } catch (err) { alert("Gagal ubah status!"); }
  }

  // Get only approved RABs for SPK selection
  const approvedRabsForSpk = useMemo(() => {
    return rabsState.filter(r => r.status === "APPROVED" && r.contractId === spkContractId);
  }, [rabsState, spkContractId]);

  return (
    <div className="p-8 min-h-screen text-slate-800 dark:text-slate-100 bg-background font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Kalla Beton Logo" className="w-9 h-9 object-contain rounded-lg" /> 
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Rencana produksi & anggaran</h1>
            <p className="text-slate-550 dark:text-slate-400 text-xs mt-1">Kelola anggaran RAB proyek, Surat Perintah Kerja (SPK), dan BOM precast</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer" onClick={openAddContract}>
            + Input kontrak baru
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total proyek kontrak", value: kontrakProjects.length, color: "border-emerald-600/20 dark:border-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
          { label: "Total RAB aktif", value: rabsState.length, color: "border-border text-slate-800 dark:text-slate-200" },
          { label: "SPK berjalan", value: plans.filter(p => p.status === "AKTIF").length, color: "border-border text-slate-800 dark:text-slate-200" },
          { label: "SPK selesai", value: plans.filter(p => p.status === "SELESAI").length, color: "border-border text-slate-800 dark:text-slate-200" },
        ].map((s, i) => (
          <div key={i} className={cn("bg-card border rounded-2xl p-5 shadow-sm transition-all", s.color)}>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</div>
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* FILTER & TABS */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-border self-start shrink-0">
          <button className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${tab === "contracts" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-450 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`} onClick={() => setTab("contracts")}>
            Kontrak pelanggan ({contracts.length})
          </button>
          <button className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${tab === "rab" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-455 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`} onClick={() => setTab("rab")}>
            Rencana anggaran (RAB) ({rabsState.length})
          </button>
          <button className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${tab === "spk" ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-455 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`} onClick={() => setTab("spk")}>
            SPK / perintah kerja ({plans.length})
          </button>
        </div>
        <div className="relative min-w-[280px]">
          <input className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-semibold shadow-sm"
            placeholder={tab === "contracts" ? "Cari nomor kontrak / proyek..." : tab === "rab" ? "Cari nomor RAB / proyek..." : "Cari nomor SPK / proyek..."}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* ===== TAB: CONTRACTS ===== */}
      {tab === "contracts" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-border text-slate-500 dark:text-slate-400 font-bold text-xs">
                  {["No. kontrak", "Proyek", "Customer", "Nilai kontrak", "Jadwal", "Aksi"].map(h => (
                    <th key={h} className="p-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredContracts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      Belum ada kontrak terdaftar. Ubah status proyek di CRM ke kontrak terlebih dahulu.
                    </td>
                  </tr>
                )}
                {filteredContracts.map(c => (
                  <tr key={c.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-emerald-700 dark:text-emerald-455">{c.contractNumber}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{c.projectCode ? `[${c.projectCode}] ` : ""}{c.projectName}</div>
                    </td>
                    <td className="p-4 text-slate-650 dark:text-slate-350">{c.customerName || "-"}</td>
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{fmt(c.contractValue)}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(c.startDate)} - {fmtDate(c.endDate)}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {rabsState.some(r => r.contractId === c.id && r.status === "APPROVED") ? (
                          <button className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all text-[11px]"
                            onClick={() => {
                              const approvedRab = rabsState.find(r => r.contractId === c.id && r.status === "APPROVED");
                              openAddSpk(c.id, approvedRab);
                            }}>
                            + Buat SPK
                          </button>
                        ) : (
                          <button className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all text-[11px]"
                            onClick={() => openAddRab(c.id)}>
                            + Buat RAB
                          </button>
                        )}
                        <button className="px-2.5 py-1.5 bg-card text-slate-700 dark:text-slate-300 border border-border hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-bold transition-all text-[11px]" onClick={() => setDetailContract(c)}>
                          Detail
                        </button>
                        <button className="px-2.5 py-1.5 bg-card text-slate-700 dark:text-slate-300 border border-border hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-bold transition-all text-[11px]" onClick={() => openEditContract(c)}>
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== TAB: RAB ===== */}
      {tab === "rab" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-border text-slate-500 dark:text-slate-400 font-bold">
                  {["No. RAB", "Proyek", "Target volume", "Status", "Tanggal dibuat", "Aksi"].map(h => (
                    <th key={h} className="p-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRabs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      Belum ada Rencana Anggaran Biaya (RAB). Masuk ke tab Kontrak dan klik + Buat RAB.
                    </td>
                  </tr>
                )}
                {filteredRabs.map(r => {
                  const st = RAB_STATUS[r.status] ?? RAB_STATUS.DRAFT;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-indigo-700">{r.rabNumber}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{r.projectCode ? `[${r.projectCode}] ` : ""}{r.projectName}</div>
                        <div className="text-slate-500 text-[10px] mt-0.5">Customer: {r.customerName || "-"}</div>
                      </td>
                      <td className="p-4 text-slate-700 font-medium">
                        {r.targetVolume?.toLocaleString("id-ID")} {r.unit}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border" style={{ color: st.color, background: st.bg, borderColor: st.border }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">{fmtDate(r.createdAt)}</td>
                      <td className="p-4">
                        <div className="flex gap-1 items-center">
                          <button className="px-2 py-1 bg-card text-slate-700 dark:text-slate-300 border border-border hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-bold transition-all" onClick={() => setDetailRab(r)}>
                            Detail
                          </button>
                          
                          {r.status === "DRAFT" && (
                            <>
                              <button className="px-2 py-1 bg-card text-slate-700 dark:text-slate-300 border border-border hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-bold transition-all" onClick={() => openEditRab(r)}>
                                Edit
                              </button>

                              {/* Tombol Otoritas Manager / Admin */}
                              {session?.role !== "staff" && (
                                <>
                                  <button className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg font-bold transition-all flex items-center gap-1"
                                    onClick={() => updateRabStatus(r.id, "APPROVED")}>
                                    <Check size={12}/> Setujui
                                  </button>
                                  <button className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg font-bold transition-all flex items-center gap-1"
                                    onClick={() => updateRabStatus(r.id, "REJECTED")}>
                                    <Ban size={12}/> Tolak
                                  </button>
                                </>
                              )}
                            </>
                          )}

                          {r.status === "APPROVED" && (
                            <button className="px-2 py-1 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all"
                              onClick={() => openAddSpk(r.contractId, r)}>
                              + Terbitkan SPK
                            </button>
                          )}

                          {session?.role === "admin" && (
                            <button className="p-1 text-slate-400 hover:text-red-600 transition-all" onClick={() => handleDeleteRab(r.id)}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== TAB: SPK ===== */}
      {tab === "spk" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-border text-slate-500 dark:text-slate-400 font-bold">
                  {["No. SPK", "RAB acuan", "Proyek", "Target volume", "Durasi SPK", "Status", "Aksi"].map(h => (
                    <th key={h} className="p-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlans.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      Belum ada SPK terbit. Pastikan RAB disetujui (Approved) lalu terbitkan SPK.
                    </td>
                  </tr>
                )}
                {filteredPlans.map(p => {
                  const st = PLAN_STATUS[p.status] ?? PLAN_STATUS.DRAFT;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-emerald-800">
                        <button className="text-emerald-700 hover:underline text-left font-black" onClick={() => setDetailPlan(p)}>
                          {p.spkNumber || "-"}
                        </button>
                      </td>
                      <td className="p-4 font-mono text-slate-500">{p.rabNumber || "Manual / Lama"}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{p.projectCode ? `[${p.projectCode}] ` : ""}{p.projectName}</div>
                        <div className="text-slate-400 text-[10px] mt-0.5">Kontrak: {p.contractNumber || "-"}</div>
                      </td>
                      <td className="p-4 text-slate-700 font-medium">
                        {p.targetVolume?.toLocaleString("id-ID")} {p.unit}
                      </td>
                      <td className="p-4 text-slate-500 whitespace-nowrap">{fmtDate(p.commenceDate)} - {fmtDate(p.deadlineDate)}</td>
                      <td className="p-4">
                        <select className="border rounded-lg px-2.5 py-1 bg-card text-[11px] font-bold outline-none cursor-pointer"
                          style={{ color: st.color, backgroundColor: st.bg, borderColor: st.border }}
                          value={p.status}
                          onChange={e => updatePlanStatus(p.id, e.target.value)}>
                          {Object.entries(PLAN_STATUS).map(([k, v]) => (
                            <option key={k} value={k} className="bg-card text-foreground">{v.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <button className="px-2 py-1 bg-card text-slate-700 dark:text-slate-300 border border-border hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-bold transition-all" onClick={() => setDetailPlan(p)}>
                            Detail
                          </button>
                          <button className="px-2 py-1 bg-card text-slate-700 dark:text-slate-300 border border-border hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-bold transition-all" onClick={() => openEditSpk(p)}>
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== FORM MODAL: INPUT/EDIT KONTRAK ===== */}
      {showContractForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl w-full max-w-lg p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">{editContract ? "Edit Data Kontrak" : "Input Kontrak Baru"}</h2>
              <button className="text-slate-400 hover:text-slate-600 text-xl font-bold" onClick={() => setShowContractForm(false)}>✕</button>
            </div>

            {kontrakProjects.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <p>Belum ada proyek berstatus <strong className="text-emerald-700">KONTRAK</strong>.</p>
                <p className="mt-1">Silakan ubah status proyek di halaman CRM terlebih dahulu.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Pilih Proyek (Khusus Kontrak) *</label>
                  <select className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-emerald-500"
                    value={contractForm.projectId} disabled={!!editContract}
                    onChange={e => setContractForm({ ...contractForm, projectId: e.target.value })}>
                    <option value="">-- Pilih Proyek --</option>
                    {kontrakProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.projectCode ? `[${p.projectCode}] ` : ""}{p.projectName} — {p.customerName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Nomor Kontrak *</label>
                  <input className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                    placeholder="Contoh: KTR-2026-0001" value={contractForm.contractNumber}
                    onChange={e => setContractForm({ ...contractForm, contractNumber: e.target.value })} />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Nilai Kontrak (Rp) *</label>
                  <input className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                    type="number" placeholder="Contoh: 500000000" value={contractForm.contractValue}
                    onChange={e => setContractForm({ ...contractForm, contractValue: e.target.value })} />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Catatan Tambahan</label>
                  <textarea className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-emerald-500"
                    rows={3} placeholder="Catatan kontrak..." value={contractForm.notes}
                    onChange={e => setContractForm({ ...contractForm, notes: e.target.value })} />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <button className="px-4 py-2 border border-slate-200 text-slate-700 hover:border-slate-300 rounded-xl text-xs font-bold transition-all" onClick={() => setShowContractForm(false)}>
                    Batal
                  </button>
                  <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all" onClick={submitContract} disabled={contractLoading}>
                    {contractLoading ? "Menyimpan..." : "Simpan Kontrak"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== FORM MODAL: BUAT / EDIT RAB (STRUKTUR BIAYA & HPP) ===== */}
      {showRabForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-3xl w-full max-w-4xl p-6 md:p-8 shadow-xl border border-border my-auto max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{editRab ? `Edit RAB: ${editRab.rabNumber}` : "Buat Rencana Anggaran Biaya (RAB)"}</h2>
                {selectedContractForRab && (
                  <p className="text-xs text-slate-500 font-medium">Kontrak: {selectedContractForRab.contractNumber} — {selectedContractForRab.projectCode ? `[${selectedContractForRab.projectCode}] ` : ""}{selectedContractForRab.projectName}</p>
                )}
              </div>
              <button className="text-slate-400 hover:text-slate-600 text-xl font-bold" onClick={() => setShowRabForm(false)}>✕</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              
              {/* WARNING HPP BANNER */}
              {rabFormCalcs.isLoss && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-start gap-3 animate-pulse shrink-0">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <div className="text-xs font-black">🚨 PERINGATAN POTENSI KERUGIAN!</div>
                    <div className="text-[11px] mt-0.5">Estimasi Harga Pokok Produksi (HPP) per unit <b>({fmt(rabFormCalcs.hppUnit)})</b> melebihi Harga Kontrak per unit <b>({fmt(rabFormCalcs.sellPriceUnit)})</b>! Mohon tinjau kembali estimasi anggaran.</div>
                  </div>
                </div>
              )}

              {/* SECTION 1: TARGET VOLUME & SATUAN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Target Volume Produksi *</label>
                  <input className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                    type="number" placeholder="Contoh: 1000" value={rabForm.targetVolume}
                    onChange={e => setRabForm({ ...rabForm, targetVolume: e.target.value })} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Satuan Produk *</label>
                  <select className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-emerald-500"
                    value={rabForm.unit} onChange={e => setRabForm({ ...rabForm, unit: e.target.value })}>
                    {["pcs","m3","m2","m","kg","ton","unit","set"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* SECTION 2: BOM MATERIALS */}
              <div>
                <p className="text-xs font-black text-emerald-700 uppercase tracking-wider border-b border-slate-100 pb-1.5 mb-3">Material BOM (Bill of Materials)</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-1">
                    <div className="col-span-4">Nama Material (Master)</div>
                    <div className="col-span-2">Qty Rencana</div>
                    <div className="col-span-2">Satuan</div>
                    <div className="col-span-2">Harga / Unit (Rp)</div>
                    <div className="col-span-1">Subtotal</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  {rabBomItems.map((b, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <select className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-emerald-500"
                          value={b.materialId || ""}
                          onChange={e => {
                            const n = [...rabBomItems];
                            const selectedMat = masterMaterials.find(mat => mat.id === e.target.value);
                            n[i].materialId = e.target.value;
                            n[i].materialName = selectedMat ? selectedMat.name : "";
                            n[i].unit = selectedMat ? selectedMat.unit : n[i].unit;
                            setRabBomItems(n);
                          }}>
                          <option value="">-- Pilih Material --</option>
                          {masterMaterials.map(mat => (
                            <option key={mat.id} value={mat.id}>{mat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-emerald-500 font-mono text-center"
                          type="number" placeholder="0" value={b.estimatedQty}
                          onChange={e => { const n = [...rabBomItems]; n[i].estimatedQty = e.target.value; setRabBomItems(n); }} />
                      </div>

                      <div className="col-span-2">
                        <input className="w-full bg-slate-100 border border-slate-200 p-2 rounded-lg text-xs text-center font-bold text-slate-500"
                          value={b.unit} disabled title="Satuan master gudang" />
                      </div>

                      <div className="col-span-2">
                        <input className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-emerald-500 font-mono text-right"
                          type="number" placeholder="0" value={b.unitPrice}
                          onChange={e => { const n = [...rabBomItems]; n[i].unitPrice = e.target.value; setRabBomItems(n); }} />
                      </div>

                      <div className="col-span-1 text-[11px] font-mono font-bold text-slate-600 text-right">
                        {((Number(b.estimatedQty) || 0) * (Number(b.unitPrice) || 0)).toLocaleString("id-ID")}
                      </div>

                      <div className="col-span-1 text-center">
                        <button className="text-red-500 hover:text-red-700 font-bold" onClick={() => setRabBomItems(rabBomItems.filter((_, j) => j !== i))}>✕</button>
                      </div>
                    </div>
                  ))}
                  <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-all"
                    onClick={() => setRabBomItems([...rabBomItems, { ...EMPTY_BOM }])}>
                    + Tambah Baris Material
                  </button>
                </div>
              </div>

              {/* SECTION 3: MANPOWER PLANS */}
              <div>
                <p className="text-xs font-black text-emerald-700 uppercase tracking-wider border-b border-slate-100 pb-1.5 mb-3">Rencana Manpower (Upah Kerja Harian)</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-1">
                    <div className="col-span-3">Sumber</div>
                    <div className="col-span-2">Headcount (Orang)</div>
                    <div className="col-span-4">Peran / Posisi</div>
                    <div className="col-span-2">Upah Harian (Rp)</div>
                    <div className="col-span-1"></div>
                  </div>

                  {rabManpowerItems.map((m, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <select className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-emerald-500"
                          value={m.sourceType}
                          onChange={e => { const n = [...rabManpowerItems]; n[i].sourceType = e.target.value; setRabManpowerItems(n); }}>
                          <option value="INTERNAL">Internal (KB)</option>
                          <option value="SUBKON">Subkon</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-emerald-500 font-mono text-center"
                          type="number" placeholder="0" value={m.headcount}
                          onChange={e => { const n = [...rabManpowerItems]; n[i].headcount = e.target.value; setRabManpowerItems(n); }} />
                      </div>

                      <div className="col-span-4">
                        <input className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-emerald-500"
                          placeholder="Operator/Tukang cetak..." value={m.roleDescription}
                          onChange={e => { const n = [...rabManpowerItems]; n[i].roleDescription = e.target.value; setRabManpowerItems(n); }} />
                      </div>

                      <div className="col-span-2">
                        <input className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-emerald-500 font-mono text-right"
                          type="number" placeholder="0" value={m.dailyRate}
                          onChange={e => { const n = [...rabManpowerItems]; n[i].dailyRate = e.target.value; setRabManpowerItems(n); }} />
                      </div>

                      <div className="col-span-1 text-center">
                        <button className="text-red-500 hover:text-red-700 font-bold" onClick={() => setRabManpowerItems(rabManpowerItems.filter((_, j) => j !== i))}>✕</button>
                      </div>
                    </div>
                  ))}
                  <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-all"
                    onClick={() => setRabManpowerItems([...rabManpowerItems, { ...EMPTY_MP }])}>
                    + Tambah Baris Tenaga Kerja
                  </button>
                </div>
              </div>

              {/* SECTION 4: STRUKTUR BIAYA TAMBAHAN (HO, PENYUSUTAN, FIXED COST) */}
              <div>
                <p className="text-xs font-black text-emerald-700 uppercase tracking-wider border-b border-slate-100 pb-1.5 mb-3">Struktur Biaya Operasional (Penyusutan, Fixed Cost & HO)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* PENYUSUTAN */}
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-border space-y-3">
                    <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 block">Biaya penyusutan (depresiasi)</label>
                    <div>
                      <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">Metode perhitungan</label>
                      <select className="w-full bg-card border border-border p-2 rounded-lg text-xs outline-none focus:border-emerald-500 font-bold text-foreground"
                        value={rabForm.depreciationMethod}
                        onChange={e => setRabForm({ ...rabForm, depreciationMethod: e.target.value })}>
                        <option value="DIRECT">Nominal langsung (Proyek)</option>
                        <option value="FORMULA">Formula (Rate / hari)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">
                        {rabForm.depreciationMethod === "DIRECT" ? "Nominal Rupiah (Rp)" : "Rate per hari (Rp)"}
                      </label>
                      <input className="w-full bg-card border border-border p-2 rounded-lg text-xs outline-none focus:border-emerald-500 font-mono text-foreground"
                        type="number" value={rabForm.depreciationValue}
                        onChange={e => setRabForm({ ...rabForm, depreciationValue: e.target.value })} />
                    </div>
                  </div>

                  {/* FIXED COST */}
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-border space-y-3">
                    <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 block">Biaya tetap (fixed cost)</label>
                    <div>
                      <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">Metode perhitungan</label>
                      <select className="w-full bg-card border border-border p-2 rounded-lg text-xs outline-none focus:border-emerald-500 font-bold text-foreground"
                        value={rabForm.fixedCostMethod}
                        onChange={e => setRabForm({ ...rabForm, fixedCostMethod: e.target.value })}>
                        <option value="DIRECT">Nominal langsung (proyek)</option>
                        <option value="FORMULA">Formula (Rate / pcs/M3)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">
                        {rabForm.fixedCostMethod === "DIRECT" ? "Nominal Rupiah (Rp)" : "Rate per unit target (Rp)"}
                      </label>
                      <input className="w-full bg-card border border-border p-2 rounded-lg text-xs outline-none focus:border-emerald-500 font-mono text-foreground"
                        type="number" value={rabForm.fixedCostValue}
                        onChange={e => setRabForm({ ...rabForm, fixedCostValue: e.target.value })} />
                    </div>
                  </div>

                  {/* OVERHEAD HO */}
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-border space-y-3">
                    <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 block">Overhead HO (kantor pusat)</label>
                    <div>
                      <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">Beban overhead HO (Nominal Rp)</label>
                      <input className="w-full bg-card border border-border p-2 rounded-lg text-xs outline-none focus:border-emerald-500 font-mono text-foreground"
                        type="number" placeholder="Contoh: 15000000" value={rabForm.overheadHo}
                        onChange={e => setRabForm({ ...rabForm, overheadHo: e.target.value })} />
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                      Beban overhead kantor pusat dialokasikan secara flat untuk mendukung operasional non-lapangan proyek precast.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 5: RINGKASAN KALKULASI HPP */}
              <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <p className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-3">Hasil Kalkulasi Rencana Anggaran & HPP Unit</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Total Biaya Bahan (BOM)</span>
                    <div className="font-bold font-mono text-slate-800 mt-0.5">{fmt(rabFormCalcs.bomTotal)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Upah Tenaga Kerja</span>
                    <div className="font-bold font-mono text-slate-800 mt-0.5">{fmt(rabFormCalcs.mpTotal)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Biaya Tetap (FC)</span>
                    <div className="font-bold font-mono text-slate-800 mt-0.5">{fmt(rabFormCalcs.fixedCost)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Penyusutan Aset</span>
                    <div className="font-bold font-mono text-slate-800 mt-0.5">{fmt(rabFormCalcs.depreciation)}</div>
                  </div>
                  
                  <div className="col-span-2 border-t border-emerald-200/50 pt-3 mt-1">
                    <span className="text-emerald-800 font-bold uppercase text-[10px]">TOTAL ANGGARAN (FULL COST)</span>
                    <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">{fmt(rabFormCalcs.fullCost)}</div>
                  </div>

                  <div className="border-t border-emerald-200/50 pt-3 mt-1">
                    <span className="text-emerald-800 font-bold uppercase text-[10px]">HARGA POKOK (HPP / UNIT)</span>
                    <div className="text-lg font-black text-emerald-950 font-mono mt-0.5">{fmt(rabFormCalcs.hppUnit)}</div>
                  </div>

                  <div className="border-t border-emerald-200/50 pt-3 mt-1">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">HARGA JUAL / UNIT</span>
                    <div className="text-lg font-black text-slate-800 font-mono mt-0.5">{fmt(rabFormCalcs.sellPriceUnit)}</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Catatan Tambahan RAB</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-emerald-500"
                  rows={2} placeholder="Catatan opsional..." value={rabForm.notes}
                  onChange={e => setRabForm({ ...rabForm, notes: e.target.value })} />
              </div>

            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 mt-4 shrink-0">
              <button className="px-4 py-2 border border-slate-200 text-slate-700 hover:border-slate-300 rounded-xl text-xs font-bold transition-all" onClick={() => setShowRabForm(false)}>
                Batal
              </button>
              <button className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2" onClick={submitRab} disabled={rabLoading}>
                {rabLoading ? "Menyimpan..." : editRab ? "Simpan Perubahan" : "Simpan Anggaran RAB"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== FORM MODAL: BUAT / EDIT SPK (BERDASARKAN RAB APPROVED) ===== */}
      {showSpkForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-3xl w-full max-w-4xl p-6 md:p-8 shadow-xl border border-border my-auto max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="text-lg font-bold text-slate-900">{editPlan ? `Edit SPK: ${editPlan.spkNumber}` : "Terbitkan SPK (Surat Perintah Kerja)"}</h2>
              <button className="text-slate-400 hover:text-slate-600 text-xl font-bold" onClick={() => setShowSpkForm(false)}>✕</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Pilih Kontrak Induk *</label>
                  <select className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-emerald-500"
                    value={spkContractId} disabled={!!editPlan}
                    onChange={e => {
                      setSpkContractId(e.target.value);
                      setSpkRabId("");
                    }}>
                    <option value="">-- Pilih Kontrak --</option>
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>[{c.contractNumber}] {c.projectCode ? `[${c.projectCode}] ` : ""}{c.projectName} — {c.customerName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Pilih Anggaran Acuan (RAB Approved) *</label>
                  <select className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-emerald-500 font-bold text-emerald-800"
                    value={spkRabId} disabled={!!editPlan}
                    onChange={e => {
                      const selectedRabId = e.target.value;
                      setSpkRabId(selectedRabId);
                      const rab = rabsState.find(r => r.id === selectedRabId);
                      if (rab) {
                        setSpkForm({
                          targetVolume: String(rab.targetVolume),
                          unit: rab.unit,
                          overheadPercentage: "10",
                          notes: ""
                        });
                        setBomItems(rab.bomItems?.length ? rab.bomItems : [{ ...EMPTY_BOM }]);
                        setManpowerItems(rab.manpowerItems?.length ? rab.manpowerItems.map(m => ({ ...m, headcount: String(m.headcount) })) : [{ ...EMPTY_MP }]);
                        
                        // Async fetch from database to update/ensure correctness of BOM & Manpower
                        loadRabDetailsForSpk(selectedRabId);
                      }
                    }}>
                    <option value="">-- Pilih RAB Approved --</option>
                    {approvedRabsForSpk.map(r => (
                      <option key={r.id} value={r.id}>[{r.rabNumber}] Vol: {r.targetVolume} {r.unit} - {fmt(r.depreciationValue)}</option>
                    ))}
                  </select>
                  {spkContractId && approvedRabsForSpk.length === 0 && (
                    <span className="text-[10px] text-red-500 font-medium block mt-1">🚨 Kontrak ini belum memiliki RAB berstatus APPROVED! Buat & approve RAB terlebih dahulu.</span>
                  )}
                </div>
              </div>

              {spkRabId && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Target Volume SPK *</label>
                      <input className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                        type="number" value={spkForm.targetVolume}
                        onChange={e => setSpkForm({ ...spkForm, targetVolume: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Satuan *</label>
                      <input className="w-full bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-500 font-bold"
                        value={spkForm.unit} disabled title="Diambil dari RAB acuan" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Overhead Kantor (%) *</label>
                      <input className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                        type="number" value={spkForm.overheadPercentage}
                        onChange={e => setSpkForm({ ...spkForm, overheadPercentage: e.target.value })} />
                    </div>
                  </div>

                  {/* READ ONLY BOM & MANPOWER LIST IN SPK (CONFIRMED FROM RAB) */}
                  <div>
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5 mb-2">BOM Material Terlampir (Dari RAB)</p>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse text-slate-600">
                        <thead>
                          <tr className="font-bold border-b border-slate-200 text-slate-500">
                            <th className="pb-2">Material</th>
                            <th className="pb-2 text-center">Qty Rencana</th>
                            <th className="pb-2 text-center">Pengadaan</th>
                            <th className="pb-2 text-right">Harga Satuan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bomItems.map((b, idx) => (
                            <tr key={idx}>
                              <td className="py-2 font-bold text-slate-800">{b.materialName}</td>
                              <td className="py-2 text-center font-mono">{b.estimatedQty} {b.unit}</td>
                              <td className="py-2 text-center">{b.procurementType}</td>
                              <td className="py-2 text-right font-mono">{fmt(b.unitPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5 mb-2">Manpower Terlampir (Dari RAB)</p>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse text-slate-600">
                        <thead>
                          <tr className="font-bold border-b border-slate-200 text-slate-500">
                            <th className="pb-2">Peran / Posisi</th>
                            <th className="pb-2 text-center">Jumlah Tenaga</th>
                            <th className="pb-2 text-center">Sumber</th>
                            <th className="pb-2 text-right">Rate Harian</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {manpowerItems.map((m, idx) => (
                            <tr key={idx}>
                              <td className="py-2 font-bold text-slate-800">{m.roleDescription}</td>
                              <td className="py-2 text-center font-mono">{m.headcount} Orang</td>
                              <td className="py-2 text-center">{m.sourceType}</td>
                              <td className="py-2 text-right font-mono">{fmt(m.dailyRate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Catatan Tambahan SPK</label>
                    <textarea className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-emerald-500"
                      rows={2} placeholder="Keterangan lapangan..." value={spkForm.notes}
                      onChange={e => setSpkForm({ ...spkForm, notes: e.target.value })} />
                  </div>
                </>
              )}

            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 mt-4 shrink-0">
              <button className="px-4 py-2 border border-slate-200 text-slate-700 hover:border-slate-300 rounded-xl text-xs font-bold transition-all" onClick={() => setShowSpkForm(false)}>
                Batal
              </button>
              {spkRabId && (
                <button className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all" onClick={submitSpk} disabled={spkLoading}>
                  {spkLoading ? "Menyimpan..." : editPlan ? "Simpan Perubahan SPK" : "Terbitkan SPK"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAIL PANEL: KONTRAK ===== */}
      {detailContract && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 z-40" onClick={() => setDetailContract(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-card border-l border-border p-6 shadow-2xl z-50 overflow-y-auto flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">{detailContract.contractNumber}</span>
                <h2 className="text-md font-black text-slate-900 mt-2">{detailContract.projectName}</h2>
              </div>
              <button className="text-slate-400 hover:text-slate-600 font-bold" onClick={() => setDetailContract(null)}>✕</button>
            </div>

            <div className="flex-1 space-y-4 text-xs">
              {[
                { label: "Customer", value: detailContract.customerName ?? "-" },
                { label: "Nilai Kontrak", value: fmt(detailContract.contractValue) },
                { label: "Tanggal Mulai", value: fmtDate(detailContract.startDate) },
                { label: "Tanggal Selesai", value: fmtDate(detailContract.endDate) },
              ].map(({ label, value }) => (
                <div key={label} className="border-b border-slate-100 pb-3">
                  <div className="text-slate-400 text-[10px] font-bold uppercase mb-0.5">{label}</div>
                  <div className="text-slate-800 font-semibold">{value}</div>
                </div>
              ))}

              {detailContract.notes && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">Catatan Tambahan</div>
                  <p className="text-slate-600 leading-normal">{detailContract.notes}</p>
                </div>
              )}
            </div>

            {session?.role === "admin" && (
              <button className="w-full mt-8 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all"
                onClick={() => handleDeleteContract(detailContract.id)}>
                Hapus Data Kontrak
              </button>
            )}
          </div>
        </>
      )}

      {/* ===== DETAIL PANEL: RAB APPROVED ===== */}
      {detailRab && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 z-40" onClick={() => setDetailRab(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-card border-l border-border p-6 shadow-2xl z-50 overflow-y-auto flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">{detailRab.rabNumber}</span>
                <h2 className="text-md font-black text-slate-900 mt-2">{detailRab.projectName}</h2>
              </div>
              <button className="text-slate-400 hover:text-slate-600 font-bold" onClick={() => setDetailRab(null)}>✕</button>
            </div>

            <div className="flex-1 space-y-5 text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-600">Status Persetujuan</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border`}
                  style={{ color: RAB_STATUS[detailRab.status]?.color, background: RAB_STATUS[detailRab.status]?.bg, borderColor: RAB_STATUS[detailRab.status]?.border }}>
                  {RAB_STATUS[detailRab.status]?.label}
                </span>
              </div>

              {[
                { label: "Target Volume", value: `${detailRab.targetVolume?.toLocaleString("id-ID")} ${detailRab.unit}` },
                { label: "Penyusutan", value: `${fmt(detailRab.depreciationValue)} (${detailRab.depreciationMethod})` },
                { label: "Fixed Cost", value: `${fmt(detailRab.fixedCostValue)} (${detailRab.fixedCostMethod})` },
                { label: "Overhead HO", value: fmt(detailRab.overheadHo) },
              ].map(({ label, value }) => (
                <div key={label} className="border-b border-slate-100 pb-3">
                  <div className="text-slate-400 text-[10px] font-bold uppercase mb-0.5">{label}</div>
                  <div className="text-slate-800 font-semibold">{value}</div>
                </div>
              ))}

              {/* BOM Materials */}
              {detailRab.bomItems && detailRab.bomItems.length > 0 && (
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase mb-1.5">Material BOM</div>
                  <div className="bg-slate-50 border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-500">
                        <tr>
                          <th className="p-2">Material</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Harga</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailRab.bomItems.map((b, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-semibold">{b.materialName}</td>
                            <td className="p-2 text-center font-mono">{b.estimatedQty} {b.unit}</td>
                            <td className="p-2 text-right font-mono">{fmt(b.unitPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Manpower */}
              {detailRab.manpowerItems && detailRab.manpowerItems.length > 0 && (
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase mb-1.5">Rencana Manpower</div>
                  <div className="bg-slate-50 border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-500">
                        <tr>
                          <th className="p-2">Peran</th>
                          <th className="p-2 text-center">Jumlah</th>
                          <th className="p-2 text-right">Upah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailRab.manpowerItems.map((m, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-semibold">{m.roleDescription}</td>
                            <td className="p-2 text-center font-mono">{m.headcount} Orang</td>
                            <td className="p-2 text-right font-mono">{fmt(m.dailyRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {session?.role !== "staff" && detailRab.status === "DRAFT" && (
              <div className="grid grid-cols-2 gap-2 mt-6">
                <button className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
                  onClick={() => updateRabStatus(detailRab.id, "APPROVED")}>
                  Setujui RAB
                </button>
                <button className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
                  onClick={() => updateRabStatus(detailRab.id, "REJECTED")}>
                  Tolak RAB
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== DETAIL PANEL: SPK DETAIL ===== */}
      {detailPlan && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 z-40" onClick={() => setDetailPlan(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-card border-l border-border p-6 shadow-2xl z-50 overflow-y-auto flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded">{detailPlan.spkNumber}</span>
                <h2 className="text-md font-black text-slate-900 mt-2">{detailPlan.projectName}</h2>
              </div>
              <button className="text-slate-400 hover:text-slate-600 font-bold" onClick={() => setDetailPlan(null)}>✕</button>
            </div>

            <div className="flex gap-1 mb-5">
              {Object.entries(PLAN_STATUS).map(([k, v]) => {
                const isActive = detailPlan.status === k;
                return (
                  <button key={k} onClick={() => updatePlanStatus(detailPlan.id, k)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                    style={{ color: isActive ? v.color : "#64748b", background: isActive ? v.bg : "transparent", borderColor: isActive ? v.border : "#e2e8f0" }}>
                    {isActive ? "✓ " : ""}{v.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 space-y-4 text-xs">
              {[
                { label: "RAB Acuan", value: detailPlan.rabNumber || "Manual / Lama" },
                { label: "Target Volume", value: `${detailPlan.targetVolume?.toLocaleString("id-ID")} ${detailPlan.unit}` },
                { label: "Overhead Diset", value: `${detailPlan.overheadPercentage}%` },
                { label: "Jadwal", value: `${fmtDate(detailPlan.commenceDate)} - ${fmtDate(detailPlan.deadlineDate)}` },
              ].map(({ label, value }) => (
                <div key={label} className="border-b border-slate-100 pb-3">
                  <div className="text-slate-400 text-[10px] font-bold uppercase mb-0.5">{label}</div>
                  <div className="text-slate-800 font-semibold">{value}</div>
                </div>
              ))}

              {/* BOM Materials */}
              {detailPlan.bomItems && detailPlan.bomItems.length > 0 && (
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase mb-1.5">BOM Material Lapangan</div>
                  <div className="bg-slate-50 border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-500">
                        <tr>
                          <th className="p-2">Material</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Harga</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailPlan.bomItems.map((b, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-semibold">{b.materialName}</td>
                            <td className="p-2 text-center font-mono">{b.estimatedQty} {b.unit}</td>
                            <td className="p-2 text-right font-mono">{fmt(b.unitPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Manpower */}
              {detailPlan.manpowerItems && detailPlan.manpowerItems.length > 0 && (
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase mb-1.5">Tenaga Kerja Lapangan</div>
                  <div className="bg-slate-50 border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-500">
                        <tr>
                          <th className="p-2">Peran</th>
                          <th className="p-2 text-center">Jumlah</th>
                          <th className="p-2 text-right">Upah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailPlan.manpowerItems.map((m, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-semibold">{m.roleDescription}</td>
                            <td className="p-2 text-center font-mono">{m.headcount} Orang</td>
                            <td className="p-2 text-right font-mono">{fmt(m.dailyRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {detailPlan.notes && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">Catatan Tambahan</div>
                  <p className="text-slate-600 leading-normal">{detailPlan.notes}</p>
                </div>
              )}
            </div>

            {session?.role === "admin" && (
              <button className="w-full mt-8 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all"
                onClick={() => handleDeletePlan(detailPlan.id)}>
                Batalkan / Hapus SPK
              </button>
            )}
          </div>
        </>
      )}

    </div>
  );
}