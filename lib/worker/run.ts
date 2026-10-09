import { getSqlite, nowIso } from "../db";
import { LLMError } from "../llm";
import workers from "../workers.json";
import type { Criteria, Evidence, NormalizedCriteria, ResultCandidate, RunMode, RunResult, RunStatus, StepName } from "../types";
import { parseBrief } from "./parse";
import { getSkillCatalog, normalizeCriteria } from "./normalize";
import { countActiveStudents, loadAllEvidence, searchCandidates } from "./search";
import { scoreCandidates, topEvidence } from "./score";
import { explainCandidates, type ExplainCandidate } from "./explain";
import { verifyExplanations, type Explanation, type PackageCandidate } from "./verify";

export const MAX_LLM_CALLS = 3;
const SHORTLIST_SIZE = 5;
const NO_MATCH_SIZE = 3;
const NO_MATCH_THRESHOLD = 50;
const MAX_EVIDENCE_V2 = 4;

type RunRow = { id: number; worker_id: string; mode: RunMode; brief_text: string; criteria_json: string | null };

function sql() {
  const db = getSqlite();
  return {
    getRun: db.prepare("SELECT id, worker_id, mode, brief_text, criteria_json FROM runs WHERE id = ?"),
    setStatus: db.prepare("UPDATE runs SET status = ?, error_message = ?, updated_at = ? WHERE id = ?"),
    setCriteria: db.prepare("UPDATE runs SET criteria_json = ?, updated_at = ? WHERE id = ?"),
    setResult: db.prepare("UPDATE runs SET result_json = ?, status = ?, error_message = NULL, updated_at = ? WHERE id = ?"),
    startStep: db.prepare("INSERT INTO run_steps (run_id, step, status, started_at, detail) VALUES (?, ?, 'running', ?, ?)"),
    endStep: db.prepare("UPDATE run_steps SET status = ?, ended_at = ?, detail = ? WHERE id = ?"),
    insertRun: db.prepare(
      `INSERT INTO runs (worker_id, skill, mode, brief_text, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'queued', ?, ?)`,
    ),
  };
}
let stmts: ReturnType<typeof sql> | null = null;
const q = () => (stmts ??= sql());

export function createRun(opts: { workerId?: string; brief: string; mode: RunMode }): number {
  const now = nowIso();
  const workerId = opts.workerId ?? "netra";
  const skill = workerId === "jaya" ? "competition" : "research";
  // Jaya selalu memakai jalur hemat (v2).
  const mode = workerId === "jaya" ? "v2" : opts.mode;
  return Number(q().insertRun.run(workerId, skill, mode, opts.brief, now, now).lastInsertRowid);
}

export function workerName(id: string): string {
  return workers.find((w) => w.id === id)?.nama ?? "Digital Worker";
}

/** Pencatat langkah: setiap langkah punya waktu mulai/selesai; langkah yang sedang jalan ditandai gagal jika error. */
export class Steps {
  current: number | null = null;
  constructor(private runId: number) {}
  start(step: StepName, detail: string) {
    this.current = Number(q().startStep.run(this.runId, step, nowIso(), detail).lastInsertRowid);
  }
  done(detail: string) {
    if (this.current !== null) q().endStep.run("done", nowIso(), detail, this.current);
    this.current = null;
  }
  skip(step: StepName, detail: string) {
    const now = nowIso();
    const id = Number(q().startStep.run(this.runId, step, now, detail).lastInsertRowid);
    q().endStep.run("skipped", now, detail, id);
  }
  fail(detail: string) {
    if (this.current !== null) q().endStep.run("failed", nowIso(), detail, this.current);
    this.current = null;
  }
}

const uniqueById = (evidence: Evidence[]) => {
  const seen = new Set<string>();
  return evidence.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
};

const toPackage = (c: ExplainCandidate): PackageCandidate => ({
  code: c.code,
  evidence: c.evidence.map((e) => ({ id: e.id, type: e.type, title: e.title, grade: e.grade })),
});

/**
 * Jalankan Research Matching untuk satu run: parse → normalize → search → score → explain → verify → brief.
 * Jika criteria_json sudah tersimpan (retry / setelah klarifikasi dijawab ulang), parse dilewati.
 */
export async function runResearchMatching(runId: number): Promise<RunStatus> {
  const run = q().getRun.get(runId) as RunRow | undefined;
  if (!run) throw new Error(`Run ${runId} tidak ditemukan`);
  const name = workerName(run.worker_id);
  const steps = new Steps(runId);
  const setStatus = (s: RunStatus, err: string | null = null) => q().setStatus.run(s, err, nowIso(), runId);
  let llmCalls = 0;
  let budgetWarning = false;

  setStatus("running");
  try {
    // 1. parse
    let criteria: Criteria | null = run.criteria_json ? (JSON.parse(run.criteria_json) as Criteria) : null;
    if (!criteria || criteria.needs_clarification) {
      steps.start("parse", `${name} membaca brief dosen…`);
      // Sesuai skill backend-efisien: hanya explain yang boleh di-retry; parse cukup sekali.
      let parsed;
      try {
        llmCalls++;
        parsed = await parseBrief(runId, run.brief_text);
      } catch (err) {
        if (err instanceof LLMError && err.code === "bad_json") {
          throw new LLMError("bad_json", `${name} tidak bisa membaca jawaban AI saat memahami brief. Silakan coba lagi.`);
        }
        throw err;
      }
      budgetWarning ||= parsed.budgetWarning;
      criteria = parsed.data;
      q().setCriteria.run(JSON.stringify(criteria), nowIso(), runId);
      const mentionedSkills = criteria.required_skills.length + criteria.nice_skills.length + (criteria.unknown_skills?.length ?? 0);
      // Brief yang menyebut skill (meski di luar katalog) tidak ditanya balik; skill di luar katalog di-cut di normalize.
      if (mentionedSkills === 0 || (criteria.needs_clarification && (criteria.unknown_skills?.length ?? 0) === 0)) {
        const question = criteria.question || "Topik riset atau skill apa yang Bapak/Ibu butuhkan?";
        criteria = { ...criteria, needs_clarification: true, question };
        q().setCriteria.run(JSON.stringify(criteria), nowIso(), runId);
        steps.done(`${name} butuh klarifikasi: ${question}`);
        setStatus("needs_clarification");
        return "needs_clarification";
      }
      steps.done(
        `${name} memahami brief: topik "${criteria.topic}", skill wajib ${criteria.required_skills.join(", ") || "-"}` +
          (criteria.nice_skills.length ? `, tambahan ${criteria.nice_skills.join(", ")}` : "") +
          (criteria.min_semester ? `, semester ≥ ${criteria.min_semester}` : "") +
          `, butuh ${criteria.count} orang.`,
      );
    }

    // 2. normalize
    steps.start("normalize", `${name} mencocokkan nama skill dengan katalog…`);
    let norm: NormalizedCriteria = normalizeCriteria(criteria);
    if (norm.requiredSkillIds.length === 0 && norm.niceSkillIds.length > 0) {
      // Tanpa skill wajib yang dikenal, skill tambahan dipakai sebagai syarat pencarian.
      norm = { ...norm, requiredSkillIds: norm.niceSkillIds, niceSkillIds: [] };
    }
    const { names } = getSkillCatalog();
    const reqNames = norm.requiredSkillIds.map((id) => names[id]);
    const niceNames = norm.niceSkillIds.map((id) => names[id]);
    steps.done(
      `${name} memetakan ${norm.requiredSkillIds.length + norm.niceSkillIds.length} skill ke katalog` +
        (reqNames.length ? ` (wajib: ${reqNames.join(", ")}${niceNames.length ? `; tambahan: ${niceNames.join(", ")}` : ""})` : "") +
        (norm.unknownSkills.length ? `. Tidak dikenal di katalog: ${norm.unknownSkills.join(", ")}.` : "."),
    );

    // Skill wajib di luar katalog: hentikan sekarang. Mencari dengan sisa skill saja menghasilkan
    // kandidat yang menyesatkan (misalnya ahli Python biasa untuk riset blockchain).
    if (norm.unknownRequired.length > 0) {
      const list = norm.unknownRequired.join(", ");
      for (const s of ["search", "score", "explain", "verify"] as const) {
        steps.skip(s, `Dilewati: ${list} belum ada di katalog skill kampus.`);
      }
      steps.start("brief", `${name} menyusun Link Brief…`);
      const result: RunResult = {
        mode: run.mode,
        topic: norm.topic,
        requiredSkills: reqNames,
        niceSkills: niceNames,
        unknownSkills: norm.unknownSkills,
        noMatch: true,
        candidates: [],
        invitationDraft: "",
        budgetWarning,
      };
      q().setResult.run(JSON.stringify(result), "awaiting_approval", nowIso(), runId);
      steps.done(
        `${name} berhenti: ${list} belum ada di katalog skill kampus, jadi tidak ada bukti mahasiswa yang bisa dicocokkan. ` +
          `Ubah kebutuhan dengan skill lain.`,
      );
      return "awaiting_approval";
    }

    // 3. search
    const active = countActiveStudents();
    steps.start("search", `${name} menelusuri ${active} profil mahasiswa aktif…`);
    const found = searchCandidates({
      requiredSkillIds: norm.requiredSkillIds,
      niceSkillIds: norm.niceSkillIds,
      minSemester: norm.min_semester,
    });
    steps.done(`${name} menelusuri ${active} profil aktif dan menemukan ${found.length} kandidat dengan bukti relevan.`);

    const relevantIds = [...norm.requiredSkillIds, ...norm.niceSkillIds];
    const missingOf = (ev: Evidence[]) => {
      const has = new Set(ev.map((e) => e.skillId));
      return norm.requiredSkillIds.filter((id) => !has.has(id)).map((id) => names[id]);
    };

    // 4. score (v2) — v1 menyerahkan ranking ke LLM
    let explainInput: ExplainCandidate[];
    let noMatch = false;
    const flags = new Map<string, { score: number | null; hiddenTalent: boolean; fairExposure: boolean; missing: string[] }>();
    if (run.mode === "v2") {
      steps.start("score", `${name} menghitung skor ${found.length} kandidat di kode…`);
      const scored = scoreCandidates(found, { requiredSkillIds: norm.requiredSkillIds, niceSkillIds: norm.niceSkillIds, skillNames: names });
      noMatch = !scored.some((c) => c.score >= NO_MATCH_THRESHOLD);
      const top = scored.slice(0, noMatch ? NO_MATCH_SIZE : SHORTLIST_SIZE);
      for (const c of top) {
        flags.set(c.code, { score: c.score, hiddenTalent: c.hiddenTalent, fairExposure: c.fairExposure, missing: c.missingSkills });
      }
      explainInput = top.map((c) => ({
        code: c.code,
        prodi: c.prodi,
        semester: c.semester,
        score: c.score,
        missingSkills: c.missingSkills,
        evidence: topEvidence(c.evidence, relevantIds, MAX_EVIDENCE_V2),
      }));
      steps.done(
        scored.length === 0
          ? `${name} tidak menemukan kandidat untuk dinilai.`
          : noMatch
            ? `${name} menilai ${scored.length} kandidat; tidak ada yang mencapai skor ${NO_MATCH_THRESHOLD}. Menyiapkan ${top.length} kandidat terdekat.`
            : `${name} menilai ${scored.length} kandidat; skor tertinggi ${scored[0].code} (${scored[0].score}).`,
      );
    } else {
      steps.skip("score", `Mode v1: ${name} tidak menghitung skor; ranking diserahkan ke LLM.`);
      const all = loadAllEvidence(found.map((c) => c.code));
      explainInput = found.map((c) => ({
        code: c.code,
        prodi: c.prodi,
        semester: c.semester,
        score: null,
        missingSkills: missingOf(c.evidence),
        evidence: uniqueById(all.get(c.code) ?? []),
      }));
      for (const c of found) {
        flags.set(c.code, { score: null, hiddenTalent: false, fairExposure: c.activeCommitments >= 2, missing: missingOf(c.evidence) });
      }
    }

    // 5. explain
    let explanation: Explanation | null = null;
    if (explainInput.length === 0) {
      steps.skip("explain", `${name} tidak punya kandidat untuk dijelaskan.`);
    } else {
      steps.start(
        "explain",
        run.mode === "v2"
          ? `${name} menyusun alasan berbukti untuk ${explainInput.length} kandidat teratas…`
          : `${name} mengirim ${explainInput.length} kandidat beserta seluruh buktinya ke LLM untuk diranking…`,
      );
      try {
        llmCalls++;
        const res = await explainCandidates({
          runId,
          mode: run.mode,
          topic: norm.topic,
          requiredSkills: reqNames,
          niceSkills: niceNames,
          candidates: explainInput,
        });
        budgetWarning ||= res.budgetWarning;
        explanation = res.data;
        steps.done(`${name} menerima alasan untuk ${explanation.candidates.length} kandidat.`);
      } catch (err) {
        if (!(err instanceof LLMError && err.code === "bad_json")) throw err;
        steps.done(`${name} menerima jawaban AI yang tidak bisa dibaca; akan dicoba ulang di verifikasi.`);
      }
    }

    // Paket yang diverifikasi: v2 = top kandidat urutan kode; v1 = urutan dari LLM (kode valid saja).
    const inputByCode = new Map(explainInput.map((c) => [c.code, c]));
    let pkgCands: ExplainCandidate[];
    if (run.mode === "v1") {
      const ranked = (explanation?.candidates ?? []).map((c) => inputByCode.get(c.code)).filter((c): c is ExplainCandidate => !!c);
      const fallback = [...explainInput].sort((a, b) => b.evidence.length - a.evidence.length || (a.code < b.code ? -1 : 1));
      pkgCands = uniqueByCode(ranked.length ? ranked : fallback).slice(0, SHORTLIST_SIZE);
    } else {
      pkgCands = explainInput;
    }

    // 6. verify
    steps.start("verify", `${name} memeriksa setiap sitasi bukti…`);
    const verified = await verifyExplanations({
      pkg: pkgCands.map(toPackage),
      explanation,
      retry:
        llmCalls < MAX_LLM_CALLS && pkgCands.length > 0
          ? async (codes) => {
              llmCalls++;
              try {
                const res = await explainCandidates({
                  runId,
                  step: "verify",
                  mode: "v2", // kandidat sudah terurut; retry hanya meminta alasan
                  topic: norm.topic,
                  requiredSkills: reqNames,
                  niceSkills: niceNames,
                  candidates: pkgCands.filter((c) => codes.includes(c.code)),
                });
                budgetWarning ||= res.budgetWarning;
                return res.data;
              } catch (err) {
                if (err instanceof LLMError && err.code === "bad_json") return null;
                throw err;
              }
            }
          : undefined,
    });
    const reasonCount = verified.candidates.reduce((n, c) => n + c.reasons.length, 0);
    steps.done(
      `${name} memeriksa sitasi: ${reasonCount} alasan siap, ${verified.dropped} dibuang karena ID bukti tidak valid` +
        (verified.retried ? ", explain dicoba ulang sekali" : "") +
        (verified.templated.length ? `, alasan template untuk ${verified.templated.join(", ")}` : "") +
        ".",
    );

    // 7. brief
    steps.start("brief", `${name} menyusun Link Brief…`);
    const vByCode = new Map(verified.candidates.map((c) => [c.code, c]));
    const candidates: ResultCandidate[] = pkgCands.map((c) => {
      const f = flags.get(c.code)!;
      const v = vByCode.get(c.code)!;
      return {
        code: c.code,
        prodi: c.prodi,
        semester: c.semester,
        score: f.score,
        hiddenTalent: f.hiddenTalent,
        fairExposure: f.fairExposure,
        missingSkills: f.missing,
        reasons: v.reasons,
        gaps: v.gaps.length ? v.gaps : f.missing,
        evidenceIds: c.evidence.map((e) => e.id),
        reasonSource: v.reasonSource,
      };
    });
    const result: RunResult = {
      mode: run.mode,
      topic: norm.topic,
      requiredSkills: reqNames,
      niceSkills: niceNames,
      unknownSkills: norm.unknownSkills,
      noMatch: noMatch || candidates.length === 0,
      candidates,
      invitationDraft: verified.invitationDraft?.trim() || defaultInvitation(norm.topic),
      budgetWarning,
    };
    q().setResult.run(JSON.stringify(result), "awaiting_approval", nowIso(), runId);
    steps.done(
      candidates.length === 0
        ? `${name} belum menemukan mahasiswa dengan bukti untuk skill yang diminta` +
            (norm.unknownSkills.length ? ` (${norm.unknownSkills.join(", ")} belum ada di katalog skill)` : "") +
            ". Coba ubah kebutuhan dengan skill lain."
        : result.noMatch
        ? `${name} tidak menemukan kandidat dengan skor ≥ ${NO_MATCH_THRESHOLD}; ${candidates.length} kandidat terdekat disiapkan. Menunggu keputusan dosen.`
        : `${name} menyiapkan ${candidates.length} kandidat dan draf undangan. Menunggu persetujuan dosen.`,
    );
    return "awaiting_approval";
  } catch (err) {
    const message = err instanceof LLMError ? err.message : `Terjadi kesalahan internal: ${(err as Error).message}`;
    steps.fail(message);
    setStatus("failed", message);
    return "failed";
  }
}

function uniqueByCode(xs: ExplainCandidate[]): ExplainCandidate[] {
  const seen = new Set<string>();
  return xs.filter((c) => (seen.has(c.code) ? false : (seen.add(c.code), true)));
}

function defaultInvitation(topic: string): string {
  return (
    `Yth. [Nama Mahasiswa],\n\nKami sedang menyiapkan riset "${topic}" dan melihat pengalaman Anda relevan. ` +
    `Apakah Anda bersedia berdiskusi lebih lanjut minggu ini?\n\nSalam,\n[Nama Dosen]`
  );
}
