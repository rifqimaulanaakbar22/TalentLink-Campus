// Neraca Token: ringkasan pemakaian token untuk halaman /tokens dan rem anggaran Jalur Hemat.
// Hanya membaca token_ledger; pencatatan tetap di lib/llm.ts.
import { getSqlite } from "./db";
import { budgetConfig, getTokenUsage } from "./llm";
import type { TokenModeStats, TokenReport, TokenStepStats } from "./api-types";
import type { RunMode, StepName } from "./types";

function sql() {
  const db = getSqlite();
  return {
    // Perbandingan jalur hanya untuk penugasan Netra yang sudah menghasilkan Link Brief:
    // Jaya selalu Jalur Hemat dan brief-nya guidebook panjang, jadi tidak sebanding.
    // Penugasan bertoken 0 (LLM_MOCK) dilewati agar tidak menurunkan rata-rata.
    byMode: db.prepare(
      `SELECT r.mode AS mode, COUNT(*) AS runs, SUM(t.n) AS tokens
       FROM runs r
       JOIN (SELECT run_id, SUM(input_tokens + output_tokens) AS n FROM token_ledger GROUP BY run_id) t
         ON t.run_id = r.id
       WHERE r.worker_id = 'netra' AND r.status IN ('awaiting_approval', 'approved', 'rejected') AND t.n > 0
       GROUP BY r.mode`,
    ),
    byStep: db.prepare(
      `SELECT step, COUNT(*) AS calls, SUM(input_tokens + output_tokens) AS tokens, SUM(is_estimate) AS estimated
       FROM token_ledger GROUP BY step ORDER BY tokens DESC, step`,
    ),
  };
}
let stmts: ReturnType<typeof sql> | null = null;
const q = () => (stmts ??= sql());

const emptyMode = (): TokenModeStats => ({ runs: 0, tokens: 0, avgPerRun: 0 });

/** Penghematan Jalur Hemat (v2) dibanding Jalur Pembanding (v1). null jika belum bisa dibandingkan. */
export function computeSavings(v1: TokenModeStats, v2: TokenModeStats): TokenReport["savings"] {
  if (v1.runs === 0 || v2.runs === 0 || v1.tokens <= 0) return null;
  const avgV1 = v1.tokens / v1.runs;
  const avgV2 = v2.tokens / v2.runs;
  return {
    percent: Math.round((1 - avgV2 / avgV1) * 1000) / 10,
    // Token yang tidak terpakai karena penugasan Jalur Hemat tidak dijalankan lewat Jalur Pembanding.
    tokens: Math.round(v2.runs * (avgV1 - avgV2)),
  };
}

export function getTokenReport(): TokenReport {
  const usage = getTokenUsage();
  const { warn, stop } = budgetConfig();

  const byMode: Record<RunMode, TokenModeStats> = { v1: emptyMode(), v2: emptyMode() };
  for (const r of q().byMode.all() as { mode: RunMode; runs: number; tokens: number }[]) {
    byMode[r.mode] = { runs: r.runs, tokens: r.tokens, avgPerRun: r.runs ? Math.round(r.tokens / r.runs) : 0 };
  }

  const stepRows = q().byStep.all() as { step: StepName; calls: number; tokens: number; estimated: number }[];
  const byStep: TokenStepStats[] = stepRows.map(({ step, calls, tokens }) => ({ step, calls, tokens }));
  const stopAt = Math.round(stop);
  const assigned = Object.values(usage.byWorker).reduce((n, x) => n + x, 0);

  return {
    usage,
    warnAt: Math.round(warn),
    stopAt,
    remaining: Math.max(0, stopAt - usage.total),
    comparisonLocked: usage.warn,
    byMode,
    savings: computeSavings(byMode.v1, byMode.v2),
    byStep,
    calls: stepRows.reduce((n, r) => n + r.calls, 0),
    estimatedCalls: stepRows.reduce((n, r) => n + r.estimated, 0),
    unassigned: usage.total - assigned,
  };
}
