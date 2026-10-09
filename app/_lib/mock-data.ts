// Data skenario mode mock. Kandidat, skor, badge, bukti, dan teks jejak kerja
// DIBANGKITKAN dari pipeline backend asli (lib/worker, LLM_MOCK=true) pada seed standar,
// lalu disimpan di mock-fixtures.json. Cara membangkitkan ulang: docs/penyesuaian-mockup-audit.md.
// Hanya topik dan draf undangan yang diringkas, meniru keluaran LLM parse asli.
import raw from "./mock-fixtures.json";
import type { EvidenceDetail, RunResult, StepName, StepStatus } from "./types";

export type ScenarioKey = "cv" | "iot" | "nlp" | "lowmatch" | "unknown" | "clarify";

export interface ScenarioStep {
  step: StepName;
  status: StepStatus;
  detail: string;
}

export interface Scenario {
  result: Omit<RunResult, "mode" | "budgetWarning">;
  steps: ScenarioStep[];
}

type RawScenario = { result: Scenario["result"]; steps: ScenarioStep[] };
const rawScenarios = raw.scenarios as unknown as Record<"cv" | "iot" | "nlp" | "lowmatch", RawScenario>;

export const EVIDENCE = raw.evidence as unknown as Record<string, EvidenceDetail>;
export const ACTIVE_STUDENTS: number = raw.activeStudents;

/** Topik ringkas seperti yang ditulis LLM parse; mock parse backend memakai brief utuh. */
const TOPIC: Record<keyof typeof rawScenarios, string> = {
  cv: "Deteksi objek dengan Computer Vision",
  iot: "Pemantauan kualitas air berbasis IoT",
  nlp: "Analisis sentimen dengan NLP",
  lowmatch: "Riset gabungan Unity, NLP, ESP32, dan Public Speaking",
};

function withTopic(key: keyof typeof rawScenarios): Scenario {
  const s = structuredClone(rawScenarios[key]);
  const from = s.result.topic;
  const to = TOPIC[key];
  s.result.topic = to;
  s.result.invitationDraft = s.result.invitationDraft.split(from).join(to);
  s.steps = s.steps.map((st) => ({ ...st, detail: st.detail.split(from).join(to) }));
  return s;
}

/** Skill di luar katalog: mengikuti jalur kode run.ts (0 kandidat, explain dilewati). */
function unknownScenario(skill: string): Scenario {
  const topic = `Riset ${skill}`;
  return {
    result: {
      topic,
      requiredSkills: [],
      niceSkills: [],
      unknownSkills: [skill],
      noMatch: true,
      candidates: [],
      invitationDraft:
        `Yth. [Nama Mahasiswa],\n\nKami sedang menyiapkan riset "${topic}" dan melihat pengalaman Anda relevan. ` +
        `Apakah Anda bersedia berdiskusi lebih lanjut minggu ini?\n\nSalam,\n[Nama Dosen]`,
    },
    steps: [
      { step: "parse", status: "done", detail: `Netra memahami brief: topik "${topic}", skill wajib ${skill}, butuh 3 orang.` },
      { step: "normalize", status: "done", detail: `Netra memetakan 0 skill ke katalog. Tidak dikenal di katalog: ${skill}.` },
      { step: "search", status: "done", detail: `Netra menelusuri ${ACTIVE_STUDENTS} profil aktif dan menemukan 0 kandidat dengan bukti relevan.` },
      { step: "score", status: "done", detail: "Netra tidak menemukan kandidat untuk dinilai." },
      { step: "explain", status: "skipped", detail: "Netra tidak punya kandidat untuk dijelaskan." },
      { step: "verify", status: "done", detail: "Netra memeriksa sitasi: 0 alasan siap, 0 dibuang karena ID bukti tidak valid." },
      { step: "brief", status: "done", detail: "Netra tidak menemukan kandidat dengan skor ≥ 50; 0 kandidat terdekat disiapkan. Menunggu keputusan dosen." },
    ],
  };
}

export const CLARIFY_QUESTION = "Topik riset atau skill apa yang Bapak/Ibu butuhkan?";

export const CLARIFY_SCENARIO: ScenarioStep[] = [
  { step: "parse", status: "done", detail: `Netra butuh klarifikasi: ${CLARIFY_QUESTION}` },
];

export function getScenario(key: Exclude<ScenarioKey, "clarify">, unknown: string | null): Scenario {
  return key === "unknown" ? unknownScenario(unknown ?? "Skill tidak dikenal") : withTopic(key);
}

/** Cocokkan kata utuh, supaya "deteksi" tidak terbaca sebagai "teks". */
const has = (text: string, words: string[]) =>
  words.some((w) => new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(text));

/** Tebak skenario dari isi brief, meniru hasil parse LLM untuk mode mock. */
export function pickScenario(brief: string): { key: ScenarioKey; unknown: string | null } {
  const t = brief.toLowerCase();
  const unknownWords: [string, string][] = [
    ["blockchain", "Blockchain"],
    ["solidity", "Solidity"],
    ["kuantum", "Komputasi Kuantum"],
    ["quantum", "Komputasi Kuantum"],
    ["rust", "Rust"],
  ];
  const unknown = unknownWords.find(([w]) => has(t, [w]));
  if (unknown) return { key: "unknown", unknown: unknown[1] };
  if (has(t, ["unity", "public speaking"])) return { key: "lowmatch", unknown: null };
  if (has(t, ["computer vision", "cv", "citra", "deteksi objek", "objek", "kamera", "gambar", "deep learning"]))
    return { key: "cv", unknown: null };
  if (has(t, ["iot", "esp32", "embedded", "sensor", "mikrokontroler"])) return { key: "iot", unknown: null };
  if (has(t, ["nlp", "sentimen", "teks", "bahasa alami", "chatbot"])) return { key: "nlp", unknown: null };
  if (has(t, ["python"])) return { key: "cv", unknown: null };
  return { key: "clarify", unknown: null };
}

export const EXAMPLE_BRIEFS = [
  "Saya butuh 2 mahasiswa yang kuat Python dan Computer Vision untuk riset deteksi objek di jalan raya semester ini.",
  "Cari 2 mahasiswa untuk riset IoT pemantauan kualitas air dengan ESP32, minimal semester 5.",
  "Butuh asisten riset NLP untuk analisis sentimen ulasan aplikasi kampus. Bisa Python lebih baik.",
];
