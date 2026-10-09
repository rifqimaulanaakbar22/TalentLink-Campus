import type Database from "better-sqlite3";
import { getSqlite } from "../db";
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

const stmts = new WeakMap<Database.Database, { search: Database.Statement; all: Database.Statement; active: Database.Statement }>();
function prepared() {
  const db = getSqlite();
  let s = stmts.get(db);
  if (!s) {
    s = {
      search: db.prepare(SEARCH_SQL),
      all: db.prepare(ALL_EVIDENCE_SQL),
      active: db.prepare("SELECT count(*) AS n FROM students WHERE status = 'aktif'"),
    };
    stmts.set(db, s);
  }
  return s;
}

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

export function searchCandidates(opts: {
  requiredSkillIds: number[];
  niceSkillIds: number[];
  minSemester: number | null;
}): Candidate[] {
  if (opts.requiredSkillIds.length === 0) return [];
  const rows = prepared().search.all(
    opts.minSemester ?? 0,
    JSON.stringify([...opts.requiredSkillIds, ...opts.niceSkillIds]),
    JSON.stringify(opts.requiredSkillIds),
  ) as Row[];

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

export function countActiveStudents(): number {
  return (prepared().active.get() as { n: number }).n;
}

/** Semua bukti per kode mahasiswa (mode v1). */
export function loadAllEvidence(codes: string[]): Map<string, Evidence[]> {
  const rows = prepared().all.all(JSON.stringify(codes)) as (Row & { code: string })[];
  const out = new Map<string, Evidence[]>();
  for (const r of rows) {
    const list = out.get(r.code) ?? [];
    list.push(toEvidence(r));
    out.set(r.code, list);
  }
  return out;
}
