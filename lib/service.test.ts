import { describe, it, expect, beforeEach, vi } from "vitest";

// Database di memori, diisi seed standar sebelum tiap test.
vi.hoisted(() => {
  process.env.DATABASE_PATH = ":memory:";
  process.env.LLM_MOCK = "true";
});

import { getSqlite } from "./db";
import { seedDatabase } from "./seed";
import { runResearchMatching } from "./worker/run";
import { runWorker } from "./worker/dispatch";
import { SAMPLE_GUIDEBOOKS } from "./worker/competition/guidebooks";
import {
  ApiError,
  MSG,
  approveRun,
  clarifyRun,
  createRunFromBody,
  getEvidence,
  getRunDetail,
  getScorecard,
  getWorkers,
  listRuns,
  retryRun,
  sendInvitation,
} from "./service";

const CV_BRIEF = "Butuh 2 mahasiswa Python dan Computer Vision untuk riset deteksi objek";

async function runBrief(brief: string, mode: "v1" | "v2" = "v2") {
  const { runId } = createRunFromBody({ workerId: "netra", brief, mode });
  await runResearchMatching(runId);
  return runId;
}

function expectApiError(fn: () => unknown, status: number, message?: string) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(status);
    if (message) expect((err as ApiError).message).toBe(message);
    return;
  }
  throw new Error(`Seharusnya melempar ApiError ${status}`);
}

const ledgerCalls = (runId: number) =>
  (getSqlite().prepare("SELECT count(*) AS n FROM token_ledger WHERE run_id = ?").get(runId) as { n: number }).n;

beforeEach(() => {
  delete process.env.LLM_MOCK_SCENARIO;
  process.env.LLM_MOCK = "true";
  seedDatabase(getSqlite(), { resetLedger: true });
});

describe("POST /api/runs", () => {
  it("brief < 15 karakter ditolak 400", () => {
    expectApiError(() => createRunFromBody({ workerId: "netra", brief: "Butuh CV", mode: "v2" }), 400, "Brief terlalu pendek, minimal 15 karakter.");
  });

  it("worker yang belum dirilis (kanca) ditolak 400 segera hadir", () => {
    expectApiError(() => createRunFromBody({ workerId: "kanca", brief: CV_BRIEF, mode: "v2" }), 400, MSG.comingSoon);
  });

  it("brief Netra maksimal 4.000 karakter; guidebook Jaya boleh lebih panjang", () => {
    const long = `Butuh mahasiswa Python. ${"x".repeat(4100)}`;
    expectApiError(() => createRunFromBody({ workerId: "netra", brief: long, mode: "v2" }), 400, "Brief terlalu panjang, maksimal 4.000 karakter.");
    expect(createRunFromBody({ workerId: "jaya", brief: long, mode: "v1" }).runId).toBeGreaterThan(0);
  });

  it("worker tak dikenal dan mode salah ditolak 400", () => {
    expectApiError(() => createRunFromBody({ workerId: "budi", brief: CV_BRIEF, mode: "v2" }), 400);
    expectApiError(() => createRunFromBody({ workerId: "netra", brief: CV_BRIEF, mode: "v3" }), 400);
  });

  it("run baru berstatus queued", () => {
    const { runId } = createRunFromBody({ workerId: "netra", brief: CV_BRIEF, mode: "v2" });
    expect(getRunDetail(runId).run.status).toBe("queued");
  });
});

describe("pipeline lewat API (LLM_MOCK)", () => {
  it("brief Computer Vision: profil tanam sesuai kriteria penerimaan", async () => {
    const id = await runBrief(CV_BRIEF);
    const d = getRunDetail(id);
    expect(d.run.status).toBe("awaiting_approval");
    const codes = d.result!.candidates.map((c) => c.code);
    expect(codes).toEqual(expect.arrayContaining(["S-101", "S-102", "S-103", "S-104"]));
    expect(d.result!.candidates.find((c) => c.code === "S-104")!.hiddenTalent).toBe(true);
    expect(d.result!.candidates.find((c) => c.code === "S-109")!.fairExposure).toBe(true);
    expect(codes).not.toContain("S-108"); // cuti
    expect(codes).not.toContain("S-105"); // hanya sertifikat, di bawah S-101..S-104
    expect(d.steps.map((s) => s.step)).toEqual(["parse", "normalize", "search", "score", "explain", "verify", "brief"]);
    expect(d.steps.every((s) => s.status === "done" && s.durationMs !== null)).toBe(true);
    expect(d.steps.find((s) => s.step === "parse")!.model).toBe("mock");
  });

  it("prompt injection S-107 tidak menaikkan peringkat", async () => {
    const id = await runBrief(CV_BRIEF);
    const d = getRunDetail(id);
    expect(d.result!.candidates.map((c) => c.code)).not.toContain("S-107");
    // Seluruh alasan hanya mengutip bukti milik kandidat itu sendiri.
    for (const c of d.result!.candidates) {
      for (const r of c.reasons) for (const e of r.evidence_ids) expect(c.evidenceIds).toContain(e);
    }
  });

  it("brief ambigu -> needs_clarification dengan pertanyaan", async () => {
    const id = await runBrief("cari mahasiswa yang bagus");
    const d = getRunDetail(id);
    expect(d.run.status).toBe("needs_clarification");
    expect(d.run.clarificationQuestion).toBeTruthy();
    expect(d.result).toBeNull();
  });

  it("clarify melanjutkan run dengan jawaban yang digabung ke brief", async () => {
    const id = await runBrief("cari mahasiswa yang bagus");
    expect(clarifyRun(id, { answer: "Python dan Computer Vision" })).toEqual({ runId: id, status: "queued" });
    expect(getRunDetail(id).run.brief).toContain("\n\nJawaban klarifikasi: Python dan Computer Vision");
    await runResearchMatching(id);
    const d = getRunDetail(id);
    expect(d.run.status).toBe("awaiting_approval");
    expect(d.run.clarificationQuestion).toBeNull();
    expect(d.result!.candidates[0].code).toBe("S-101");
  });

  it("clarify pada status yang salah -> 409", async () => {
    const id = await runBrief(CV_BRIEF);
    expectApiError(() => clarifyRun(id, { answer: "Python" }), 409, MSG.notClarifying);
  });

  it("tanpa kandidat >= 50 -> noMatch + 3 kandidat terdekat + skill kurang", async () => {
    const id = await runBrief("Riset Unity, Embedded C, NLP dan Cloud sekaligus");
    const r = getRunDetail(id).result!;
    expect(r.noMatch).toBe(true);
    expect(r.candidates).toHaveLength(3);
    expect(r.candidates.every((c) => c.score! < 50 && c.missingSkills.length > 0)).toBe(true);
  });

  it("bad_json -> retry explain sekali lalu alasan template, maksimal 3 panggilan", async () => {
    process.env.LLM_MOCK_SCENARIO = "bad_json";
    const id = await runBrief(CV_BRIEF);
    const d = getRunDetail(id);
    expect(d.run.status).toBe("awaiting_approval");
    expect(d.result!.candidates.every((c) => c.reasonSource === "template" && c.reasons.length > 0)).toBe(true);
    expect(ledgerCalls(id)).toBe(3);
  });

  it("fake_ids -> alasan palsu dibuang, retry, fallback template berbukti", async () => {
    process.env.LLM_MOCK_SCENARIO = "fake_ids";
    const id = await runBrief(CV_BRIEF);
    const d = getRunDetail(id);
    expect(d.steps.find((s) => s.step === "verify")!.detail).toMatch(/dibuang/);
    for (const c of d.result!.candidates) {
      expect(c.reasonSource).toBe("template");
      for (const r of c.reasons) expect(r.evidence_ids.every((e) => c.evidenceIds.includes(e))).toBe(true);
    }
    expect(ledgerCalls(id)).toBe(3);
  });

  it("mode v1 melewati langkah score", async () => {
    const id = await runBrief(CV_BRIEF, "v1");
    const d = getRunDetail(id);
    expect(d.steps.find((s) => s.step === "score")!.status).toBe("skipped");
    expect(d.result!.candidates.every((c) => c.score === null)).toBe(true);
  });

  it("refresh: GET ulang mengembalikan data utuh dan sama", async () => {
    const id = await runBrief(CV_BRIEF);
    const a = getRunDetail(id);
    const b = getRunDetail(id);
    expect(b).toEqual(a);
    expect(b.result!.candidates.length).toBe(5);
    expect(b.steps.length).toBe(7);
  });
});

describe("approval gate", () => {
  it("send tanpa approval -> 403 Butuh persetujuan dosen", async () => {
    const id = await runBrief(CV_BRIEF);
    expectApiError(() => sendInvitation(id), 403, "Butuh persetujuan dosen");
  });

  it("approve -> send SIMULASI, idempoten", async () => {
    const id = await runBrief(CV_BRIEF);
    const view = approveRun(id, { decision: "approved", candidateCodes: ["S-101", "S-104"], messageDraft: "Halo" });
    expect(view).toMatchObject({ decision: "approved", candidateCodes: ["S-101", "S-104"], sentAt: null });
    expect(getRunDetail(id).run.status).toBe("approved");
    const sent = sendInvitation(id);
    expect(sent.label).toBe("SIMULASI");
    expect(sendInvitation(id).sentAt).toBe(sent.sentAt);
    expect(getRunDetail(id).approval!.sentAt).toBe(sent.sentAt);
  });

  it("ditolak -> send tetap 403", async () => {
    const id = await runBrief(CV_BRIEF);
    approveRun(id, { decision: "rejected", candidateCodes: [], messageDraft: "" });
    expect(getRunDetail(id).run.status).toBe("rejected");
    expectApiError(() => sendInvitation(id), 403, MSG.needApproval);
  });

  it("approve di status yang salah -> 409; kandidat di luar Link Brief -> 400", async () => {
    const id = await runBrief(CV_BRIEF);
    expectApiError(() => approveRun(id, { decision: "approved", candidateCodes: ["S-108"], messageDraft: "x" }), 400);
    expectApiError(() => approveRun(id, { decision: "approved", candidateCodes: [], messageDraft: "x" }), 400);
    approveRun(id, { decision: "approved", candidateCodes: ["S-101"], messageDraft: "x" });
    expectApiError(() => approveRun(id, { decision: "approved", candidateCodes: ["S-101"], messageDraft: "x" }), 409, MSG.notAwaiting);
  });
});

describe("retry", () => {
  it("hanya untuk run gagal; langkah lama tetap tersimpan", async () => {
    const ok = await runBrief(CV_BRIEF);
    expectApiError(() => retryRun(ok), 409, MSG.notFailed);

    // Gagal karena konfigurasi API CBN tidak ada (mode asli tanpa key).
    process.env.LLM_MOCK = "false";
    const saved = { base: process.env.CBN_API_BASE_URL, key: process.env.CBN_API_KEY };
    delete process.env.CBN_API_BASE_URL;
    delete process.env.CBN_API_KEY;
    const id = await runBrief(CV_BRIEF);
    process.env.CBN_API_BASE_URL = saved.base;
    process.env.CBN_API_KEY = saved.key;
    if (saved.base === undefined) delete process.env.CBN_API_BASE_URL;
    if (saved.key === undefined) delete process.env.CBN_API_KEY;

    const failed = getRunDetail(id);
    expect(failed.run.status).toBe("failed");
    expect(failed.run.errorMessage).toMatch(/API CBN/);
    expect(failed.steps).toEqual([expect.objectContaining({ step: "parse", status: "failed" })]);

    process.env.LLM_MOCK = "true";
    expect(retryRun(id)).toEqual({ runId: id, status: "queued" });
    await runResearchMatching(id);
    const d = getRunDetail(id);
    expect(d.run.status).toBe("awaiting_approval");
    expect(d.run.errorMessage).toBeNull();
    expect(d.steps[0]).toMatchObject({ step: "parse", status: "failed" });
    expect(d.steps.at(-1)).toMatchObject({ step: "brief", status: "done" });
  });
});

describe("endpoint baca", () => {
  it("GET /api/runs/:id tak dikenal -> 404", () => {
    expectApiError(() => getRunDetail(9999), 404, MSG.notFound);
  });

  it("GET /api/evidence/:id", () => {
    const e = getEvidence("EV-449");
    expect(e).toMatchObject({ id: "EV-449", studentCode: "S-101", sourceLabel: "Sintetis", type: "project" });
    expect(e.skills).toEqual(expect.arrayContaining(["Python", "Computer Vision"]));
    expectApiError(() => getEvidence("EV-999"), 404, MSG.evidenceNotFound);
  });

  it("GET /api/worker: status, budget, token per worker", async () => {
    const w = getWorkers();
    expect(w.workers.find((x) => x.id === "netra")!.status).toBe("siap");
    expect(w.workers.find((x) => x.id === "jaya")!.status).toBe("siap");
    expect(w.workers.find((x) => x.id === "kanca")!.status).toBe("segera_hadir");
    expect(w.usage.budget).toBe(10_000_000);
    const { runId } = createRunFromBody({ workerId: "netra", brief: CV_BRIEF, mode: "v2" });
    const busy = getWorkers().workers.find((x) => x.id === "netra")!;
    expect(busy).toMatchObject({ status: "bekerja", activeRunId: runId });
  });

  it("GET /api/runs: terbaru dulu, cuplikan <= 120 karakter", async () => {
    const a = await runBrief(CV_BRIEF);
    const b = await runBrief(`${"Riset IoT dengan ESP32 ".repeat(10)}`);
    const { runs } = listRuns();
    expect(runs.map((r) => r.id)).toEqual([b, a]);
    expect(runs[0].briefPreview.length).toBeLessThanOrEqual(120);
  });

  it("GET /api/scorecard tanpa hasil eval -> empty + hint", () => {
    expect(getScorecard("/tidak/ada/results.json")).toEqual({ empty: true, hint: "Jalankan npm run eval" });
  });

  it("tidak ada alur yang mengubah students atau evidence", async () => {
    const count = () => getSqlite().prepare("SELECT (SELECT count(*) FROM students) || '/' || (SELECT count(*) FROM evidence) AS n").get();
    const before = count();
    const id = await runBrief(CV_BRIEF);
    approveRun(id, { decision: "approved", candidateCodes: ["S-101"], messageDraft: "x" });
    sendInvitation(id);
    expect(count()).toEqual(before);
  });
});

describe("seed", () => {
  it("mempertahankan token_ledger agar budget CBN tetap jujur; --reset-ledger mengosongkannya", async () => {
    const id = await runBrief(CV_BRIEF);
    const db = getSqlite();
    db.prepare("UPDATE token_ledger SET input_tokens = 100, output_tokens = 50 WHERE run_id = ?").run(id);
    const total = () => (db.prepare("SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS n FROM token_ledger").get() as { n: number }).n;
    const before = total();
    expect(before).toBeGreaterThan(0);

    seedDatabase(db);
    expect(total()).toBe(before);
    expect(getWorkers().usage.total).toBe(before);
    expect(listRuns().runs).toEqual([]);

    seedDatabase(db, { resetLedger: true });
    expect(total()).toBe(0);
  });
});

describe("Competition Matching (Jaya) lewat API", () => {
  const guidebook = (id: string) => SAMPLE_GUIDEBOOKS.find((g) => g.id === id)!.text;
  async function runJaya(text: string) {
    const { runId } = createRunFromBody({ workerId: "jaya", brief: text, mode: "v1" });
    await runWorker(runId);
    return runId;
  }

  it("guidebook AI: tim tersusun, tanpa dobel, alasan berbukti, 7 langkah sama", async () => {
    const id = await runJaya(guidebook("ai-nasional"));
    const d = getRunDetail(id);
    expect(d.run.status).toBe("awaiting_approval");
    expect(d.run.mode).toBe("v2"); // Jaya selalu jalur hemat
    expect(d.steps.map((s) => s.step)).toEqual(["parse", "normalize", "search", "score", "explain", "verify", "brief"]);
    const c = d.result!.competition!;
    expect(c.teamSize).toBe(3);
    expect(c.teamCount).toBe(2);
    const codes = c.teams.flatMap((t) => t.members.map((m) => m.code));
    expect(new Set(codes).size).toBe(codes.length);
    expect(d.result!.candidates.map((x) => x.code)).toEqual(codes);
    for (const m of d.result!.candidates) {
      expect(m.role).toBeTruthy();
      expect(m.team).toBeGreaterThanOrEqual(1);
      for (const r of m.reasons) for (const e of r.evidence_ids) expect(m.evidenceIds).toContain(e);
    }
  });

  it("AC-14: mahasiswa tidak aktif tersaring dengan alasan tertulis", async () => {
    const id = await runJaya(guidebook("ai-nasional"));
    const c = getRunDetail(id).result!.competition!;
    expect(c.excluded.find((e) => e.code === "S-108")!.reasons).toContain("Berstatus cuti, bukan mahasiswa aktif");
    expect(c.excluded.every((e) => e.reasons.length > 0)).toBe(true);
    expect(c.eligibleCount + c.excluded.length).toBe(c.screenedCount);
    const members = c.teams.flatMap((t) => t.members.map((m) => m.code));
    expect(members.some((m) => c.excluded.some((e) => e.code === m))).toBe(false);
  });

  it("guidebook IoT: syarat prodi menyaring prodi lain dan S-106 masuk tim", async () => {
    const id = await runJaya(guidebook("iot-smart-campus"));
    const c = getRunDetail(id).result!.competition!;
    expect(c.rules).toContain("Prodi: Teknik Komputer, Teknik Informatika");
    expect(c.excluded.some((e) => e.reasons.some((r) => r.startsWith("Prodi Teknologi Game")))).toBe(true);
    expect(c.teams[0].members.map((m) => m.code)).toContain("S-106");
  });

  it("guidebook tanpa jumlah anggota dan bidang -> needs_clarification", async () => {
    const id = await runJaya("Kami ingin mengirim mahasiswa ke sebuah lomba tahun ini.");
    const d = getRunDetail(id);
    expect(d.run.status).toBe("needs_clarification");
    expect(d.run.clarificationQuestion).toBeTruthy();
  });

  it("Conflict Check lintas unit: anggota yang baru disetujui riset Netra diberi peringatan", async () => {
    const netra = await runBrief(CV_BRIEF);
    const shortlist = getRunDetail(netra).result!.candidates.map((c) => c.code);
    approveRun(netra, { decision: "approved", candidateCodes: shortlist, messageDraft: "x" });
    const id = await runJaya(guidebook("ai-nasional"));
    const c = getRunDetail(id).result!.competition!;
    const overlap = c.teams.flatMap((t) => t.members.map((m) => m.code)).filter((m) => shortlist.includes(m));
    expect(overlap.length).toBeGreaterThan(0);
    for (const code of overlap) {
      expect(c.conflicts).toContainEqual(expect.objectContaining({ code, kind: "research_invite" }));
    }
  });

  it("approve dan kirim SIMULASI berlaku sama untuk usulan tim", async () => {
    const id = await runJaya(guidebook("ai-nasional"));
    const members = getRunDetail(id).result!.competition!.teams[0].members.map((m) => m.code);
    expectApiError(() => sendInvitation(id), 403, MSG.needApproval);
    approveRun(id, { decision: "approved", candidateCodes: members, messageDraft: "Undangan seleksi" });
    expect(sendInvitation(id).label).toBe("SIMULASI");
  });
});
