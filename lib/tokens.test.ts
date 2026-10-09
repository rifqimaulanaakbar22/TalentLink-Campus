import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Database di memori, diisi seed standar sebelum tiap test.
vi.hoisted(() => {
  process.env.DATABASE_PATH = ":memory:";
  process.env.LLM_MOCK = "true";
});

import { getDb, nowIso } from "./db";
import { seedDatabase } from "./seed";
import { ApiError, MSG, createRunFromBody, retryRun } from "./service";
import { computeSavings, getTokenReport } from "./tokens";

const BRIEF = "Butuh 2 mahasiswa Python dan Computer Vision untuk riset deteksi objek";

async function addRun(workerId: "netra" | "jaya", mode: "v1" | "v2", status: string): Promise<number> {
  const now = nowIso();
  const res = await (await getDb()).run(
    `INSERT INTO runs (worker_id, skill, mode, brief_text, status, created_at, updated_at)
     VALUES (?, ?, ?, 'brief uji', ?, ?, ?)`,
    workerId, workerId === "jaya" ? "competition" : "research", mode, status, now, now,
  );
  return res.lastInsertRowid;
}

async function addCall(runId: number | null, step: string, input: number, output: number, isEstimate = false) {
  await (await getDb()).run(
    `INSERT INTO token_ledger (run_id, step, model, input_tokens, output_tokens, latency_ms, is_estimate, created_at)
     VALUES (?, ?, 'qwen-uji', ?, ?, 100, ?, ?)`,
    runId, step, input, output, isEstimate ? 1 : 0, nowIso(),
  );
}

/** Pemakaian contoh: total 44.800 token. */
async function seedUsage() {
  const v1 = await addRun("netra", "v1", "approved");
  await addCall(v1, "parse", 400, 100);
  await addCall(v1, "explain", 27_000, 3_000);
  const v2 = await addRun("netra", "v2", "awaiting_approval");
  await addCall(v2, "parse", 400, 100);
  await addCall(v2, "explain", 4_000, 1_500, true);
  // Penugasan gagal dan penugasan Jaya tidak ikut perbandingan jalur.
  const failed = await addRun("netra", "v2", "failed");
  await addCall(failed, "parse", 400, 100);
  const jaya = await addRun("jaya", "v2", "awaiting_approval");
  await addCall(jaya, "parse", 600, 200);
  await addCall(jaya, "explain", 5_000, 1_000);
  // Token dari penugasan yang sudah terhapus saat seed ulang.
  await addCall(null, "explain", 800, 200);
  return { v1, v2, failed, jaya };
}

async function expectApiError(p: Promise<unknown>, status: number, message: string) {
  try {
    await p;
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(status);
    expect((err as ApiError).message).toBe(message);
    return;
  }
  throw new Error(`Seharusnya melempar ApiError ${status}`);
}

beforeEach(async () => {
  await seedDatabase(await getDb(), { resetLedger: true });
});

afterEach(() => {
  delete process.env.TOKEN_BUDGET_TOTAL;
});

describe("computeSavings", () => {
  it("null jika salah satu jalur belum punya penugasan", () => {
    expect(computeSavings({ runs: 0, tokens: 0, avgPerRun: 0 }, { runs: 3, tokens: 18_000, avgPerRun: 6_000 })).toBeNull();
    expect(computeSavings({ runs: 2, tokens: 60_000, avgPerRun: 30_000 }, { runs: 0, tokens: 0, avgPerRun: 0 })).toBeNull();
  });

  it("null jika jalur pembanding tercatat 0 token (mode mock)", () => {
    expect(computeSavings({ runs: 1, tokens: 0, avgPerRun: 0 }, { runs: 1, tokens: 0, avgPerRun: 0 })).toBeNull();
  });

  it("menghitung persen lebih hemat dan token yang dihemat", () => {
    expect(computeSavings({ runs: 2, tokens: 60_000, avgPerRun: 30_000 }, { runs: 3, tokens: 18_000, avgPerRun: 6_000 })).toEqual({
      percent: 80,
      tokens: 72_000,
    });
  });
});

describe("getTokenReport", () => {
  it("database kosong: semua nol, sisa sampai batas berhenti, pembanding terbuka", async () => {
    const r = await getTokenReport();
    expect(r.usage.total).toBe(0);
    expect(r.warnAt).toBe(8_000_000);
    expect(r.stopAt).toBe(9_500_000);
    expect(r.remaining).toBe(9_500_000);
    expect(r.comparisonLocked).toBe(false);
    expect(r.byMode.v1).toEqual({ runs: 0, tokens: 0, avgPerRun: 0 });
    expect(r.byMode.v2).toEqual({ runs: 0, tokens: 0, avgPerRun: 0 });
    expect(r.savings).toBeNull();
    expect(r.byStep).toEqual([]);
    expect(r.calls).toBe(0);
    expect(r.unassigned).toBe(0);
  });

  it("merangkum per jalur (hanya penugasan Netra yang selesai), per langkah, dan per worker", async () => {
    await seedUsage();
    const r = await getTokenReport();
    expect(r.usage.total).toBe(44_800);
    expect(r.usage.byWorker.netra).toBe(37_000);
    expect(r.usage.byWorker.jaya).toBe(6_800);
    expect(r.unassigned).toBe(1_000);
    expect(r.byMode.v1).toEqual({ runs: 1, tokens: 30_500, avgPerRun: 30_500 });
    expect(r.byMode.v2).toEqual({ runs: 1, tokens: 6_000, avgPerRun: 6_000 });
    expect(r.savings).toEqual({ percent: 80.3, tokens: 24_500 });
    expect(r.byStep).toEqual([
      { step: "explain", calls: 4, tokens: 42_500 },
      { step: "parse", calls: 4, tokens: 2_300 },
    ]);
    expect(r.calls).toBe(8);
    expect(r.estimatedCalls).toBe(1);
  });

  it("penugasan bertoken 0 (LLM_MOCK) tidak menurunkan rata-rata jalur", async () => {
    await seedUsage();
    const mockRun = await addRun("netra", "v1", "awaiting_approval");
    await addCall(mockRun, "parse", 0, 0);
    await addCall(mockRun, "explain", 0, 0);
    const r = await getTokenReport();
    expect(r.byMode.v1).toEqual({ runs: 1, tokens: 30_500, avgPerRun: 30_500 });
    expect(r.calls).toBe(10);
  });

  it("anggaran kecil: batas dihitung dari TOKEN_BUDGET_TOTAL dan pembanding dikunci di atas batas peringatan", async () => {
    process.env.TOKEN_BUDGET_TOTAL = "50000";
    await seedUsage();
    const r = await getTokenReport();
    expect(r.warnAt).toBe(40_000);
    expect(r.stopAt).toBe(47_500);
    expect(r.remaining).toBe(2_700);
    expect(r.comparisonLocked).toBe(true);
    expect(r.usage.stop).toBe(false);
  });
});

describe("Rem anggaran di POST /api/runs dan retry", () => {
  it("di bawah batas peringatan kedua jalur boleh dipakai", async () => {
    await seedUsage();
    expect((await createRunFromBody({ workerId: "netra", brief: BRIEF, mode: "v1" })).runId).toBeGreaterThan(0);
    expect((await createRunFromBody({ workerId: "netra", brief: BRIEF, mode: "v2" })).runId).toBeGreaterThan(0);
  });

  it("di atas batas peringatan Jalur Pembanding ditolak 409, Jalur Hemat dan Jaya tetap jalan", async () => {
    process.env.TOKEN_BUDGET_TOTAL = "50000";
    await seedUsage();
    await expectApiError(createRunFromBody({ workerId: "netra", brief: BRIEF, mode: "v1" }), 409, MSG.comparisonLocked);
    expect((await createRunFromBody({ workerId: "netra", brief: BRIEF, mode: "v2" })).runId).toBeGreaterThan(0);
    // Jaya selalu memakai Jalur Hemat, jadi mode v1 dari klien tidak dikunci.
    expect((await createRunFromBody({ workerId: "jaya", brief: BRIEF, mode: "v1" })).runId).toBeGreaterThan(0);
  });

  it("di atas batas berhenti semua penugasan baru ditolak 409", async () => {
    process.env.TOKEN_BUDGET_TOTAL = "45000";
    await seedUsage();
    await expectApiError(createRunFromBody({ workerId: "netra", brief: BRIEF, mode: "v2" }), 409, MSG.budgetStop);
    await expectApiError(createRunFromBody({ workerId: "jaya", brief: BRIEF, mode: "v2" }), 409, MSG.budgetStop);
  });

  it("coba lagi penugasan Jalur Pembanding ikut dikunci di atas batas peringatan", async () => {
    process.env.TOKEN_BUDGET_TOTAL = "50000";
    await seedUsage();
    const failedV1 = await addRun("netra", "v1", "failed");
    await expectApiError(retryRun(failedV1), 409, MSG.comparisonLocked);
    const failedV2 = await addRun("netra", "v2", "failed");
    expect((await retryRun(failedV2)).status).toBe("queued");
  });

  it("validasi body tetap didahulukan sebelum rem anggaran", async () => {
    process.env.TOKEN_BUDGET_TOTAL = "45000";
    await seedUsage();
    await expectApiError(createRunFromBody({ workerId: "netra", brief: "pendek", mode: "v2" }), 400, "Brief terlalu pendek, minimal 15 karakter.");
  });
});
