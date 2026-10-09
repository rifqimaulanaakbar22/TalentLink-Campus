// Kontrak API frontend–backend. Sumber: docs/kontrak-frontend-backend.md bagian 4.
// Ubah kontrak dulu, kabari tim, baru ubah berkas ini.
import type { RunMode, RunResult, RunStatus, StepName, StepStatus, WorkerId, EvidenceType, Grade } from "./types";

export interface ApiError { error: string }

export interface TokenUsageView {
  total: number;          // token terpakai seluruh aplikasi
  budget: number;         // 10_000_000
  percent: number;        // 0..100
  warn: boolean;          // >= 80%
  stop: boolean;          // >= 95%
  byWorker: Record<WorkerId, number>;
}

export interface WorkerCard {
  id: WorkerId;
  nama: string;
  maskot: string;
  arti_nama: string;
  jabatan: string;
  unit: string;
  melapor_ke: string;
  persona: string;
  salam: string;
  level_label: string;
  tools_diizinkan: string[];
  aksi_butuh_approval: string[];
  kpi: string[];
  warna: "indigo" | "orange" | "green";
  avatar: string;
  status: "siap" | "bekerja" | "segera_hadir";
  activeRunId: number | null;
  tokensUsed: number;
}

export interface WorkerResponse { workers: WorkerCard[]; usage: TokenUsageView }

export interface CreateRunBody { workerId: WorkerId; brief: string; mode: RunMode }
export interface CreateRunResponse { runId: number }

export interface RunSummary {
  id: number;
  workerId: WorkerId;
  briefPreview: string;   // maksimal 120 karakter
  mode: RunMode;
  status: RunStatus;
  createdAt: string;      // ISO
  totalTokens: number;
  errorMessage: string | null;
}
export interface RunListResponse { runs: RunSummary[] }

export interface StepView {
  id: number;
  step: StepName;
  status: StepStatus;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  detail: string | null;  // kalimat bersuara worker, siap ditampilkan
  model: string | null;   // hanya untuk langkah yang memanggil LLM
  inputTokens: number;
  outputTokens: number;
  isEstimate: boolean;
}

export interface ApprovalView {
  decision: "approved" | "rejected";
  candidateCodes: string[];
  messageDraft: string | null;
  decidedBy: string;
  decidedAt: string;
  sentAt: string | null;  // terisi setelah kirim SIMULASI
}

export interface RunDetailResponse {
  run: {
    id: number;
    workerId: WorkerId;
    mode: RunMode;
    brief: string;
    status: RunStatus;
    createdAt: string;
    updatedAt: string;
    errorMessage: string | null;
    clarificationQuestion: string | null; // terisi saat status needs_clarification
  };
  steps: StepView[];
  totalTokens: number;
  result: RunResult | null;               // terisi saat awaiting_approval, approved, rejected
  approval: ApprovalView | null;
  budgetWarning: boolean;
}

export interface ClarifyBody { answer: string }
export interface ApproveBody {
  decision: "approved" | "rejected";
  candidateCodes: string[];
  messageDraft: string;
}
export interface SendResponse { sentAt: string; label: "SIMULASI" }

export interface EvidenceDetail {
  id: string;
  type: EvidenceType;
  title: string;
  detail: string;
  grade: Grade | null;
  year: number;
  sourceLabel: string;    // "Sintetis"
  studentCode: string;
  skills: string[];
}

export interface ScorecardModeSummary {
  precisionAt3: number;       // 0..1
  validCitationRate: number;  // 0..1
  avgTokens: number;
  avgLatencyMs: number;
  runs: number;
}
export type ScorecardResponse =
  | { empty: true; hint: string }
  | {
      empty: false;
      generatedAt: string;
      v1: ScorecardModeSummary;
      v2: ScorecardModeSummary;
      cases: { id: string; title: string; mode: RunMode; pass: boolean; note: string }[];
    };

// ---------- Tambahan: Neraca Token dan Jalur Hemat (aditif, 10 Oktober 2026) ----------

/** Ringkasan satu jalur kerja. Hanya penugasan Netra yang sudah menghasilkan Link Brief. */
export interface TokenModeStats {
  runs: number;           // jumlah penugasan
  tokens: number;         // total token penugasan itu
  avgPerRun: number;      // dibulatkan; 0 jika runs = 0
}

export interface TokenStepStats {
  step: StepName;
  calls: number;          // jumlah panggilan LLM
  tokens: number;
}

export interface TokenReport {
  usage: TokenUsageView;
  warnAt: number;            // token; mulai di sini Jalur Pembanding dikunci
  stopAt: number;            // token; mulai di sini penugasan baru ditolak dan LLM berhenti
  remaining: number;         // stopAt - total, minimal 0
  comparisonLocked: boolean; // sama dengan usage.warn
  byMode: Record<RunMode, TokenModeStats>; // v2 = Jalur Hemat, v1 = Jalur Pembanding
  savings: { percent: number; tokens: number } | null; // null jika salah satu jalur belum punya data
  byStep: TokenStepStats[];  // urut token terbesar
  calls: number;             // semua panggilan LLM di token_ledger
  estimatedCalls: number;    // panggilan yang tokennya perkiraan (gateway tidak mengirim usage)
  unassigned: number;        // token tanpa penugasan (penugasan terhapus saat seed ulang, skrip)
}
