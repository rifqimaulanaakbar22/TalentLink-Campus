// Teks dan hitungan untuk Jalur Hemat (pilihan jalur kerja) dan Neraca Token.
// Angka resmi selalu dari GET /api/tokens (Token Ledger); perkiraan PRD hanya dipakai sampai ada data.
import type { RunMode, StepName, TokenReport, TokenUsageView } from "./types";

export const PATH_COPY: Record<RunMode, { name: string; tag: string; how: string }> = {
  v2: {
    name: "Jalur Hemat",
    tag: "Disarankan",
    how: "Skor dihitung di kode. AI hanya menulis alasan untuk 5 kandidat teratas, masing-masing dengan maksimal 4 bukti.",
  },
  v1: {
    name: "Jalur Pembanding",
    tag: "Untuk mengukur",
    how: "Semua kandidat beserta seluruh buktinya dikirim ke AI untuk diurutkan, tanpa skor. Dipakai untuk membuktikan selisih token.",
  },
};

/** Urutan tampil: Jalur Hemat dulu karena itu bawaan. */
export const PATH_ORDER: readonly RunMode[] = ["v2", "v1"];

/** Perkiraan PRD (v2 5.000–8.000, v1 20.000–40.000 token per penugasan). */
const PRD_ESTIMATE: Record<RunMode, number> = { v2: 6_500, v1: 30_000 };

/** Token per penugasan: rata-rata Token Ledger jika sudah ada, selain itu perkiraan PRD. */
export function perRunEstimate(report: TokenReport | null, mode: RunMode): { tokens: number; fromLedger: boolean } {
  const s = report?.byMode[mode];
  return s && s.runs > 0 && s.avgPerRun > 0
    ? { tokens: s.avgPerRun, fromLedger: true }
    : { tokens: PRD_ESTIMATE[mode], fromLedger: false };
}

/** Berapa penugasan lagi yang muat sebelum batas berhenti. */
export function runsLeft(report: TokenReport, mode: RunMode): number {
  return Math.floor(report.remaining / perRunEstimate(report, mode).tokens);
}

export type BudgetStatus = "aman" | "menipis" | "berhenti";

export function budgetStatus(usage: Pick<TokenUsageView, "warn" | "stop">): BudgetStatus {
  return usage.stop ? "berhenti" : usage.warn ? "menipis" : "aman";
}

export const BUDGET_STATUS: Record<BudgetStatus, { label: string }> = {
  aman: { label: "Aman" },
  menipis: { label: "Menipis" },
  berhenti: { label: "Berhenti" },
};

/** Langkah yang memanggil AI, dalam bahasa sehari-hari (nama teknis hanya di jejak kerja). */
export const TOKEN_STEP_LABEL: Partial<Record<StepName, string>> = {
  parse: "Memahami brief atau guidebook",
  explain: "Menulis alasan berbukti",
  verify: "Menulis ulang alasan saat verifikasi",
};

/** Persen 0..100 dari anggaran, untuk penanda batas di meteran. */
export const shareOf = (tokens: number, budget: number) => (budget > 0 ? (tokens / budget) * 100 : 0);
