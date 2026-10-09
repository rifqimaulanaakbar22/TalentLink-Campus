// Logika endpoint API (dipanggil oleh Route Handler di app/api/). Tidak ada fungsi yang mengubah
// tabel students atau evidence.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getSqlite, nowIso } from "./db";
import { getTokenUsage } from "./llm";
import workers from "./workers.json";
import type {
  ApprovalView,
  CreateRunResponse,
  EvidenceDetail,
  RunDetailResponse,
  RunListResponse,
  RunSummary,
  ScorecardResponse,
  SendResponse,
  StepView,
  WorkerCard,
  WorkerResponse,
} from "./api-types";
import type { Criteria, RunMode, RunResult, RunStatus, StepName, StepStatus, WorkerId } from "./types";
import { createRun } from "./worker/run";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const MSG = {
  notFound: "Penugasan tidak ditemukan.",
  notClarifying: "Penugasan ini tidak sedang menunggu klarifikasi.",
  notAwaiting: "Penugasan ini tidak sedang menunggu persetujuan.",
  notFailed: "Hanya penugasan yang gagal yang bisa dicoba lagi.",
  needApproval: "Butuh persetujuan dosen",
  comingSoon: "Digital Worker ini segera hadir dan belum bisa diberi tugas.",
  evidenceNotFound: "Bukti tidak ditemukan.",
  budgetStop: "Anggaran token sudah mencapai batas berhenti. Penugasan baru ditahan sampai alokasi token ditambah.",
  comparisonLocked: "Anggaran token sudah melewati batas peringatan, jadi Jalur Pembanding dikunci. Pilih Jalur Hemat.",
} as const;

/**
 * Rem anggaran (Neraca Token). Di atas batas berhenti semua penugasan baru ditahan; di atas batas
 * peringatan Jalur Pembanding (v1) dikunci. Jaya selalu memakai Jalur Hemat, jadi tidak ikut dikunci.
 */
function assertBudget(workerId: string, mode: RunMode) {
  const usage = getTokenUsage();
  if (usage.stop) throw new ApiError(409, MSG.budgetStop);
  if (usage.warn && mode === "v1" && workerId !== "jaya") throw new ApiError(409, MSG.comparisonLocked);
}

// ---------- Skema body ----------

/** Pesan Zod pertama dalam bahasa Indonesia untuk balasan 400. */
export function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Data permintaan tidak valid.";
}

export const CreateRunSchema = z.object({
  workerId: z.enum(["netra", "jaya", "kanca"], { error: "Digital Worker tidak dikenal." }),
  brief: z
    .string({ error: "Brief wajib diisi." })
    .trim()
    .min(15, { error: "Brief terlalu pendek, minimal 15 karakter." })
    .max(20000, { error: "Teks terlalu panjang, maksimal 20.000 karakter." }),
  mode: z.enum(["v1", "v2"], { error: 'Mode harus "v1" atau "v2".' }).default("v2"),
});

export const ClarifySchema = z.object({
  answer: z
    .string({ error: "Jawaban wajib diisi." })
    .trim()
    .min(2, { error: "Jawaban klarifikasi terlalu pendek." })
    .max(2000, { error: "Jawaban klarifikasi terlalu panjang." }),
});

export const ApproveSchema = z.object({
  decision: z.enum(["approved", "rejected"], { error: 'Keputusan harus "approved" atau "rejected".' }),
  candidateCodes: z.array(z.string(), { error: "Daftar kandidat tidak valid." }).max(20).default([]),
  messageDraft: z.string({ error: "Draf undangan wajib diisi." }).max(5000, { error: "Draf undangan terlalu panjang." }),
});

export const RunIdSchema = z.coerce.number({ error: "ID penugasan tidak valid." }).int().positive({ error: "ID penugasan tidak valid." });
export const EvidenceIdSchema = z.string().regex(/^EV-\d{1,6}$/, { error: "ID bukti tidak valid." });

// ---------- Query ----------

function sql() {
  const db = getSqlite();
  return {
    run: db.prepare(
      `SELECT id, worker_id, mode, brief_text, criteria_json, status, created_at, updated_at, result_json, error_message
       FROM runs WHERE id = ?`,
    ),
    // Token dihubungkan ke baris langkah lewat nama langkah + rentang waktu, agar retry tidak dihitung dua kali.
    steps: db.prepare(
      `SELECT s.id, s.step, s.status, s.started_at, s.ended_at, s.detail,
              COALESCE(SUM(t.input_tokens), 0) AS input_tokens,
              COALESCE(SUM(t.output_tokens), 0) AS output_tokens,
              MAX(t.model) AS model,
              COALESCE(MAX(t.is_estimate), 0) AS is_estimate
       FROM run_steps s
       LEFT JOIN token_ledger t
         ON t.run_id = s.run_id AND t.step = s.step
        AND t.created_at >= s.started_at AND (s.ended_at IS NULL OR t.created_at <= s.ended_at)
       WHERE s.run_id = ?
       GROUP BY s.id
       ORDER BY s.id`,
    ),
    runTokens: db.prepare("SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS n FROM token_ledger WHERE run_id = ?"),
    lastApproval: db.prepare(
      `SELECT candidate_ids, decision, decided_by, decided_at, message_draft, sent_at, id
       FROM approvals WHERE run_id = ? ORDER BY id DESC LIMIT 1`,
    ),
    list: db.prepare(
      `SELECT r.id, r.worker_id, r.mode, r.brief_text, r.status, r.created_at, r.error_message,
              COALESCE(t.n, 0) AS total_tokens
       FROM runs r
       LEFT JOIN (SELECT run_id, SUM(input_tokens + output_tokens) AS n FROM token_ledger GROUP BY run_id) t
         ON t.run_id = r.id
       ORDER BY r.id DESC LIMIT 20`,
    ),
    activeRuns: db.prepare(
      `SELECT worker_id, MAX(id) AS id FROM runs WHERE status IN ('queued', 'running') GROUP BY worker_id`,
    ),
    clarify: db.prepare(
      `UPDATE runs SET brief_text = brief_text || ?, status = 'queued', error_message = NULL, updated_at = ?
       WHERE id = ? AND status = 'needs_clarification'`,
    ),
    retry: db.prepare(
      `UPDATE runs SET status = 'queued', error_message = NULL, updated_at = ? WHERE id = ? AND status = 'failed'`,
    ),
    decide: db.prepare(`UPDATE runs SET status = ?, updated_at = ? WHERE id = ? AND status = 'awaiting_approval'`),
    insertApproval: db.prepare(
      `INSERT INTO approvals (run_id, candidate_ids, decision, decided_by, decided_at, message_draft)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ),
    markSent: db.prepare("UPDATE approvals SET sent_at = ? WHERE id = ? AND sent_at IS NULL"),
    evidence: db.prepare(
      `SELECT e.id, e.type, e.title, e.detail, e.grade, e.year, e.source_label, s.code AS student_code,
              (SELECT json_group_array(k.name) FROM evidence_skills es JOIN skills k ON k.id = es.skill_id
               WHERE es.evidence_id = e.id) AS skills
       FROM evidence e JOIN students s ON s.id = e.student_id
       WHERE e.id = ?`,
    ),
  };
}
let stmts: ReturnType<typeof sql> | null = null;
const q = () => (stmts ??= sql());

type RunRow = {
  id: number;
  worker_id: WorkerId;
  mode: RunMode;
  brief_text: string;
  criteria_json: string | null;
  status: RunStatus;
  created_at: string;
  updated_at: string;
  result_json: string | null;
  error_message: string | null;
};

type ApprovalRow = {
  id: number;
  candidate_ids: string;
  decision: "approved" | "rejected";
  decided_by: string;
  decided_at: string;
  message_draft: string | null;
  sent_at: string | null;
};

function getRunRow(id: number): RunRow {
  const row = q().run.get(id) as RunRow | undefined;
  if (!row) throw new ApiError(404, MSG.notFound);
  return row;
}

function toApprovalView(a: ApprovalRow): ApprovalView {
  return {
    decision: a.decision,
    candidateCodes: JSON.parse(a.candidate_ids) as string[],
    messageDraft: a.message_draft,
    decidedBy: a.decided_by,
    decidedAt: a.decided_at,
    sentAt: a.sent_at,
  };
}

// ---------- Endpoint ----------

export function getWorkers(): WorkerResponse {
  const usage = getTokenUsage();
  const active = new Map(
    (q().activeRuns.all() as { worker_id: WorkerId; id: number }[]).map((r) => [r.worker_id, r.id]),
  );
  const cards: WorkerCard[] = workers.map((w) => {
    const id = w.id as WorkerId;
    const activeRunId = active.get(id) ?? null;
    return {
      id,
      nama: w.nama,
      maskot: w.maskot,
      arti_nama: w.arti_nama,
      jabatan: w.jabatan,
      unit: w.unit,
      melapor_ke: w.melapor_ke,
      persona: w.persona,
      salam: w.salam,
      level_label: w.level_label,
      tools_diizinkan: w.tools_diizinkan,
      aksi_butuh_approval: w.aksi_butuh_approval,
      kpi: w.kpi,
      warna: w.warna as WorkerCard["warna"],
      avatar: w.avatar,
      status: w.status_rilis !== "aktif" ? "segera_hadir" : activeRunId !== null ? "bekerja" : "siap",
      activeRunId,
      tokensUsed: usage.byWorker[id] ?? 0,
    };
  });
  return { workers: cards, usage };
}

/** Buat run berstatus queued. Pipeline dijalankan pemanggil di background. */
export function createRunFromBody(body: unknown): CreateRunResponse {
  const parsed = CreateRunSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, firstIssue(parsed.error));
  const { workerId, brief, mode } = parsed.data;
  const worker = workers.find((w) => w.id === workerId);
  if (!worker || worker.status_rilis !== "aktif") throw new ApiError(400, MSG.comingSoon);
  // Guidebook lomba (Jaya) boleh panjang; brief riset (Netra) cukup 4.000 karakter.
  if (workerId !== "jaya" && brief.length > 4000) throw new ApiError(400, "Brief terlalu panjang, maksimal 4.000 karakter.");
  assertBudget(workerId, mode);
  return { runId: createRun({ workerId, brief, mode }) };
}

export function listRuns(): RunListResponse {
  const rows = q().list.all() as (Omit<RunRow, "criteria_json" | "updated_at" | "result_json"> & { total_tokens: number })[];
  const runs: RunSummary[] = rows.map((r) => ({
    id: r.id,
    workerId: r.worker_id,
    briefPreview: r.brief_text.length > 120 ? `${r.brief_text.slice(0, 119)}…` : r.brief_text,
    mode: r.mode,
    status: r.status,
    createdAt: r.created_at,
    totalTokens: r.total_tokens,
    errorMessage: r.error_message,
  }));
  return { runs };
}

export function getRunDetail(id: number): RunDetailResponse {
  const run = getRunRow(id);
  const stepRows = q().steps.all(id) as {
    id: number;
    step: StepName;
    status: StepStatus;
    started_at: string;
    ended_at: string | null;
    detail: string | null;
    input_tokens: number;
    output_tokens: number;
    model: string | null;
    is_estimate: number;
  }[];
  const steps: StepView[] = stepRows.map((s) => ({
    id: s.id,
    step: s.step,
    status: s.status,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    durationMs: s.ended_at ? new Date(s.ended_at).getTime() - new Date(s.started_at).getTime() : null,
    detail: s.detail,
    model: s.model,
    inputTokens: s.input_tokens,
    outputTokens: s.output_tokens,
    isEstimate: s.is_estimate === 1,
  }));
  const result = run.result_json ? (JSON.parse(run.result_json) as RunResult) : null;
  const approval = q().lastApproval.get(id) as ApprovalRow | undefined;
  const criteria = run.criteria_json ? (JSON.parse(run.criteria_json) as Criteria) : null;

  return {
    run: {
      id: run.id,
      workerId: run.worker_id,
      mode: run.mode,
      brief: run.brief_text,
      status: run.status,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      errorMessage: run.error_message,
      clarificationQuestion: run.status === "needs_clarification" ? (criteria?.question ?? null) : null,
    },
    steps,
    totalTokens: (q().runTokens.get(id) as { n: number }).n,
    result,
    approval: approval ? toApprovalView(approval) : null,
    budgetWarning: Boolean(result?.budgetWarning) || getTokenUsage().warn,
  };
}

/** Gabungkan jawaban ke brief dan antrekan ulang run. Format penanda dipakai frontend untuk memecah brief. */
export function clarifyRun(id: number, body: unknown): { runId: number; status: "queued" } {
  const parsed = ClarifySchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, firstIssue(parsed.error));
  getRunRow(id);
  const changed = q().clarify.run(`\n\nJawaban klarifikasi: ${parsed.data.answer}`, nowIso(), id).changes;
  if (changed !== 1) throw new ApiError(409, MSG.notClarifying);
  return { runId: id, status: "queued" };
}

export function approveRun(id: number, body: unknown, decidedBy = "Dosen pemberi tugas"): ApprovalView {
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, firstIssue(parsed.error));
  const run = getRunRow(id);
  if (run.status !== "awaiting_approval") throw new ApiError(409, MSG.notAwaiting);

  const { decision, messageDraft } = parsed.data;
  const codes = [...new Set(parsed.data.candidateCodes)];
  const shortlist = new Set((run.result_json ? (JSON.parse(run.result_json) as RunResult).candidates : []).map((c) => c.code));
  const outside = codes.filter((c) => !shortlist.has(c));
  if (outside.length) throw new ApiError(400, `Kandidat ${outside.join(", ")} tidak ada di Link Brief penugasan ini.`);
  if (decision === "approved" && codes.length === 0) throw new ApiError(400, "Pilih minimal satu kandidat untuk disetujui.");

  const db = getSqlite();
  const now = nowIso();
  db.transaction(() => {
    if (q().decide.run(decision, now, id).changes !== 1) throw new ApiError(409, MSG.notAwaiting);
    q().insertApproval.run(id, JSON.stringify(codes), decision, decidedBy, now, messageDraft);
  })();
  return toApprovalView(q().lastApproval.get(id) as ApprovalRow);
}

/** Kirim undangan SIMULASI: tidak ada email/WA yang benar-benar terkirim. */
export function sendInvitation(id: number): SendResponse {
  getRunRow(id);
  const approval = q().lastApproval.get(id) as ApprovalRow | undefined;
  if (!approval || approval.decision !== "approved") throw new ApiError(403, MSG.needApproval);
  if (approval.sent_at) return { sentAt: approval.sent_at, label: "SIMULASI" };
  const sentAt = nowIso();
  q().markSent.run(sentAt, approval.id);
  return { sentAt, label: "SIMULASI" };
}

export function retryRun(id: number): { runId: number; status: "queued" } {
  const run = getRunRow(id);
  if (run.status !== "failed") throw new ApiError(409, MSG.notFailed);
  assertBudget(run.worker_id, run.mode);
  if (q().retry.run(nowIso(), id).changes !== 1) throw new ApiError(409, MSG.notFailed);
  return { runId: id, status: "queued" };
}

export function getEvidence(id: string): EvidenceDetail {
  const row = q().evidence.get(id) as
    | {
        id: string;
        type: EvidenceDetail["type"];
        title: string;
        detail: string;
        grade: EvidenceDetail["grade"];
        year: number;
        source_label: string;
        student_code: string;
        skills: string;
      }
    | undefined;
  if (!row) throw new ApiError(404, MSG.evidenceNotFound);
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    detail: row.detail,
    grade: row.grade,
    year: row.year,
    sourceLabel: row.source_label,
    studentCode: row.student_code,
    skills: JSON.parse(row.skills) as string[],
  };
}

const ScorecardFileSchema = z.object({
  generatedAt: z.string(),
  v1: z.object({ precisionAt3: z.number(), validCitationRate: z.number(), avgTokens: z.number(), avgLatencyMs: z.number(), runs: z.number() }),
  v2: z.object({ precisionAt3: z.number(), validCitationRate: z.number(), avgTokens: z.number(), avgLatencyMs: z.number(), runs: z.number() }),
  cases: z.array(z.object({ id: z.string(), title: z.string(), mode: z.enum(["v1", "v2"]), pass: z.boolean(), note: z.string() })),
});

export function getScorecard(file = path.join(process.cwd(), "eval", "results.json")): ScorecardResponse {
  const empty = { empty: true as const, hint: "Jalankan npm run eval" };
  if (!fs.existsSync(/*turbopackIgnore: true*/ file)) return empty;
  try {
    const parsed = ScorecardFileSchema.safeParse(JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ file, "utf8")));
    return parsed.success ? { empty: false, ...parsed.data } : empty;
  } catch {
    return empty;
  }
}
