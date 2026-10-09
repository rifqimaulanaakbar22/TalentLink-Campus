// Tipe bersama untuk pipeline, API, dan frontend.

export type StudentStatus = "aktif" | "cuti" | "lulus";
export type EvidenceType = "course" | "project" | "certificate" | "award" | "assistant" | "research";
export type Grade = "A" | "B" | "C";

export type RunStatus =
  | "queued"
  | "running"
  | "needs_clarification"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "failed";

export type StepName = "parse" | "normalize" | "search" | "score" | "explain" | "verify" | "brief";
export type StepStatus = "running" | "done" | "failed" | "skipped";
export type RunMode = "v1" | "v2";
export type WorkerId = "netra" | "jaya" | "kanca";

export interface Student {
  id: number;
  code: string;
  name: string;
  prodi: string;
  semester: number;
  status: StudentStatus;
  activeCommitments: number;
}

export interface Skill {
  id: number;
  name: string;
  aliases: string[];
}

/** Bukti yang relevan untuk satu skill tertentu (sisi graph evidence -> skill). */
export interface Evidence {
  id: string;
  type: EvidenceType;
  title: string;
  detail: string;
  grade: Grade | null;
  year: number;
  sourceLabel: string;
  skillId: number;
  strength: number;
}

export interface Criteria {
  needs_clarification: boolean;
  question: string | null;
  topic: string;
  required_skills: string[];
  nice_skills: string[];
  min_semester: number | null;
  count: number;
}

export interface NormalizedCriteria extends Criteria {
  requiredSkillIds: number[];
  niceSkillIds: number[];
  unknownSkills: string[];
}

/** Kandidat hasil search: profil tanpa nama + bukti yang relevan dengan skill brief. */
export interface Candidate {
  code: string;
  prodi: string;
  semester: number;
  activeCommitments: number;
  /** Punya bukti bertipe award untuk skill apa pun (dasar flag Hidden Talent). */
  hasAward: boolean;
  evidence: Evidence[];
}

export interface Reason {
  text: string;
  evidence_ids: string[];
}

export interface ScoredCandidate {
  code: string;
  prodi: string;
  semester: number;
  score: number;
  /** Nilai best(s) per skill_id, 0..1. */
  skillBest: Record<number, number>;
  hiddenTalent: boolean;
  fairExposure: boolean;
  missingSkills: string[];
  evidence: Evidence[];
}

export interface ResultCandidate {
  code: string;
  prodi: string;
  semester: number;
  score: number | null;
  hiddenTalent: boolean;
  fairExposure: boolean;
  missingSkills: string[];
  reasons: Reason[];
  gaps: string[];
  evidenceIds: string[];
  reasonSource: "llm" | "template";
}

export interface RunResult {
  mode: RunMode;
  topic: string;
  requiredSkills: string[];
  niceSkills: string[];
  unknownSkills: string[];
  noMatch: boolean;
  candidates: ResultCandidate[];
  invitationDraft: string;
  budgetWarning: boolean;
}
