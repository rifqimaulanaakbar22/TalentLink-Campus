import { describe, it, expect } from "vitest";
import { checkEligibility, describeRules, resolveProdi } from "./eligibility";

const students = [
  { code: "S-001", prodi: "Teknik Informatika", semester: 5, status: "aktif" as const },
  { code: "S-002", prodi: "Teknologi Game", semester: 4, status: "aktif" as const },
  { code: "S-003", prodi: "Sains Data Terapan", semester: 2, status: "aktif" as const },
  { code: "S-004", prodi: "Teknik Komputer", semester: 8, status: "aktif" as const },
  { code: "S-005", prodi: "Teknik Informatika", semester: 6, status: "cuti" as const },
  { code: "S-006", prodi: "Teknik Informatika", semester: 7, status: "lulus" as const },
];

describe("resolveProdi", () => {
  it("memetakan penyebutan umum ke nama prodi resmi", () => {
    expect(resolveProdi("Informatika")).toBe("Teknik Informatika");
    expect(resolveProdi("D4 Teknik Informatika")).toBe("Teknik Informatika");
    expect(resolveProdi("Sains Data")).toBe("Sains Data Terapan");
    expect(resolveProdi("data science")).toBe("Sains Data Terapan");
    expect(resolveProdi("Teknik Komputer")).toBe("Teknik Komputer");
    expect(resolveProdi("game")).toBe("Teknologi Game");
    expect(resolveProdi("Teknik Mesin")).toBeNull();
  });
});

describe("checkEligibility", () => {
  it("tanpa syarat tambahan: hanya mahasiswa aktif yang lolos, sisanya punya alasan tertulis (AC-14)", () => {
    const r = checkEligibility(students, { minSemester: null, maxSemester: null, allowedProdi: [] });
    expect(r.eligible).toEqual(["S-001", "S-002", "S-003", "S-004"]);
    expect(r.excluded).toEqual([
      { code: "S-005", reasons: ["Berstatus cuti, bukan mahasiswa aktif"] },
      { code: "S-006", reasons: ["Berstatus lulus, bukan mahasiswa aktif"] },
    ]);
  });

  it("syarat semester minimal dan maksimal", () => {
    const r = checkEligibility(students, { minSemester: 3, maxSemester: 7, allowedProdi: [] });
    expect(r.eligible).toEqual(["S-001", "S-002"]);
    expect(r.excluded.find((e) => e.code === "S-003")!.reasons).toEqual(["Semester 2, syarat minimal semester 3"]);
    expect(r.excluded.find((e) => e.code === "S-004")!.reasons).toEqual(["Semester 8, melebihi batas semester 7"]);
  });

  it("syarat prodi; satu mahasiswa bisa punya beberapa alasan", () => {
    const r = checkEligibility(students, {
      minSemester: 3,
      maxSemester: null,
      allowedProdi: ["Teknik Informatika", "Sains Data Terapan"],
    });
    expect(r.eligible).toEqual(["S-001"]);
    expect(r.excluded.find((e) => e.code === "S-002")!.reasons).toEqual([
      "Prodi Teknologi Game tidak termasuk prodi yang diizinkan (Teknik Informatika, Sains Data Terapan)",
    ]);
    expect(r.excluded.find((e) => e.code === "S-003")!.reasons).toEqual(["Semester 2, syarat minimal semester 3"]);
    expect(r.excluded.find((e) => e.code === "S-006")!.reasons).toEqual(["Berstatus lulus, bukan mahasiswa aktif"]);
  });
});

describe("describeRules", () => {
  it("menulis syarat dalam kalimat siap tampil", () => {
    expect(describeRules({ minSemester: 3, maxSemester: 7, allowedProdi: ["Teknik Informatika"] })).toEqual([
      "Mahasiswa berstatus aktif",
      "Semester 3 sampai 7",
      "Prodi: Teknik Informatika",
    ]);
    expect(describeRules({ minSemester: null, maxSemester: null, allowedProdi: [] })).toEqual([
      "Mahasiswa berstatus aktif",
      "Semua semester",
      "Semua prodi",
    ]);
    expect(describeRules({ minSemester: 4, maxSemester: null, allowedProdi: [] })[1]).toBe("Minimal semester 4");
  });
});
