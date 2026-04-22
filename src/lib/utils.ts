import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format Rupiah
export function formatRupiah(amount: number | string | null | undefined): string {
  if (amount == null) return "Rp 0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// Format angka (1000 → 1.000)
export function formatNumber(num: number | null | undefined): string {
  if (num == null) return "0";
  return new Intl.NumberFormat("id-ID").format(num);
}

// Hitung progress produksi (%)
export function calcProgress(currentFG: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(Math.round((currentFG / target) * 100), 100);
}

// Hitung budget utilization (%)
export function calcBudgetUsage(realized: number, planned: number): number {
  if (planned === 0) return 0;
  return Math.round((realized / planned) * 100);
}

// Badge color berdasarkan project status
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    TENDER: "bg-gray-100 text-gray-700",
    PENAWARAN: "bg-blue-100 text-blue-700",
    NEGO: "bg-amber-100 text-amber-700",
    PO: "bg-purple-100 text-purple-700",
    KONTRAK: "bg-emerald-100 text-emerald-700",
    SELESAI: "bg-green-100 text-green-700",
    BATAL: "bg-red-100 text-red-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

// Budget alert level
export function getBudgetAlertLevel(
  usage: number
): "safe" | "warning" | "danger" {
  if (usage >= 100) return "danger";
  if (usage >= 85) return "warning";
  return "safe";
}

// Format tanggal Indonesia
export function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

// Hitung sisa hari dari deadline
export function getDaysRemaining(deadline: string | Date): number {
  const today = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
