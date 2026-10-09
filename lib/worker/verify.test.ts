import { describe, it, expect, vi } from "vitest";
import { verifyExplanations, templateReason, type PackageCandidate, type Explanation } from "./verify";

const pkg: PackageCandidate[] = [
  {
    code: "S-101",
    evidence: [
      { id: "EV-010", type: "project", title: "Deteksi Objek Kendaraan", grade: null },
      { id: "EV-011", type: "course", title: "Pengolahan Citra", grade: "A" },
    ],
  },
  {
    code: "S-104",
    evidence: [{ id: "EV-020", type: "assistant", title: "Asisten Praktikum Pengolahan Citra", grade: null }],
  },
];

function explanation(c: Explanation["candidates"]): Explanation {
  return { candidates: c, invitation_draft: "Halo, kami mengundang Anda." };
}

describe("verifyExplanations", () => {
  it("alasan valid dipertahankan tanpa retry", async () => {
    const retry = vi.fn();
    const res = await verifyExplanations({
      pkg,
      explanation: explanation([
        { code: "S-101", reasons: [{ text: "Proyek deteksi objek", evidence_ids: ["EV-010"] }], gaps: [] },
        { code: "S-104", reasons: [{ text: "Asisten praktikum", evidence_ids: ["EV-020"] }], gaps: ["NLP"] },
      ]),
      retry,
    });
    expect(retry).not.toHaveBeenCalled();
    expect(res.dropped).toBe(0);
    expect(res.candidates.map((c) => c.reasonSource)).toEqual(["llm", "llm"]);
    expect(res.candidates[1].gaps).toEqual(["NLP"]);
    expect(res.invitationDraft).toBe("Halo, kami mengundang Anda.");
  });

  it("alasan dengan ID palsu dibuang", async () => {
    const res = await verifyExplanations({
      pkg,
      explanation: explanation([
        {
          code: "S-101",
          reasons: [
            { text: "Valid", evidence_ids: ["EV-010"] },
            { text: "Palsu", evidence_ids: ["EV-999"] },
            { text: "Campuran", evidence_ids: ["EV-011", "EV-998"] },
            { text: "Tanpa bukti", evidence_ids: [] },
          ],
          gaps: [],
        },
        { code: "S-104", reasons: [{ text: "Asisten", evidence_ids: ["EV-020"] }], gaps: [] },
      ]),
    });
    expect(res.candidates[0].reasons.map((r) => r.text)).toEqual(["Valid"]);
    expect(res.dropped).toBe(3);
  });

  it("ID milik kandidat lain ditolak", async () => {
    const res = await verifyExplanations({
      pkg,
      explanation: explanation([
        { code: "S-101", reasons: [{ text: "Valid", evidence_ids: ["EV-010"] }], gaps: [] },
        { code: "S-104", reasons: [{ text: "Curi bukti", evidence_ids: ["EV-010"] }], gaps: [] },
      ]),
    });
    expect(res.candidates[1].reasons.every((r) => !r.evidence_ids.includes("EV-010"))).toBe(true);
    expect(res.dropped).toBe(1);
  });

  it("kandidat tanpa alasan valid memicu retry sekali hanya untuk kandidat itu", async () => {
    const retry = vi.fn(async (codes: string[]) => {
      expect(codes).toEqual(["S-104"]);
      return explanation([{ code: "S-104", reasons: [{ text: "Asisten praktikum", evidence_ids: ["EV-020"] }], gaps: [] }]);
    });
    const res = await verifyExplanations({
      pkg,
      explanation: explanation([
        { code: "S-101", reasons: [{ text: "Valid", evidence_ids: ["EV-010"] }], gaps: [] },
        { code: "S-104", reasons: [{ text: "Palsu", evidence_ids: ["EV-777"] }], gaps: [] },
      ]),
      retry,
    });
    expect(retry).toHaveBeenCalledTimes(1);
    expect(res.retried).toBe(true);
    expect(res.candidates[1].reasons).toEqual([{ text: "Asisten praktikum", evidence_ids: ["EV-020"] }]);
    expect(res.candidates[1].reasonSource).toBe("llm");
    expect(res.templated).toEqual([]);
  });

  it("retry yang masih palsu jatuh ke template dari bukti terbaik", async () => {
    const retry = vi.fn(async () =>
      explanation([{ code: "S-104", reasons: [{ text: "Masih palsu", evidence_ids: ["EV-555"] }], gaps: [] }]),
    );
    const res = await verifyExplanations({
      pkg,
      explanation: explanation([
        { code: "S-101", reasons: [{ text: "Valid", evidence_ids: ["EV-010"] }], gaps: [] },
        { code: "S-104", reasons: [{ text: "Palsu", evidence_ids: ["EV-777"] }], gaps: [] },
      ]),
      retry,
    });
    expect(retry).toHaveBeenCalledTimes(1);
    expect(res.templated).toEqual(["S-104"]);
    expect(res.candidates[1].reasonSource).toBe("template");
    expect(res.candidates[1].reasons).toEqual([
      { text: "Menjadi Asisten Praktikum Pengolahan Citra [EV-020]", evidence_ids: ["EV-020"] },
    ]);
  });

  it("tanpa kesempatan retry (batas 3 panggilan) langsung template", async () => {
    const res = await verifyExplanations({
      pkg,
      explanation: explanation([{ code: "S-101", reasons: [{ text: "Palsu", evidence_ids: ["EV-1"] }], gaps: [] }]),
    });
    expect(res.retried).toBe(false);
    expect(res.templated).toEqual(["S-101", "S-104"]);
    expect(res.candidates[0].reasons[0]).toEqual({
      text: "Mengerjakan proyek Deteksi Objek Kendaraan [EV-010]",
      evidence_ids: ["EV-010"],
    });
  });

  it("explain gagal total (null) dan retry gagal: semua kandidat memakai template", async () => {
    const res = await verifyExplanations({ pkg, explanation: null, retry: async () => null });
    expect(res.retried).toBe(true);
    expect(res.templated).toEqual(["S-101", "S-104"]);
    expect(res.invitationDraft).toBeNull();
  });

  it("urutan kandidat mengikuti paket, bukan jawaban LLM", async () => {
    const res = await verifyExplanations({
      pkg,
      explanation: explanation([
        { code: "S-104", reasons: [{ text: "A", evidence_ids: ["EV-020"] }], gaps: [] },
        { code: "S-101", reasons: [{ text: "B", evidence_ids: ["EV-010"] }], gaps: [] },
        { code: "S-999", reasons: [{ text: "Penyusup", evidence_ids: ["EV-010"] }], gaps: [] },
      ]),
    });
    expect(res.candidates.map((c) => c.code)).toEqual(["S-101", "S-104"]);
  });
});

describe("templateReason", () => {
  it("menyesuaikan kalimat dengan tipe bukti", () => {
    expect(templateReason({ id: "EV-1", type: "course", title: "Pengolahan Citra", grade: "A" }).text).toBe(
      "Lulus mata kuliah Pengolahan Citra dengan nilai A [EV-1]",
    );
    expect(templateReason({ id: "EV-2", type: "certificate", title: "Sertifikat OpenCV", grade: null }).text).toBe(
      "Memiliki Sertifikat OpenCV [EV-2]",
    );
  });
});
