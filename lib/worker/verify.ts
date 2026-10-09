import type { EvidenceType, Grade, Reason } from "../types";

export interface PackageEvidence {
  id: string;
  type: EvidenceType;
  title: string;
  grade: Grade | null;
}

/** Kandidat sesuai paket yang dikirim ke LLM; bukti urut dari yang terbaik. */
export interface PackageCandidate {
  code: string;
  evidence: PackageEvidence[];
}

export interface Explanation {
  candidates: { code: string; reasons: Reason[]; gaps: string[] }[];
  invitation_draft: string;
}

export interface VerifiedCandidate {
  code: string;
  reasons: Reason[];
  gaps: string[];
  reasonSource: "llm" | "template";
}

export interface VerifyResult {
  candidates: VerifiedCandidate[];
  invitationDraft: string | null;
  /** Jumlah alasan yang dibuang karena mengutip ID di luar paket kandidat. */
  dropped: number;
  retried: boolean;
  /** Kode kandidat yang memakai alasan template. */
  templated: string[];
}

export function templateReason(e: PackageEvidence): Reason {
  const t = e.title;
  let text: string;
  switch (e.type) {
    case "project":
      text = `Mengerjakan proyek ${t}`;
      break;
    case "course":
      text = `Lulus mata kuliah ${t}${e.grade ? ` dengan nilai ${e.grade}` : ""}`;
      break;
    case "certificate":
      text = /^sertifikat/i.test(t) ? `Memiliki ${t}` : `Memiliki sertifikat ${t}`;
      break;
    case "award":
      text = `Meraih ${t}`;
      break;
    case "assistant":
      text = `Menjadi ${t}`;
      break;
    case "research":
      text = `Terlibat dalam riset ${t}`;
      break;
  }
  return { text: `${text} [${e.id}]`, evidence_ids: [e.id] };
}

/** Alasan sah hanya jika punya minimal satu ID dan semua ID-nya ada di paket kandidat itu. */
function filterReasons(reasons: Reason[], allowed: Set<string>): { kept: Reason[]; dropped: number } {
  const kept = reasons.filter(
    (r) => r.evidence_ids.length > 0 && r.evidence_ids.every((id) => allowed.has(id)) && r.text.trim() !== "",
  );
  return { kept, dropped: reasons.length - kept.length };
}

/**
 * Validasi sitasi: buang alasan yang mengutip ID di luar paket kandidat, retry explain sekali
 * untuk kandidat yang tak punya alasan valid, lalu fallback ke alasan template.
 * `retry` tidak diisi jika batas panggilan LLM per run sudah habis.
 */
export async function verifyExplanations(opts: {
  pkg: PackageCandidate[];
  explanation: Explanation | null;
  retry?: (codes: string[]) => Promise<Explanation | null>;
}): Promise<VerifyResult> {
  const { pkg, explanation, retry } = opts;
  const allowed = new Map(pkg.map((c) => [c.code, new Set(c.evidence.map((e) => e.id))]));
  const byCode = new Map<string, VerifiedCandidate>();
  let dropped = 0;

  const absorb = (exp: Explanation | null) => {
    for (const c of exp?.candidates ?? []) {
      const ids = allowed.get(c.code);
      if (!ids) continue; // kode di luar paket diabaikan
      const { kept, dropped: d } = filterReasons(c.reasons, ids);
      dropped += d;
      const cur = byCode.get(c.code);
      if (cur && cur.reasons.length > 0) continue;
      byCode.set(c.code, { code: c.code, reasons: kept, gaps: c.gaps ?? cur?.gaps ?? [], reasonSource: "llm" });
    }
  };

  absorb(explanation);
  const missing = () => pkg.filter((c) => !(byCode.get(c.code)?.reasons.length)).map((c) => c.code);

  let retried = false;
  if (missing().length > 0 && retry) {
    retried = true;
    absorb(await retry(missing()));
  }

  const templated: string[] = [];
  const candidates = pkg.map((c): VerifiedCandidate => {
    const v = byCode.get(c.code);
    if (v && v.reasons.length > 0) return v;
    templated.push(c.code);
    const reasons = c.evidence.slice(0, 1).map(templateReason);
    return { code: c.code, reasons, gaps: v?.gaps ?? [], reasonSource: "template" };
  });

  return { candidates, invitationDraft: explanation?.invitation_draft ?? null, dropped, retried, templated };
}
