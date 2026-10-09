// SEMENTARA: salinan tipe dari docs/kontrak-frontend-backend.md bagian 4.
// Setelah Rofiq me-merge lib/api-types.ts ke master, ganti isi berkas ini dengan:
//   export type * from "@/lib/api-types";
import type { EvidenceType, Grade, RunMode, RunResult, RunStatus, StepName, StepStatus, WorkerId } from "@/lib/types";

export type { RunMode, RunResult, RunStatus, StepName, StepStatus, WorkerId };

export interface ApiError { error: string }

export interface TokenUsageView {
  total: number;
  budget: number;
  percent: number;
  warn: boolean;
  stop: boolean;
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
  briefPreview: string;
  mode: RunMode;
  status: RunStatus;
  createdAt: string;
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
  detail: string | null;
  model: string | null;
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
  sentAt: string | null;
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
    clarificationQuestion: string | null;
  };
  steps: StepView[];
  totalTokens: number;
  result: RunResult | null;
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
  sourceLabel: string;
  studentCode: string;
  skills: string[];
}

export interface ScorecardModeSummary {
  precisionAt3: number;
  validCitationRate: number;
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
