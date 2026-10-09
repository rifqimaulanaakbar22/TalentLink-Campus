import { describe, it, expect } from "vitest";
import { buildTeams, normalizeRoles, roleScore } from "./team";
import type { Candidate, Evidence } from "../../types";

const PY = 1;
const DL = 3;
const UX = 11;
const PS = 17;

function ev(id: string, skillId: number, strength = 3, type: Evidence["type"] = "project"): Evidence {
  return { id, type, title: id, detail: "", grade: null, year: 2026, sourceLabel: "Sintetis", skillId, strength };
}
function cand(code: string, evidence: Evidence[], commitments = 0): Candidate {
  return { code, prodi: "Teknik Informatika", semester: 5, activeCommitments: commitments, hasAward: false, evidence };
}

const roles = [
  { name: "Pengembang Model AI", skillIds: [PY, DL] },
  { name: "Desainer Produk", skillIds: [UX] },
  { name: "Presenter", skillIds: [PS] },
];

describe("roleScore", () => {
  it("100 × rata-rata bukti terbaik untuk skill peran", () => {
    expect(roleScore([ev("E1", PY), ev("E2", DL, 3, "certificate")], [PY, DL])).toBe(75);
    expect(roleScore([ev("E1", PY)], [UX])).toBe(0);
  });
});

describe("normalizeRoles", () => {
  it("dipotong jika peran lebih banyak dari jumlah anggota", () => {
    expect(normalizeRoles(roles, 2).map((r) => r.name)).toEqual(["Pengembang Model AI", "Desainer Produk"]);
  });

  it("ditambah 'Anggota pendukung' dengan gabungan skill jika peran kurang", () => {
    const r = normalizeRoles(roles.slice(0, 1), 3);
    expect(r.map((x) => x.name)).toEqual(["Pengembang Model AI", "Anggota pendukung 1", "Anggota pendukung 2"]);
    expect(r[1].skillIds).toEqual([PY, DL]);
  });
});

describe("buildTeams", () => {
  const pool = [
    cand("S-001", [ev("A1", PY), ev("A2", DL)]), // AI kuat
    cand("S-002", [ev("B1", UX)]), // desain
    cand("S-003", [ev("C1", PS), ev("C2", PY, 1)]), // presenter
    cand("S-004", [ev("D1", PY, 2), ev("D2", DL, 2)]), // AI sedang
    cand("S-005", [ev("E1", UX, 2), ev("E2", PS, 2)]), // desain/presenter sedang
  ];

  it("satu tim: tiap peran diisi kandidat terbaik untuk peran itu, tanpa dobel", () => {
    const [t] = buildTeams({ candidates: pool, roles, teamSize: 3, teamCount: 1 });
    expect(t.team).toBe(1);
    expect(t.members).toEqual([
      { code: "S-001", role: "Pengembang Model AI", roleScore: 100 },
      { code: "S-002", role: "Desainer Produk", roleScore: 100 },
      { code: "S-003", role: "Presenter", roleScore: 100 },
    ]);
    expect(t.missingRoles).toEqual([]);
  });

  it("dua tim: tidak ada mahasiswa yang masuk dua tim (FR-C4)", () => {
    const teams = buildTeams({ candidates: pool, roles, teamSize: 3, teamCount: 2 });
    const codes = teams.flatMap((t) => t.members.map((m) => m.code));
    expect(new Set(codes).size).toBe(codes.length);
    expect(teams[1].members.map((m) => m.code)).toEqual(["S-004", "S-005"]);
    // Peran yang tidak punya kandidat berbukti dicatat, bukan diisi asal.
    expect(teams[1].missingRoles).toEqual(["Presenter"]);
  });

  it("peran langka diisi lebih dulu agar tidak direbut peran lain", () => {
    // S-010 kuat di Python dan satu-satunya yang punya UX; peran UX harus mendapatkannya.
    const scarce = [
      cand("S-010", [ev("X1", PY), ev("X2", DL), ev("X3", UX, 2)]),
      cand("S-011", [ev("Y1", PY, 2), ev("Y2", DL, 2)]),
    ];
    const [t] = buildTeams({
      candidates: scarce,
      roles: [roles[0], roles[1]],
      teamSize: 2,
      teamCount: 1,
    });
    expect(t.members).toEqual([
      { code: "S-011", role: "Pengembang Model AI", roleScore: 66.7 },
      { code: "S-010", role: "Desainer Produk", roleScore: 66.7 },
    ]);
  });

  it("seri: komitmen aktif lebih sedikit didahulukan, lalu kode", () => {
    const tie = [cand("S-020", [ev("P1", PS)], 3), cand("S-030", [ev("Q1", PS)], 0), cand("S-021", [ev("R1", PS)], 3)];
    const [t] = buildTeams({ candidates: tie, roles: [roles[2]], teamSize: 1, teamCount: 1 });
    expect(t.members[0].code).toBe("S-030");
  });

  it("tanpa kandidat: semua peran tercatat kosong", () => {
    const [t] = buildTeams({ candidates: [], roles, teamSize: 3, teamCount: 1 });
    expect(t.members).toEqual([]);
    expect(t.missingRoles).toEqual(["Pengembang Model AI", "Desainer Produk", "Presenter"]);
  });
});
