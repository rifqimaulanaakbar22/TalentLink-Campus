import type { RunStatus } from "./types";

const nf = new Intl.NumberFormat("id-ID");

export const formatNumber = (n: number) => nf.format(n);

export function formatPercent(n: number, digits = 1) {
  return `${n.toLocaleString("id-ID", { maximumFractionDigits: digits })}%`;
}

export function formatDuration(ms: number | null) {
  if (ms === null) return "–";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} dtk`;
}

export function formatRelative(iso: string, now = Date.now()) {
  const diff = Math.round((now - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** Nama tool dalam bahasa sehari-hari; ID teknis hanya tampil di Run Timeline. */
export const TOOL_LABEL: Record<string, string> = {
  search_talent_graph: "Telusuri talent graph",
  compute_match_score: "Hitung skor kecocokan",
  get_evidence: "Ambil bukti",
  draft_message: "Susun draf pesan",
  parse_guidebook: "Baca guidebook lomba",
  check_eligibility: "Cek syarat lomba",
  build_team: "Susun tim",
  check_conflict: "Cek konflik tim",
  validate_survey: "Validasi survei",
  compute_readiness_metrics: "Hitung metrik kesiapan",
  send_message: "Kirim undangan",
};

export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  queued: "Antre",
  running: "Sedang bekerja",
  needs_clarification: "Butuh klarifikasi",
  awaiting_approval: "Menunggu persetujuan",
  approved: "Disetujui",
  rejected: "Ditolak",
  failed: "Gagal",
};
