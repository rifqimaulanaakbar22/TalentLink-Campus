import { describe, it, expect } from "vitest";
import { checkConflicts } from "./conflict";
import type { TeamProposal } from "../../types";

const team = (n: number, codes: string[]): TeamProposal => ({
  team: n,
  members: codes.map((code) => ({ code, role: "Anggota", roleScore: 80 })),
  missingRoles: [],
});

describe("checkConflicts", () => {
  it("tim bersih tanpa konflik", () => {
    expect(
      checkConflicts({ teams: [team(1, ["S-001", "S-002"])], commitments: new Map(), researchInvites: new Map() }),
    ).toEqual([]);
  });

  it("mahasiswa di dua tim lomba yang sama ditandai double_team (FR-C4)", () => {
    const c = checkConflicts({
      teams: [team(1, ["S-001", "S-002"]), team(2, ["S-003", "S-001"])],
      commitments: new Map(),
      researchInvites: new Map(),
    });
    expect(c).toEqual([
      { code: "S-001", kind: "double_team", message: "S-001 masuk lebih dari satu tim di lomba ini (tim 1, 2)." },
    ]);
  });

  it("baru disetujui di penugasan riset Netra -> research_invite (lintas unit)", () => {
    const c = checkConflicts({
      teams: [team(1, ["S-101", "S-002"])],
      commitments: new Map(),
      researchInvites: new Map([["S-101", [12, 15]]]),
    });
    expect(c).toEqual([
      {
        code: "S-101",
        kind: "research_invite",
        message: "S-101 baru disetujui untuk penugasan riset Netra (#12, #15); pertimbangkan beban kerjanya.",
      },
    ]);
  });

  it("komitmen aktif >= 2 -> fair_exposure, tetap di tim", () => {
    const c = checkConflicts({
      teams: [team(1, ["S-109", "S-002"])],
      commitments: new Map([
        ["S-109", 3],
        ["S-002", 1],
      ]),
      researchInvites: new Map(),
    });
    expect(c).toEqual([
      { code: "S-109", kind: "fair_exposure", message: "S-109 sudah punya 3 komitmen aktif (sudah banyak dilibatkan)." },
    ]);
  });
});
