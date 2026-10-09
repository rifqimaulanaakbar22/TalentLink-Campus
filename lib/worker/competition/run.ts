// Competition Matching oleh Jaya: parse guidebook -> normalize -> Eligibility Check -> Team Builder
// -> explain -> verify + Conflict Check -> usulan tim. Memakai 7 nama langkah yang sama dengan Netra.
import { getSqlite, nowIso } from "../../db";
import { LLMError } from "../../llm";
import type { CompetitionCriteria, CompetitionSummary, ResultCandidate, RunResult, RunStatus, StudentStatus } from "../../types";
import { getSkillCatalog, resolveSkill } from "../normalize";
import { searchCandidates } from "../search";
import { explainCandidates, type ExplainCandidate } from "../explain";
import { verifyExplanations, type Explanation } from "../verify";
import { MAX_LLM_CALLS, Steps, workerName } from "../run";
import { checkEligibility, describeRules, resolveProdi, type EligibilityRules } from "./eligibility";
import { parseGuidebook } from "./parse-guidebook";
import { buildTeams, normalizeRoles, type RoleSpec } from "./team";
import { checkConflicts } from "./conflict";
import { FAIR_EXPOSURE_MIN_COMMITMENTS, HIDDEN_TALENT_MIN_SCORE, topEvidence } from "../score";

const MAX_EVIDENCE = 4;

function sql() {
  const db = getSqlite();
  return {
    getRun: db.prepare("SELECT id, worker_id, brief_text, criteria_json FROM runs WHERE id = ?"),
    setStatus: db.prepare("UPDATE runs SET status = ?, error_message = ?, updated_at = ? WHERE id = ?"),
    setCriteria: db.prepare("UPDATE runs SET criteria_json = ?, updated_at = ? WHERE id = ?"),
    setResult: db.prepare("UPDATE runs SET result_json = ?, status = ?, error_message = NULL, updated_at = ? WHERE id = ?"),
    students: db.prepare("SELECT code, prodi, semester, status, active_commitments FROM students ORDER BY code"),
    // Persetujuan riset Netra, untuk Conflict Check lintas unit.
    researchInvites: db.prepare(
      `SELECT a.run_id, a.candidate_ids FROM approvals a JOIN runs r ON r.id = a.run_id
       WHERE r.worker_id = 'netra' AND a.decision = 'approved'`,
    ),
  };
}
let stmts: ReturnType<typeof sql> | null = null;
const q = () => (stmts ??= sql());

type StudentRow = { code: string; prodi: string; semester: number; status: StudentStatus; active_commitments: number };

export async function runCompetitionMatching(runId: number): Promise<RunStatus> {
  const run = q().getRun.get(runId) as { worker_id: string; brief_text: string; criteria_json: string | null } | undefined;
  if (!run) throw new Error(`Run ${runId} tidak ditemukan`);
  const name = workerName(run.worker_id);
  const steps = new Steps(runId);
  const setStatus = (s: RunStatus, err: string | null = null) => q().setStatus.run(s, err, nowIso(), runId);
  let llmCalls = 0;
  let budgetWarning = false;

  setStatus("running");
  try {
    // 1. parse guidebook (sekali; hanya explain yang boleh di-retry)
    let criteria = run.criteria_json ? (JSON.parse(run.criteria_json) as CompetitionCriteria) : null;
    if (!criteria || criteria.needs_clarification) {
      steps.start("parse", `${name} membaca guidebook lomba…`);
      let parsed;
      try {
        llmCalls++;
        parsed = await parseGuidebook(runId, run.brief_text);
      } catch (err) {
        if (err instanceof LLMError && err.code === "bad_json") {
          throw new LLMError("bad_json", `${name} tidak bisa membaca jawaban AI saat memahami guidebook. Silakan coba lagi.`);
        }
        throw err;
      }
      budgetWarning ||= parsed.budgetWarning;
      criteria = parsed.data;
      const noSkills = criteria.roles.every((r) => r.skills.length === 0);
      const outOfCatalog = (criteria.unknown_skills?.length ?? 0) > 0;
      // Lomba yang butuh skill di luar katalog tidak ditanya balik; di-cut setelah normalize.
      if ((criteria.needs_clarification || noSkills) && !outOfCatalog) {
        const question = criteria.question || "Berapa jumlah anggota tim dan bidang apa yang dilombakan?";
        criteria = { ...criteria, needs_clarification: true, question };
        q().setCriteria.run(JSON.stringify(criteria), nowIso(), runId);
        steps.done(`${name} butuh klarifikasi: ${question}`);
        setStatus("needs_clarification");
        return "needs_clarification";
      }
      q().setCriteria.run(JSON.stringify(criteria), nowIso(), runId);
      steps.done(
        `${name} membaca guidebook "${criteria.competition_name}": tim ${criteria.team_size} orang, ` +
          `${criteria.team_count} tim, ${criteria.roles.length} peran.`,
      );
    }

    // 2. normalize: skill peran -> katalog, prodi -> nama resmi
    steps.start("normalize", `${name} mencocokkan skill tiap peran dengan katalog…`);
    const { names } = getSkillCatalog();
    const unknownSkills: string[] = [];
    const roles: RoleSpec[] = normalizeRoles(
      criteria.roles.map((r) => {
        const ids: number[] = [];
        for (const s of r.skills) {
          const id = resolveSkill(s);
          if (id === null) unknownSkills.push(s);
          else if (!ids.includes(id)) ids.push(id);
        }
        return { name: r.name, skillIds: ids };
      }),
      criteria.team_size,
    );
    const unknownProdi = criteria.allowed_prodi.filter((p) => resolveProdi(p) === null);
    const rules: EligibilityRules = {
      minSemester: criteria.min_semester,
      maxSemester: criteria.max_semester,
      allowedProdi: [...new Set(criteria.allowed_prodi.map(resolveProdi).filter((p): p is NonNullable<typeof p> => !!p))],
    };
    steps.done(
      `${name} memetakan peran: ` +
        roles.map((r) => `${r.name} (${r.skillIds.map((id) => names[id]).join(", ") || "tanpa skill katalog"})`).join("; ") +
        (unknownSkills.length ? `. Skill tidak dikenal: ${unknownSkills.join(", ")}` : "") +
        (unknownProdi.length ? `. Prodi tidak dikenal: ${unknownProdi.join(", ")}` : "") +
        ".",
    );

    // Skill bidang lomba di luar katalog, atau peran tanpa satu pun skill katalog: hentikan sekarang.
    // Menyusun tim dari sisa skill akan menghasilkan usulan yang menyesatkan.
    const outside = (criteria.unknown_skills ?? []).filter((x) => resolveSkill(x) === null);
    for (const u of unknownSkills) if (!outside.some((o) => o.toLowerCase() === u.toLowerCase())) outside.push(u);
    const emptyRoles = roles.filter((r) => r.skillIds.length === 0).map((r) => r.name);
    if (outside.length > 0 || emptyRoles.length > 0) {
      const reason = outside.length
        ? `${outside.join(", ")} belum ada di katalog skill kampus`
        : `peran ${emptyRoles.join(", ")} tidak punya skill yang ada di katalog`;
      for (const st of ["search", "score", "explain", "verify"] as const) steps.skip(st, `Dilewati: ${reason}.`);
      steps.start("brief", `${name} menyusun usulan tim…`);
      const result: RunResult = {
        mode: "v2",
        topic: criteria.competition_name,
        requiredSkills: [...new Set(roles.flatMap((r) => r.skillIds))].map((id) => names[id]),
        niceSkills: [],
        unknownSkills: outside.length ? outside : emptyRoles,
        noMatch: true,
        candidates: [],
        invitationDraft: "",
        budgetWarning,
        competition: {
          competitionName: criteria.competition_name,
          teamSize: criteria.team_size,
          teamCount: criteria.team_count,
          rules: describeRules(rules),
          screenedCount: 0,
          eligibleCount: 0,
          excluded: [],
          teams: [],
          conflicts: [],
        },
      };
      q().setResult.run(JSON.stringify(result), "awaiting_approval", nowIso(), runId);
      steps.done(`${name} berhenti: ${reason}, jadi belum bisa menyusun tim berbukti. Ubah guidebook atau peran lomba.`);
      return "awaiting_approval";
    }

    // 3. search = Eligibility Check + kandidat berbukti (satu query JOIN)
    steps.start("search", `${name} memeriksa syarat lomba untuk setiap mahasiswa…`);
    const students = q().students.all() as StudentRow[];
    const { eligible, excluded } = checkEligibility(students, rules);
    const eligibleSet = new Set(eligible);
    const allSkillIds = [...new Set(roles.flatMap((r) => r.skillIds))];
    const candidates = searchCandidates({ requiredSkillIds: allSkillIds, niceSkillIds: [], minSemester: rules.minSemester }).filter(
      (c) => eligibleSet.has(c.code),
    );
    const countBy = (re: RegExp) => excluded.filter((e) => e.reasons.some((r) => re.test(r))).length;
    steps.done(
      `${name} memeriksa ${students.length} mahasiswa: ${eligible.length} memenuhi syarat, ${excluded.length} tersaring ` +
        `(tidak aktif ${countBy(/^Berstatus/)}, semester ${countBy(/^Semester/)}, prodi ${countBy(/^Prodi/)}). ` +
        `${candidates.length} mahasiswa yang lolos punya bukti untuk peran lomba ini.`,
    );

    // 4. score = Team Builder
    steps.start("score", `${name} menyusun tim dengan peran yang saling melengkapi…`);
    const teams = buildTeams({ candidates, roles, teamSize: criteria.team_size, teamCount: criteria.team_count });
    const memberCount = teams.reduce((n, t) => n + t.members.length, 0);
    const missing = teams.flatMap((t) => t.missingRoles.map((r) => `tim ${t.team}: ${r}`));
    steps.done(
      memberCount === 0
        ? `${name} belum menemukan mahasiswa yang lolos syarat dengan bukti untuk peran lomba ini.`
        : `${name} menyusun ${teams.length} tim: ` +
            teams.map((t) => `tim ${t.team} (${t.members.map((m) => m.code).join(", ") || "-"})`).join("; ") +
            (missing.length ? `. Peran belum terisi: ${missing.join("; ")}` : "") +
            ".",
    );

    // 5. explain
    const byCode = new Map(candidates.map((c) => [c.code, c]));
    const roleOf = new Map(roles.map((r) => [r.name, r]));
    const explainInput: (ExplainCandidate & { team: number })[] = teams.flatMap((t) =>
      t.members.map((m) => {
        const c = byCode.get(m.code)!;
        const skillIds = roleOf.get(m.role)?.skillIds ?? [];
        const has = new Set(c.evidence.map((e) => e.skillId));
        return {
          code: c.code,
          prodi: c.prodi,
          semester: c.semester,
          score: m.roleScore,
          role: m.role,
          team: t.team,
          missingSkills: skillIds.filter((id) => !has.has(id)).map((id) => names[id]),
          evidence: topEvidence(c.evidence, skillIds, MAX_EVIDENCE),
        };
      }),
    );
    const roleSkillNames = allSkillIds.map((id) => names[id]);
    const explainOpts = {
      runId,
      mode: "v2" as const,
      kind: "competition" as const,
      topic: criteria.competition_name,
      requiredSkills: roleSkillNames,
      niceSkills: [],
    };

    let explanation: Explanation | null = null;
    if (explainInput.length === 0) {
      steps.skip("explain", `${name} tidak punya anggota tim untuk dijelaskan.`);
    } else {
      steps.start("explain", `${name} menulis alasan berbukti untuk ${explainInput.length} anggota tim…`);
      try {
        llmCalls++;
        const res = await explainCandidates({ ...explainOpts, candidates: explainInput });
        budgetWarning ||= res.budgetWarning;
        explanation = res.data;
        steps.done(`${name} menerima alasan untuk ${explanation.candidates.length} anggota tim.`);
      } catch (err) {
        if (!(err instanceof LLMError && err.code === "bad_json")) throw err;
        steps.done(`${name} menerima jawaban AI yang tidak bisa dibaca; akan dicoba ulang di verifikasi.`);
      }
    }

    // 6. verify: sitasi + Conflict Check
    steps.start("verify", `${name} memeriksa sitasi dan konflik penugasan…`);
    const verified = await verifyExplanations({
      pkg: explainInput.map((c) => ({
        code: c.code,
        evidence: c.evidence.map((e) => ({ id: e.id, type: e.type, title: e.title, grade: e.grade })),
      })),
      explanation,
      retry:
        llmCalls < MAX_LLM_CALLS && explainInput.length > 0
          ? async (codes) => {
              llmCalls++;
              try {
                const res = await explainCandidates({
                  ...explainOpts,
                  step: "verify",
                  candidates: explainInput.filter((c) => codes.includes(c.code)),
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
    const invites = new Map<string, number[]>();
    for (const row of q().researchInvites.all() as { run_id: number; candidate_ids: string }[]) {
      for (const code of JSON.parse(row.candidate_ids) as string[]) invites.set(code, [...(invites.get(code) ?? []), row.run_id]);
    }
    const commitments = new Map(students.map((s) => [s.code, s.active_commitments]));
    const conflicts = checkConflicts({ teams, commitments, researchInvites: invites });
    const reasonCount = verified.candidates.reduce((n, c) => n + c.reasons.length, 0);
    steps.done(
      `${name} memeriksa sitasi: ${reasonCount} alasan siap, ${verified.dropped} dibuang karena ID bukti tidak valid` +
        (verified.retried ? ", explain dicoba ulang sekali" : "") +
        (verified.templated.length ? `, alasan template untuk ${verified.templated.join(", ")}` : "") +
        `. Konflik: ${conflicts.length ? conflicts.map((c) => c.message).join(" ") : "tidak ada."}`,
    );

    // 7. brief = usulan tim
    steps.start("brief", `${name} menyusun usulan tim…`);
    const vByCode = new Map(verified.candidates.map((c) => [c.code, c]));
    const resultCandidates: ResultCandidate[] = explainInput.map((c) => {
      const v = vByCode.get(c.code)!;
      const cand = byCode.get(c.code)!;
      return {
        code: c.code,
        prodi: c.prodi,
        semester: c.semester,
        score: c.score,
        hiddenTalent: (c.score ?? 0) >= HIDDEN_TALENT_MIN_SCORE && !cand.hasAward,
        fairExposure: cand.activeCommitments >= FAIR_EXPOSURE_MIN_COMMITMENTS,
        missingSkills: c.missingSkills,
        reasons: v.reasons,
        gaps: v.gaps.length ? v.gaps : c.missingSkills,
        evidenceIds: c.evidence.map((e) => e.id),
        reasonSource: v.reasonSource,
        role: c.role,
        team: c.team,
      };
    });
    const competition: CompetitionSummary = {
      competitionName: criteria.competition_name,
      teamSize: criteria.team_size,
      teamCount: criteria.team_count,
      rules: describeRules(rules),
      screenedCount: students.length,
      eligibleCount: eligible.length,
      excluded,
      teams,
      conflicts,
    };
    const result: RunResult = {
      mode: "v2",
      topic: criteria.competition_name,
      requiredSkills: roleSkillNames,
      niceSkills: [],
      unknownSkills,
      noMatch: memberCount === 0,
      candidates: resultCandidates,
      invitationDraft: verified.invitationDraft?.trim() || defaultInvitation(criteria.competition_name),
      budgetWarning,
      competition,
    };
    q().setResult.run(JSON.stringify(result), "awaiting_approval", nowIso(), runId);
    steps.done(
      memberCount === 0
        ? `${name} belum bisa mengusulkan tim. Coba ubah syarat atau peran lomba.`
        : `${name} mengusulkan ${teams.length} tim (${memberCount} mahasiswa) beserta draf undangan seleksi. Menunggu persetujuan.`,
    );
    return "awaiting_approval";
  } catch (err) {
    const message = err instanceof LLMError ? err.message : `Terjadi kesalahan internal: ${(err as Error).message}`;
    steps.fail(message);
    setStatus("failed", message);
    return "failed";
  }
}

function defaultInvitation(competition: string): string {
  return (
    `Yth. [Nama Mahasiswa],\n\nAnda diusulkan masuk tim untuk lomba "${competition}". ` +
    `Mohon hadir di seleksi tim minggu ini.\n\nSalam,\nBagian Kemahasiswaan`
  );
}
