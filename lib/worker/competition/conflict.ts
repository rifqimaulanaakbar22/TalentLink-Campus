// Conflict Check (tool check_conflict): dobel tim, beban riset lintas unit, dan Fair Exposure.
import type { CompetitionConflict, TeamProposal } from "../../types";
import { FAIR_EXPOSURE_MIN_COMMITMENTS } from "../score";

export function checkConflicts(opts: {
  teams: TeamProposal[];
  /** Kode mahasiswa -> active_commitments. */
  commitments: Map<string, number>;
  /** Kode mahasiswa -> ID penugasan riset Netra yang sudah disetujui. */
  researchInvites: Map<string, number[]>;
}): CompetitionConflict[] {
  const teamsOf = new Map<string, number[]>();
  for (const t of opts.teams) for (const m of t.members) teamsOf.set(m.code, [...(teamsOf.get(m.code) ?? []), t.team]);

  const out: CompetitionConflict[] = [];
  for (const [code, teams] of teamsOf) {
    if (teams.length > 1) {
      out.push({ code, kind: "double_team", message: `${code} masuk lebih dari satu tim di lomba ini (tim ${teams.join(", ")}).` });
    }
    const runs = opts.researchInvites.get(code);
    if (runs?.length) {
      out.push({
        code,
        kind: "research_invite",
        message: `${code} baru disetujui untuk penugasan riset Netra (${runs.map((r) => `#${r}`).join(", ")}); pertimbangkan beban kerjanya.`,
      });
    }
    const n = opts.commitments.get(code) ?? 0;
    if (n >= FAIR_EXPOSURE_MIN_COMMITMENTS) {
      out.push({ code, kind: "fair_exposure", message: `${code} sudah punya ${n} komitmen aktif (sudah banyak dilibatkan).` });
    }
  }
  return out;
}
