// Satu-satunya pintu ke LLM (API CBN, gateway LiteLLM kompatibel OpenAI).
// Setiap panggilan dicatat di token_ledger dan dipotong dari budget aplikasi.
import type { z } from "zod";
import { getSqlite, nowIso } from "./db";
import type { StepName, WorkerId } from "./types";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type LLMErrorCode = "auth" | "rate_limit" | "timeout" | "network" | "budget" | "bad_json" | "http" | "config";

export class LLMError extends Error {
  constructor(
    public code: LLMErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export interface CallLLMOptions<T> {
  runId: number | null;
  step: StepName;
  model: string;
  messages: ChatMessage[];
  schema: z.ZodType<T>;
  /** Jawaban contoh untuk LLM_MOCK=true; menerima LLM_MOCK_SCENARIO dan mengembalikan teks mentah. */
  mock?: (scenario: string | undefined) => string;
}

export interface CallLLMResult<T> {
  data: T;
  usage: { inputTokens: number; outputTokens: number; isEstimate: boolean; latencyMs: number };
  budgetWarning: boolean;
}

const TIMEOUT_MS = 30_000;

export const isMock = () => process.env.LLM_MOCK === "true";

/** Anggaran token dan dua batasnya (token absolut). Dipakai juga oleh Neraca Token (lib/tokens.ts). */
export function budgetConfig() {
  const total = Number(process.env.TOKEN_BUDGET_TOTAL) || 10_000_000;
  // Nilai <= 1 dibaca sebagai fraksi dari total, selain itu angka token absolut.
  const level = (v: string | undefined, def: number) => {
    const n = v === undefined || v === "" ? def : Number(v);
    return n <= 1 ? n * total : n;
  };
  return { total, warn: level(process.env.TOKEN_BUDGET_WARN, 0.8), stop: level(process.env.TOKEN_BUDGET_STOP, 0.95) };
}

export interface TokenUsage {
  total: number;
  budget: number;
  percent: number;
  warn: boolean;
  stop: boolean;
  byWorker: Record<WorkerId, number>;
}

export function getTokenUsage(): TokenUsage {
  const db = getSqlite();
  const rows = db
    .prepare(
      `SELECT r.worker_id AS worker, COALESCE(SUM(t.input_tokens + t.output_tokens), 0) AS n
       FROM token_ledger t LEFT JOIN runs r ON r.id = t.run_id
       GROUP BY r.worker_id`,
    )
    .all() as { worker: WorkerId | null; n: number }[];
  const byWorker: Record<WorkerId, number> = { netra: 0, jaya: 0, kanca: 0 };
  let total = 0;
  for (const r of rows) {
    total += r.n;
    if (r.worker) byWorker[r.worker] = (byWorker[r.worker] ?? 0) + r.n;
  }
  const { total: budget, warn, stop } = budgetConfig();
  return { total, budget, percent: Math.round((total / budget) * 1000) / 10, warn: total >= warn, stop: total >= stop, byWorker };
}

function record(runId: number | null, step: StepName, model: string, u: CallLLMResult<unknown>["usage"]) {
  getSqlite()
    .prepare(
      `INSERT INTO token_ledger (run_id, step, model, input_tokens, output_tokens, latency_ms, is_estimate, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(runId, step, model, u.inputTokens, u.outputTokens, u.latencyMs, u.isEstimate ? 1 : 0, nowIso());
}

/** Ambil objek JSON dari teks jawaban: buang code fence dan teks di luar kurung kurawal terluar. */
export function extractJson(text: string): unknown {
  let s = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  // Beberapa model menulis blok <think>…</think> sebelum jawaban.
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end <= start) throw new LLMError("bad_json", "Jawaban AI bukan JSON yang valid");
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    throw new LLMError("bad_json", "Jawaban AI bukan JSON yang valid");
  }
}

function parseAndValidate<T>(text: string, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(extractJson(text));
  if (!parsed.success) throw new LLMError("bad_json", "Jawaban AI tidak sesuai skema");
  return parsed.data;
}

// Diingat per proses: parameter yang ditolak gateway tidak dikirim lagi.
let jsonModeRejected = false;
let thinkingParamRejected = false;

type ApiResponse = {
  choices?: { message?: { content?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

async function post(model: string, messages: ChatMessage[]): Promise<Response> {
  const base = process.env.CBN_API_BASE_URL;
  const key = process.env.CBN_API_KEY;
  if (!base || !key) throw new LLMError("config", "Konfigurasi API CBN belum diisi (CBN_API_BASE_URL / CBN_API_KEY)");
  const body: Record<string, unknown> = { model, messages, temperature: 0 };
  if (!jsonModeRejected) body.response_format = { type: "json_object" };
  // Model Qwen di CBN adalah model thinking; reasoning-nya membuat explain lewat 30 detik
  // dan memakan token. Tugas kita cukup JSON terstruktur, jadi thinking dimatikan.
  if (!thinkingParamRejected) body.enable_thinking = false;
  try {
    return await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const name = (err as Error).name;
    if (name === "TimeoutError" || name === "AbortError") {
      throw new LLMError("timeout", "API CBN tidak merespons dalam 30 detik");
    }
    throw new LLMError("network", "Gangguan jaringan saat menghubungi API CBN");
  }
}

async function requestOnce(model: string, messages: ChatMessage[]): Promise<ApiResponse> {
  let res = await post(model, messages);
  // Jika gateway menolak parameter opsional, buang parameter itu lalu ulangi (maksimal sekali per parameter).
  for (let i = 0; i < 2 && res.status === 400; i++) {
    const text = await res.text();
    if (!jsonModeRejected && /response_format|json_object/i.test(text)) jsonModeRejected = true;
    else if (!thinkingParamRejected && /enable_thinking/i.test(text)) thinkingParamRejected = true;
    else throw new LLMError("http", `API CBN menolak permintaan (400): ${text.slice(0, 200)}`);
    res = await post(model, messages);
  }
  if (res.status === 401 || res.status === 403) throw new LLMError("auth", "API key CBN tidak valid");
  if (res.status === 429) throw new LLMError("rate_limit", "Batas permintaan API CBN tercapai, coba lagi sebentar");
  if (res.status >= 500) throw new LLMError("network", `Server API CBN sedang bermasalah (${res.status})`);
  if (!res.ok) throw new LLMError("http", `API CBN menolak permintaan (${res.status})`);
  return (await res.json()) as ApiResponse;
}

/**
 * Panggil LLM sekali dan validasi jawabannya dengan schema Zod.
 * Retry sekali hanya untuk timeout / gangguan jaringan; JSON rusak dilempar sebagai LLMError("bad_json")
 * agar pemanggil yang mengatur batas panggilan per run.
 */
export async function callLLM<T>(opts: CallLLMOptions<T>): Promise<CallLLMResult<T>> {
  const { runId, step, model, messages, schema } = opts;

  const budget = getTokenUsage();
  if (budget.stop) throw new LLMError("budget", "Budget token hampir habis");

  const started = Date.now();

  if (isMock()) {
    const text = opts.mock ? opts.mock(process.env.LLM_MOCK_SCENARIO || undefined) : "{}";
    const usage = { inputTokens: 0, outputTokens: 0, isEstimate: false, latencyMs: Date.now() - started };
    record(runId, step, "mock", usage);
    return { data: parseAndValidate(text, schema), usage, budgetWarning: budget.warn };
  }

  let json: ApiResponse;
  try {
    json = await requestOnce(model, messages);
  } catch (err) {
    if (err instanceof LLMError && (err.code === "timeout" || err.code === "network")) {
      json = await requestOnce(model, messages);
    } else {
      throw err;
    }
  }

  const text = json.choices?.[0]?.message?.content ?? "";
  const latencyMs = Date.now() - started;
  const u = json.usage;
  const usage =
    u && typeof u.prompt_tokens === "number" && typeof u.completion_tokens === "number"
      ? { inputTokens: u.prompt_tokens, outputTokens: u.completion_tokens, isEstimate: false, latencyMs }
      : {
          inputTokens: Math.ceil(messages.reduce((n, m) => n + m.content.length, 0) / 4),
          outputTokens: Math.ceil(text.length / 4),
          isEstimate: true,
          latencyMs,
        };
  // Token tetap tercatat walaupun JSON-nya rusak, karena sudah terpakai.
  record(runId, step, model, usage);

  const budgetWarning = budget.total + usage.inputTokens + usage.outputTokens >= budgetConfig().warn;
  return { data: parseAndValidate(text, schema), usage, budgetWarning };
}
