import { getDb } from "../db";
import type { Candidate, Evidence, EvidenceType, Grade } from "../types";

type Row = {
  code: string;
  prodi: string;
  semester: number;
  active_commitments: number;
  has_award: number;
  ev_id: string;
  type: EvidenceType;
  title: string;
  detail: string;
  grade: Grade | null;
  year: number;
  source_label: string;
  skill_id: number;
  strength: number;
};

// Satu query JOIN: mahasiswa aktif, semester >= minimum, punya minimal satu bukti untuk salah satu
// skill wajib; kembalikan semua bukti mereka yang menyentuh skill kriteria (wajib + tambahan).
// Daftar id dikirim sebagai JSON agar statement bisa di-prepare sekali.
const SEARCH_SQL = `
SELECT s.code, s.prodi, s.semester, s.active_commitments,
       EXISTS (SELECT 1 FROM evidence a WHERE a.student_id = s.id AND a.type = 'award') AS has_award,
       e.id AS ev_id, e.type, e.title, e.detail, e.grade, e.year, e.source_label,
       es.skill_id, es.strength
FROM students s
JOIN evidence e ON e.student_id = s.id
JOIN evidence_skills es ON es.evidence_id = e.id
WHERE s.status = 'aktif'
  AND s.semester >= ?
  AND es.skill_id IN (SELECT value FROM json_each(?))
  AND s.id IN (
    SELECT e2.student_id FROM evidence_skills es2
    JOIN evidence e2 ON e2.id = es2.evidence_id
    WHERE es2.skill_id IN (SELECT value FROM json_each(?))
  )
ORDER BY s.code, e.id, es.skill_id`;

// Mode v1: seluruh bukti kandidat (semua skill) untuk dikirim mentah ke LLM.
const ALL_EVIDENCE_SQL = `
SELECT s.code, e.id AS ev_id, e.type, e.title, e.detail, e.grade, e.year, e.source_label,
       es.skill_id, es.strength
FROM students s
JOIN evidence e ON e.student_id = s.id
JOIN evidence_skills es ON es.evidence_id = e.id
WHERE s.code IN (SELECT value FROM json_each(?))
ORDER BY s.code, e.id, es.skill_id`;

const ACTIVE_SQL = "SELECT count(*) AS n FROM students WHERE status = 'aktif'";

const toEvidence = (r: Omit<Row, "code" | "prodi" | "semester" | "active_commitments" | "has_award">): Evidence => ({
  id: r.ev_id,
  type: r.type,
  title: r.title,
  detail: r.detail,
  grade: r.grade,
  year: r.year,
  sourceLabel: r.source_label,
  skillId: r.skill_id,
  strength: r.strength,
});

export async function searchCandidates(opts: {
  requiredSkillIds: number[];
  niceSkillIds: number[];
  minSemester: number | null;
}): Promise<Candidate[]> {
  if (opts.requiredSkillIds.length === 0) return [];
  const rows = await (await getDb()).all<Row>(
    SEARCH_SQL,
    opts.minSemester ?? 0,
    JSON.stringify([...opts.requiredSkillIds, ...opts.niceSkillIds]),
    JSON.stringify(opts.requiredSkillIds),
  );

  const byCode = new Map<string, Candidate>();
  for (const r of rows) {
    let c = byCode.get(r.code);
    if (!c) {
      c = {
        code: r.code,
        prodi: r.prodi,
        semester: r.semester,
        activeCommitments: r.active_commitments,
        hasAward: r.has_award === 1,
        evidence: [],
      };
      byCode.set(r.code, c);
    }
    c.evidence.push(toEvidence(r));
  }
  return [...byCode.values()];
}

export async function countActiveStudents(): Promise<number> {
  return (await (await getDb()).get<{ n: number }>(ACTIVE_SQL))!.n;
}

/** Semua bukti per kode mahasiswa (mode v1). */
export async function loadAllEvidence(codes: string[]): Promise<Map<string, Evidence[]>> {
  const rows = await (await getDb()).all<Row & { code: string }>(ALL_EVIDENCE_SQL, JSON.stringify(codes));
  const out = new Map<string, Evidence[]>();
  for (const r of rows) {
    const list = out.get(r.code) ?? [];
    list.push(toEvidence(r));
    out.set(r.code, list);
  }
  return out;
}
