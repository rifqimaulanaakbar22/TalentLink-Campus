import { describe, it, expect } from "vitest";
import { typeWeight, recencyWeight, evidenceValue, scoreCandidates, REFERENCE_YEAR } from "./score";
import type { Candidate, Evidence } from "../types";

const PY = 1;
const CV = 2;
const DL = 3;
const skillNames = { [PY]: "Python", [CV]: "Computer Vision", [DL]: "Deep Learning" };

function ev(p: Partial<Evidence> & { id: string; skillId: number }): Evidence {
  return {
    type: "project",
    title: "Proyek",
    detail: "",
    grade: null,
    year: REFERENCE_YEAR,
    sourceLabel: "Sintetis",
    strength: 3,
    ...p,
  };
}

function cand(code: string, evidence: Evidence[], extra: Partial<Candidate> = {}): Candidate {
  return { code, prodi: "Teknik Informatika", semester: 5, activeCommitments: 0, hasAward: false, evidence, ...extra };
}

describe("bobot", () => {
  it("w_type sesuai spesifikasi untuk tiap tipe", () => {
    expect(typeWeight("project", null)).toBe(1);
    expect(typeWeight("research", null)).toBe(1);
    expect(typeWeight("award", null)).toBe(0.9);
    expect(typeWeight("assistant", null)).toBe(0.8);
    expect(typeWeight("certificate", null)).toBe(0.5);
  });

  it("w_type course mengikuti nilai A/B/C", () => {
    expect(typeWeight("course", "A")).toBe(1);
    expect(typeWeight("course", "B")).toBe(0.7);
    expect(typeWeight("course", "C")).toBe(0.4);
  });

  it("recency: tahun acuan 2026 = 1, 2025 = 0,85, lebih lama = 0,7", () => {
    expect(REFERENCE_YEAR).toBe(2026);
    expect(recencyWeight(2026)).toBe(1);
    expect(recencyWeight(2025)).toBe(0.85);
    expect(recencyWeight(2024)).toBe(0.7);
    expect(recencyWeight(2020)).toBe(0.7);
  });

  it("nilai bukti = strength/3 × w_type × w_recency", () => {
    expect(evidenceValue(ev({ id: "EV-1", skillId: PY, strength: 3 }))).toBeCloseTo(1);
    expect(evidenceValue(ev({ id: "EV-2", skillId: PY, strength: 2, type: "certificate", year: 2025 }))).toBeCloseTo(
      (2 / 3) * 0.5 * 0.85,
    );
    expect(evidenceValue(ev({ id: "EV-3", skillId: PY, strength: 3, type: "course", grade: "B", year: 2024 }))).toBeCloseTo(
      0.7 * 0.7,
    );
  });
});

describe("scoreCandidates", () => {
  const base = { requiredSkillIds: [PY, CV], niceSkillIds: [] as number[], skillNames };

  it("tanpa skill tambahan: 100 × rata-rata best wajib, ambil bukti terbaik per skill", () => {
    const [c] = scoreCandidates(
      [
        cand("S-001", [
          ev({ id: "EV-1", skillId: PY, strength: 3 }),
          ev({ id: "EV-2", skillId: CV, strength: 3, type: "certificate" }),
          ev({ id: "EV-3", skillId: CV, strength: 3, type: "assistant" }),
        ]),
      ],
      base,
    );
    expect(c.score).toBeCloseTo(100 * ((1 + 0.8) / 2), 1);
    expect(c.skillBest[CV]).toBeCloseTo(0.8);
  });

  it("dengan skill tambahan: 0,75 wajib + 0,25 tambahan", () => {
    const [c] = scoreCandidates(
      [
        cand("S-001", [
          ev({ id: "EV-1", skillId: PY }),
          ev({ id: "EV-2", skillId: CV }),
          ev({ id: "EV-3", skillId: DL, type: "certificate" }),
        ]),
      ],
      { ...base, niceSkillIds: [DL] },
    );
    expect(c.score).toBeCloseTo(100 * (0.75 * 1 + 0.25 * 0.5), 1);
  });

  it("skill wajib tanpa bukti bernilai 0 dan masuk missingSkills", () => {
    const [c] = scoreCandidates([cand("S-001", [ev({ id: "EV-1", skillId: PY })])], base);
    expect(c.score).toBeCloseTo(50, 1);
    expect(c.missingSkills).toEqual(["Computer Vision"]);
  });

  it("Hidden Talent: skor >= 70 dan tanpa bukti award", () => {
    const strong = [ev({ id: "EV-1", skillId: PY }), ev({ id: "EV-2", skillId: CV })];
    const [a, b] = scoreCandidates(
      [cand("S-001", strong), cand("S-002", strong, { hasAward: true })],
      base,
    );
    expect(a.code).toBe("S-001");
    expect(a.hiddenTalent).toBe(true);
    expect(b.hiddenTalent).toBe(false);
  });

  it("Hidden Talent tidak diberikan di bawah 70", () => {
    const [c] = scoreCandidates([cand("S-001", [ev({ id: "EV-1", skillId: PY })])], base);
    expect(c.hiddenTalent).toBe(false);
  });

  it("Fair Exposure: active_commitments >= 2 ditandai, tetap ditampilkan", () => {
    const strong = [ev({ id: "EV-1", skillId: PY }), ev({ id: "EV-2", skillId: CV })];
    const res = scoreCandidates(
      [cand("S-001", strong, { activeCommitments: 1 }), cand("S-002", strong, { activeCommitments: 2 })],
      base,
    );
    expect(res).toHaveLength(2);
    expect(res.find((c) => c.code === "S-001")!.fairExposure).toBe(false);
    expect(res.find((c) => c.code === "S-002")!.fairExposure).toBe(true);
  });

  it("urutan skor menurun; seri ditentukan kode mahasiswa", () => {
    const strong = [ev({ id: "EV-1", skillId: PY }), ev({ id: "EV-2", skillId: CV })];
    const weak = [ev({ id: "EV-3", skillId: PY, strength: 1 })];
    const res = scoreCandidates(
      [cand("S-010", strong), cand("S-003", weak), cand("S-002", strong), cand("S-001", weak)],
      base,
    );
    expect(res.map((c) => c.code)).toEqual(["S-002", "S-010", "S-001", "S-003"]);
  });

  it("bukti skill di luar kriteria tidak memengaruhi skor", () => {
    const [c] = scoreCandidates(
      [cand("S-001", [ev({ id: "EV-1", skillId: PY }), ev({ id: "EV-2", skillId: CV }), ev({ id: "EV-3", skillId: 99 })])],
      base,
    );
    expect(c.score).toBe(100);
  });
});
