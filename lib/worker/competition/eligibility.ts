// Eligibility Check (tool check_eligibility): syarat formal lomba dihitung di kode, bukan LLM.
import type { ExcludedStudent, StudentStatus } from "../../types";

export const PRODI = ["Teknik Informatika", "Sains Data Terapan", "Teknik Komputer", "Teknologi Game"] as const;

// Penyebutan umum di guidebook -> nama prodi resmi.
const PRODI_ALIASES: [string, (typeof PRODI)[number]][] = [
  ["sains data", "Sains Data Terapan"],
  ["data science", "Sains Data Terapan"],
  ["informatika", "Teknik Informatika"],
  ["komputer", "Teknik Komputer"],
  ["game", "Teknologi Game"],
];

export function resolveProdi(name: string): (typeof PRODI)[number] | null {
  const n = name.toLowerCase();
  return PRODI_ALIASES.find(([alias]) => n.includes(alias))?.[1] ?? null;
}

export interface EligibilityRules {
  minSemester: number | null;
  maxSemester: number | null;
  /** Nama prodi resmi; kosong = semua prodi. */
  allowedProdi: string[];
}

export interface StudentForEligibility {
  code: string;
  prodi: string;
  semester: number;
  status: StudentStatus;
}

/** Setiap mahasiswa yang tersaring mendapat alasan tertulis (AC-14). Urut kode. */
export function checkEligibility(
  students: StudentForEligibility[],
  rules: EligibilityRules,
): { eligible: string[]; excluded: ExcludedStudent[] } {
  const eligible: string[] = [];
  const excluded: ExcludedStudent[] = [];
  for (const s of [...students].sort((a, b) => (a.code < b.code ? -1 : 1))) {
    const reasons: string[] = [];
    if (s.status !== "aktif") reasons.push(`Berstatus ${s.status}, bukan mahasiswa aktif`);
    if (rules.minSemester !== null && s.semester < rules.minSemester) {
      reasons.push(`Semester ${s.semester}, syarat minimal semester ${rules.minSemester}`);
    }
    if (rules.maxSemester !== null && s.semester > rules.maxSemester) {
      reasons.push(`Semester ${s.semester}, melebihi batas semester ${rules.maxSemester}`);
    }
    if (rules.allowedProdi.length > 0 && !rules.allowedProdi.includes(s.prodi)) {
      reasons.push(`Prodi ${s.prodi} tidak termasuk prodi yang diizinkan (${rules.allowedProdi.join(", ")})`);
    }
    if (reasons.length) excluded.push({ code: s.code, reasons });
    else eligible.push(s.code);
  }
  return { eligible, excluded };
}

export function describeRules(rules: EligibilityRules): string[] {
  const { minSemester: min, maxSemester: max } = rules;
  const semester =
    min !== null && max !== null
      ? `Semester ${min} sampai ${max}`
      : min !== null
        ? `Minimal semester ${min}`
        : max !== null
          ? `Maksimal semester ${max}`
          : "Semua semester";
  return [
    "Mahasiswa berstatus aktif",
    semester,
    rules.allowedProdi.length ? `Prodi: ${rules.allowedProdi.join(", ")}` : "Semua prodi",
  ];
}
