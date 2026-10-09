import type { Candidate, Evidence, EvidenceType, Grade, ScoredCandidate } from "../types";

// Dikunci agar seed dan eval deterministik, tidak bergantung jam sistem.
export const REFERENCE_YEAR = 2026;

export const HIDDEN_TALENT_MIN_SCORE = 70;
export const FAIR_EXPOSURE_MIN_COMMITMENTS = 2;

const TYPE_WEIGHT: Record<Exclude<EvidenceType, "course">, number> = {
  project: 1.0,
  research: 1.0,
  award: 0.9,
  assistant: 0.8,
  certificate: 0.5,
};
const COURSE_WEIGHT: Record<Grade, number> = { A: 1.0, B: 0.7, C: 0.4 };

export function typeWeight(type: EvidenceType, grade: Grade | null): number {
  if (type === "course") return grade ? COURSE_WEIGHT[grade] : COURSE_WEIGHT.C;
  return TYPE_WEIGHT[type];
}

export function recencyWeight(year: number): number {
  const age = REFERENCE_YEAR - year;
  if (age <= 0) return 1.0;
  if (age === 1) return 0.85;
  return 0.7;
}

/** strength/3 × w_type × w_recency untuk satu pasangan (bukti, skill). */
export function evidenceValue(e: Pick<Evidence, "strength" | "type" | "grade" | "year">): number {
  return (e.strength / 3) * typeWeight(e.type, e.grade) * recencyWeight(e.year);
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export interface ScoreCriteria {
  requiredSkillIds: number[];
  niceSkillIds: number[];
  skillNames: Record<number, string>;
}

/**
 * Hitung skor 0–100 tiap kandidat, urut menurun; seri diurutkan kode mahasiswa.
 * Nama dan gender tidak dipakai (Candidate memang tidak membawanya).
 */
export function scoreCandidates(candidates: Candidate[], criteria: ScoreCriteria): ScoredCandidate[] {
  const { requiredSkillIds, niceSkillIds, skillNames } = criteria;
  const relevant = new Set([...requiredSkillIds, ...niceSkillIds]);

  const scored = candidates.map((c): ScoredCandidate => {
    const skillBest: Record<number, number> = {};
    for (const id of relevant) skillBest[id] = 0;
    for (const e of c.evidence) {
      if (!relevant.has(e.skillId)) continue;
      const v = evidenceValue(e);
      if (v > skillBest[e.skillId]) skillBest[e.skillId] = v;
    }

    const req = mean(requiredSkillIds.map((id) => skillBest[id]));
    const raw = niceSkillIds.length ? 0.75 * req + 0.25 * mean(niceSkillIds.map((id) => skillBest[id])) : req;
    const score = Math.round(raw * 1000) / 10;

    return {
      code: c.code,
      prodi: c.prodi,
      semester: c.semester,
      score,
      skillBest,
      hiddenTalent: score >= HIDDEN_TALENT_MIN_SCORE && !c.hasAward,
      fairExposure: c.activeCommitments >= FAIR_EXPOSURE_MIN_COMMITMENTS,
      missingSkills: requiredSkillIds.filter((id) => skillBest[id] === 0).map((id) => skillNames[id] ?? `#${id}`),
      evidence: c.evidence,
    };
  });

  return scored.sort((a, b) => b.score - a.score || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
}

/**
 * Bukti paling relevan per kandidat untuk paket explain: satu entri per evidence_id
 * (nilai tertinggi di antara skill kriteria), urut menurun, dibatasi `limit`.
 */
export function topEvidence(evidence: Evidence[], relevantSkillIds: number[], limit: number): Evidence[] {
  const relevant = new Set(relevantSkillIds);
  const best = new Map<string, { e: Evidence; v: number }>();
  for (const e of evidence) {
    if (!relevant.has(e.skillId)) continue;
    const v = evidenceValue(e);
    const cur = best.get(e.id);
    if (!cur || v > cur.v) best.set(e.id, { e, v });
  }
  return [...best.values()]
    .sort((a, b) => b.v - a.v || (a.e.id < b.e.id ? -1 : 1))
    .slice(0, limit)
    .map((x) => x.e);
}
