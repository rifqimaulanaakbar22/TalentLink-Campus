// Simulasi backend untuk mode mock (NEXT_PUBLIC_API_MOCK=true).
// Mengikuti perilaku lib/worker/run.ts: urutan langkah, teks jejak kerja, v1 tanpa skor,
// coba lagi tidak mengulang parse, skill di luar katalog menghasilkan 0 kandidat.
// Progres dihitung dari waktu mulai, jadi timeline bergerak saat polling dan tetap ada setelah refresh.
import { ApiRequestError } from "./errors";
import { mockWorkerBase } from "./fixtures";
import { ACTIVE_STUDENTS, CLARIFY_QUESTION, CLARIFY_SCENARIO, EVIDENCE, getScenario, pickScenario, type ScenarioStep } from "./mock-data";
import type {
  ApprovalView,
  ApproveBody,
  CreateRunBody,
  EvidenceDetail,
  RunDetailResponse,
  RunMode,
  RunResult,
  RunStatus,
  RunSummary,
  SendResponse,
  StepName,
  StepView,
  WorkerId,
  WorkerResponse,
} from "./types";

interface MockRun {
  id: number;
  workerId: WorkerId;
  mode: RunMode;
  brief: string;
  createdAt: string;
  /** Waktu (ms) mulai fase pipeline terakhir; diulang saat klarifikasi atau coba lagi. */
  phaseStart: number;
  failOnce: boolean;
  /** Setelah coba lagi, parse tidak diulang karena kriteria sudah tersimpan (seperti run.ts). */
  parseDoneAt: number | null;
  approval: ApprovalView | null;
}

const STORAGE_KEY = "talentlink-mock-runs-v2";
const BUDGET = 10_000_000;
const QUEUE_MS = 400;
const DECIDED_BY = "Dosen peneliti (SIMULASI)";
const MODEL_PARSE = "qwen3.8-flash";
const MODEL_EXPLAIN = "qwen3.7-plus";
const RATE_LIMIT = "Batas permintaan API CBN tercapai, coba lagi sebentar";

let memory: MockRun[] | null = null;

function seed(now: number): MockRun[] {
  const at = (minAgo: number) => now - minAgo * 60_000;
  const iso = (ms: number) => new Date(ms).toISOString();
  const run = (id: number, mode: RunMode, brief: string, startMs: number, extra: Partial<MockRun> = {}): MockRun => ({
    id,
    workerId: "netra",
    mode,
    brief,
    createdAt: iso(startMs),
    phaseStart: startMs,
    failOnce: false,
    parseDoneAt: null,
    approval: null,
    ...extra,
  });
  return [
    run(14, "v2", "Butuh 2 mahasiswa Python dan Computer Vision untuk riset deteksi objek di jalan raya", now - 1500),
    run(13, "v2", "Riset IoT pemantauan kualitas air dengan ESP32, minimal semester 5", at(12)),
    run(12, "v2", "cari mahasiswa yang bagus", at(31)),
    run(11, "v2", "Riset NLP analisis sentimen ulasan aplikasi kampus", at(58), { failOnce: true }),
    run(10, "v1", "Butuh 2 mahasiswa Python dan Computer Vision untuk riset deteksi objek", at(95), {
      approval: {
        decision: "approved",
        candidateCodes: ["S-101", "S-104"],
        messageDraft: getScenario("cv", null).result.invitationDraft,
        decidedBy: DECIDED_BY,
        decidedAt: iso(at(90)),
        sentAt: iso(at(89)),
      },
    }),
    run(9, "v2", "Asisten riset Deep Learning untuk klasifikasi citra medis", at(180), {
      approval: { decision: "rejected", candidateCodes: [], messageDraft: null, decidedBy: DECIDED_BY, decidedAt: iso(at(170)), sentAt: null },
    }),
  ];
}

function load(): MockRun[] {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memory = JSON.parse(raw) as MockRun[];
      return memory;
    }
  } catch {
    // localStorage tidak tersedia; pakai memori saja
  }
  memory = seed(Date.now());
  save();
  return memory;
}

function save() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // abaikan; data tetap ada di memori selama tab terbuka
  }
}

function find(id: number): MockRun {
  const run = load().find((r) => r.id === id);
  if (!run) throw new ApiRequestError("Penugasan tidak ditemukan.", 404);
  return run;
}

// ---------- Rencana langkah ----------

interface PlanStep extends ScenarioStep {
  dur: number;
  running: string;
  fail?: string;
  llm?: { model: string; input: number; output: number };
}

const DURATION: Record<StepName, number> = {
  parse: 1100,
  normalize: 250,
  search: 500,
  score: 350,
  explain: 2600,
  verify: 400,
  brief: 200,
};

function countFound(steps: ScenarioStep[]): number {
  const search = steps.find((s) => s.step === "search")?.detail ?? "";
  return Number(/menemukan (\d+) kandidat/.exec(search)?.[1] ?? 0);
}

/** Teks "sedang berjalan" diambil dari steps.start(...) di lib/worker/run.ts. */
function runningText(step: StepName, mode: RunMode, found: number, shortlist: number): string {
  switch (step) {
    case "parse":
      return "Netra membaca brief dosen…";
    case "normalize":
      return "Netra mencocokkan nama skill dengan katalog…";
    case "search":
      return `Netra menelusuri ${ACTIVE_STUDENTS} profil mahasiswa aktif…`;
    case "score":
      return `Netra menghitung skor ${found} kandidat di kode…`;
    case "explain":
      return mode === "v2"
        ? `Netra menyusun alasan berbukti untuk ${shortlist} kandidat teratas…`
        : `Netra mengirim ${found} kandidat beserta seluruh buktinya ke LLM untuk diranking…`;
    case "verify":
      return "Netra memeriksa setiap sitasi bukti…";
    case "brief":
      return "Netra menyusun Link Brief…";
  }
}

function buildPlan(run: MockRun) {
  const { key, unknown } = pickScenario(run.brief);
  if (key === "clarify") {
    const plan: PlanStep[] = CLARIFY_SCENARIO.map((s) => ({
      ...s,
      dur: DURATION[s.step],
      running: runningText(s.step, run.mode, 0, 0),
      llm: { model: MODEL_PARSE, input: 380, output: 60 },
    }));
    return { key, scenario: null, plan };
  }

  const scenario = getScenario(key, unknown);
  const v1 = run.mode === "v1";
  const found = countFound(scenario.steps);
  const shortlist = scenario.result.candidates.length;
  const plan: PlanStep[] = scenario.steps.map((s) => {
    const p: PlanStep = { ...s, dur: DURATION[s.step], running: runningText(s.step, run.mode, found, shortlist) };
    if (s.step === "parse") p.llm = { model: MODEL_PARSE, input: 420, output: 90 };
    if (s.step === "score" && v1) {
      p.status = "skipped";
      p.dur = 0;
      p.detail = "Mode v1: Netra tidak menghitung skor; ranking diserahkan ke LLM.";
    }
    if (s.step === "explain" && s.status !== "skipped") {
      p.dur = v1 ? 5200 : 2600;
      p.llm = v1 ? { model: MODEL_EXPLAIN, input: 27_800, output: 2_300 } : { model: MODEL_EXPLAIN, input: 3_900, output: 1_150 };
      if (run.failOnce) p.fail = RATE_LIMIT;
    }
    return p;
  });
  // Setelah coba lagi, run.ts melewati parse karena kriteria sudah tersimpan.
  return { key, scenario, plan: run.parseDoneAt !== null ? plan.filter((p) => p.step !== "parse") : plan };
}

function toResult(run: MockRun, scenario: ReturnType<typeof getScenario>): RunResult {
  const base = structuredClone(scenario.result);
  // Mode v1 (run.ts): skor tidak dihitung dan Hidden Talent tidak ditandai.
  const candidates =
    run.mode === "v1" ? base.candidates.map((c) => ({ ...c, score: null, hiddenTalent: false })) : base.candidates;
  return { ...base, mode: run.mode, candidates, budgetWarning: false };
}

function derive(run: MockRun, now: number): RunDetailResponse {
  const { key, scenario, plan } = buildPlan(run);
  const elapsed = now - run.phaseStart;
  const steps: StepView[] = [];
  let status: RunStatus = "queued";
  let errorMessage: string | null = null;
  let t = QUEUE_MS;
  let finished = elapsed >= QUEUE_MS;

  if (run.parseDoneAt !== null) {
    // Langkah parse dari percobaan pertama tetap tercatat.
    const p = getScenario(key === "clarify" ? "cv" : key, null).steps.find((s) => s.step === "parse");
    const start = run.parseDoneAt + QUEUE_MS;
    steps.push({
      id: run.id * 100 + 99,
      step: "parse",
      status: "done",
      startedAt: new Date(start).toISOString(),
      endedAt: new Date(start + DURATION.parse).toISOString(),
      durationMs: DURATION.parse,
      detail: p?.detail ?? null,
      model: MODEL_PARSE,
      inputTokens: 420,
      outputTokens: 90,
      isEstimate: false,
    });
  }

  if (finished) {
    status = "running";
    for (const [i, p] of plan.entries()) {
      const startedAt = new Date(run.phaseStart + t).toISOString();
      const base = { id: run.id * 100 + i, step: p.step, startedAt, model: p.llm?.model ?? null };
      if (p.status === "skipped") {
        steps.push({ ...base, model: null, status: "skipped", endedAt: startedAt, durationMs: 0, detail: p.detail, inputTokens: 0, outputTokens: 0, isEstimate: false });
        continue;
      }
      if (elapsed < t + p.dur) {
        steps.push({ ...base, status: "running", endedAt: null, durationMs: null, detail: p.running, inputTokens: 0, outputTokens: 0, isEstimate: false });
        finished = false;
        break;
      }
      const endedAt = new Date(run.phaseStart + t + p.dur).toISOString();
      if (p.fail) {
        // Error 429 terjadi sebelum ada respons, jadi lib/llm.ts tidak mencatat token untuk langkah ini.
        steps.push({ ...base, status: "failed", endedAt, durationMs: p.dur, detail: p.fail, inputTokens: 0, outputTokens: 0, isEstimate: false });
        status = "failed";
        errorMessage = p.fail;
        finished = false;
        break;
      }
      steps.push({ ...base, status: "done", endedAt, durationMs: p.dur, detail: p.detail, inputTokens: p.llm?.input ?? 0, outputTokens: p.llm?.output ?? 0, isEstimate: false });
      t += p.dur;
    }
  }

  let result: RunResult | null = null;
  let clarificationQuestion: string | null = null;
  if (finished) {
    if (key === "clarify") {
      status = "needs_clarification";
      clarificationQuestion = CLARIFY_QUESTION;
    } else if (scenario) {
      result = toResult(run, scenario);
      status = run.approval ? run.approval.decision : "awaiting_approval";
    }
  }

  const totalTokens = steps.reduce((s, x) => s + x.inputTokens + x.outputTokens, 0);
  return {
    run: {
      id: run.id,
      workerId: run.workerId,
      mode: run.mode,
      brief: run.brief,
      status,
      createdAt: run.createdAt,
      updatedAt: new Date(Math.min(now, run.phaseStart + t)).toISOString(),
      errorMessage,
      clarificationQuestion,
    },
    steps,
    totalTokens,
    result,
    approval: run.approval,
    budgetWarning: false,
  };
}

// ---------- API mock ----------

export const mockApi = {
  getWorkers(): WorkerResponse {
    const now = Date.now();
    const details = load().map((r) => derive(r, now));
    const netraTokens = details.reduce((s, d) => s + d.totalTokens, 0);
    const active = details.find((d) => d.run.status === "running" || d.run.status === "queued");
    const workers = mockWorkerBase.map((w) =>
      w.id === "netra"
        ? { ...w, status: active ? ("bekerja" as const) : ("siap" as const), activeRunId: active?.run.id ?? null, tokensUsed: netraTokens }
        : w,
    );
    // Skala sama dengan getTokenUsage() di lib/llm.ts: persen 0–100, satu angka desimal.
    const percent = Math.round((netraTokens / BUDGET) * 1000) / 10;
    return {
      workers,
      usage: { total: netraTokens, budget: BUDGET, percent, warn: percent >= 80, stop: percent >= 95, byWorker: { netra: netraTokens, jaya: 0, kanca: 0 } },
    };
  },

  getRuns(): { runs: RunSummary[] } {
    const now = Date.now();
    const runs = [...load()]
      .sort((a, b) => b.id - a.id)
      .slice(0, 20)
      .map((r) => {
        const d = derive(r, now);
        return {
          id: r.id,
          workerId: r.workerId,
          briefPreview: r.brief.length > 120 ? `${r.brief.slice(0, 117)}…` : r.brief,
          mode: r.mode,
          status: d.run.status,
          createdAt: r.createdAt,
          totalTokens: d.totalTokens,
          errorMessage: d.run.errorMessage,
        };
      });
    return { runs };
  },

  getRun(id: number): RunDetailResponse {
    return derive(find(id), Date.now());
  },

  createRun(body: CreateRunBody): { runId: number } {
    const brief = body.brief.trim();
    if (brief.length < 15) throw new ApiRequestError("Brief terlalu pendek. Tulis minimal 15 karakter.", 400);
    if (body.workerId !== "netra") throw new ApiRequestError("Worker ini masih dalam pelatihan dan belum bisa menerima tugas.", 400);
    const runs = load();
    const now = Date.now();
    const id = Math.max(0, ...runs.map((r) => r.id)) + 1;
    runs.push({
      id,
      workerId: body.workerId,
      mode: body.mode,
      brief,
      createdAt: new Date(now).toISOString(),
      phaseStart: now,
      failOnce: brief.toLowerCase().includes("simulasi gagal"),
      parseDoneAt: null,
      approval: null,
    });
    save();
    return { runId: id };
  },

  clarify(id: number, answer: string) {
    const run = find(id);
    if (derive(run, Date.now()).run.status !== "needs_clarification")
      throw new ApiRequestError("Penugasan ini tidak sedang menunggu klarifikasi.", 409);
    if (answer.trim().length < 3) throw new ApiRequestError("Jawaban terlalu pendek.", 400);
    // Usulan perilaku API: jawaban ditambahkan ke brief_text, lalu pipeline dijalankan ulang dari parse.
    run.brief = `${run.brief}\n\nJawaban klarifikasi: ${answer.trim()}`;
    run.phaseStart = Date.now();
    save();
    return { runId: id, status: "queued" as const };
  },

  retry(id: number) {
    const run = find(id);
    if (derive(run, Date.now()).run.status !== "failed") throw new ApiRequestError("Hanya penugasan yang gagal yang bisa dicoba lagi.", 409);
    run.failOnce = false;
    run.parseDoneAt = run.phaseStart;
    run.phaseStart = Date.now();
    save();
    return { runId: id, status: "queued" as const };
  },

  approve(id: number, body: ApproveBody): ApprovalView {
    const run = find(id);
    if (derive(run, Date.now()).run.status !== "awaiting_approval")
      throw new ApiRequestError("Penugasan ini tidak sedang menunggu persetujuan.", 409);
    if (body.decision === "approved" && body.candidateCodes.length === 0)
      throw new ApiRequestError("Pilih minimal satu kandidat sebelum menyetujui.", 400);
    run.approval = {
      decision: body.decision,
      candidateCodes: body.decision === "approved" ? body.candidateCodes : [],
      messageDraft: body.decision === "approved" ? body.messageDraft : null,
      decidedBy: DECIDED_BY,
      decidedAt: new Date().toISOString(),
      sentAt: null,
    };
    save();
    return run.approval;
  },

  send(id: number): SendResponse {
    const run = find(id);
    if (run.approval?.decision !== "approved") throw new ApiRequestError("Butuh persetujuan dosen", 403);
    run.approval.sentAt ??= new Date().toISOString();
    save();
    return { sentAt: run.approval.sentAt, label: "SIMULASI" };
  },

  getEvidence(id: string): EvidenceDetail {
    const ev = EVIDENCE[id];
    if (!ev) throw new ApiRequestError("Bukti tidak ditemukan.", 404);
    return ev;
  },

  reset() {
    memory = seed(Date.now());
    save();
  },
};
