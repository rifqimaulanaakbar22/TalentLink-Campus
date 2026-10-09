// Team Builder (tool build_team): menyusun tim dengan peran berbeda, dihitung di kode.
import type { Candidate, Evidence, TeamProposal } from "../../types";
import { evidenceValue } from "../score";

export interface RoleSpec {
  name: string;
  skillIds: number[];
}

/** 100 × rata-rata bukti terbaik untuk skill peran (rumus best(s) yang sama dengan Netra). */
export function roleScore(evidence: Evidence[], skillIds: number[]): number {
  if (skillIds.length === 0) return 0;
  const best = new Map<number, number>(skillIds.map((id) => [id, 0]));
  for (const e of evidence) {
    const cur = best.get(e.skillId);
    if (cur !== undefined) best.set(e.skillId, Math.max(cur, evidenceValue(e)));
  }
  const mean = [...best.values()].reduce((a, b) => a + b, 0) / skillIds.length;
  return Math.round(mean * 1000) / 10;
}

/** Jumlah peran disamakan dengan jumlah anggota: dipotong, atau ditambah anggota pendukung. */
export function normalizeRoles(roles: RoleSpec[], teamSize: number): RoleSpec[] {
  const out = roles.slice(0, teamSize);
  const allSkills = [...new Set(roles.flatMap((r) => r.skillIds))];
  for (let i = 1; out.length < teamSize; i++) out.push({ name: `Anggota pendukung ${i}`, skillIds: allSkills });
  return out;
}

/**
 * Isi tim satu per satu. Dalam satu tim, peran dengan kandidat berbukti paling sedikit diisi lebih dulu
 * agar tidak direbut peran lain. Seri: komitmen aktif lebih sedikit, lalu kode mahasiswa.
 * Mahasiswa tidak pernah masuk dua tim (FR-C4); peran tanpa kandidat berbukti dicatat di missingRoles.
 */
export function buildTeams(opts: {
  candidates: Candidate[];
  roles: RoleSpec[];
  teamSize: number;
  teamCount: number;
}): TeamProposal[] {
  const roles = normalizeRoles(opts.roles, opts.teamSize);
  const scores = new Map(opts.candidates.map((c) => [c.code, roles.map((r) => roleScore(c.evidence, r.skillIds))]));
  const used = new Set<string>();
  const teams: TeamProposal[] = [];

  for (let t = 1; t <= opts.teamCount; t++) {
    const pool = opts.candidates.filter((c) => !used.has(c.code));
    const supply = roles.map((_, i) => pool.filter((c) => scores.get(c.code)![i] > 0).length);
    const order = roles.map((_, i) => i).sort((a, b) => supply[a] - supply[b] || a - b);

    const picked = new Map<number, { code: string; roleScore: number }>();
    for (const i of order) {
      let best: Candidate | null = null;
      let bestScore = 0;
      for (const c of pool) {
        if (used.has(c.code)) continue;
        const s = scores.get(c.code)![i];
        if (s <= 0) continue;
        const better =
          !best ||
          s > bestScore ||
          (s === bestScore &&
            (c.activeCommitments < best.activeCommitments ||
              (c.activeCommitments === best.activeCommitments && c.code < best.code)));
        if (better) {
          best = c;
          bestScore = s;
        }
      }
      if (best) {
        used.add(best.code);
        picked.set(i, { code: best.code, roleScore: bestScore });
      }
    }

    teams.push({
      team: t,
      members: roles.flatMap((r, i) => {
        const p = picked.get(i);
        return p ? [{ code: p.code, role: r.name, roleScore: p.roleScore }] : [];
      }),
      missingRoles: roles.filter((_, i) => !picked.has(i)).map((r) => r.name),
    });
  }
  return teams;
}
