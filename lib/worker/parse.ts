import { z } from "zod";
import { callLLM, type CallLLMResult } from "../llm";
import type { Criteria } from "../types";
import { catalogForPrompt, findOutOfCatalogInText, findSkillsInText } from "./normalize";

export const CriteriaSchema = z.object({
  needs_clarification: z.boolean().default(false),
  question: z.string().nullable().default(null),
  topic: z.string().default(""),
  required_skills: z.array(z.string()).default([]),
  nice_skills: z.array(z.string()).default([]),
  min_semester: z.coerce.number().int().min(1).max(14).nullable().default(null),
  count: z.coerce.number().int().min(1).max(20).catch(3),
  unknown_skills: z.array(z.string()).default([]),
});

const SYSTEM = `Kamu adalah Research Talent Officer. Ubah permintaan dosen menjadi JSON sesuai skema.
Jika permintaan tidak menyebut topik atau skill yang konkret, isi needs_clarification=true
dan tulis satu pertanyaan singkat. Jangan menebak skill yang tidak disebut.
Jika skill yang disebut sama artinya dengan salah satu nama di KATALOG (lihat juga sinonim di dalam kurung),
tulis persis nama katalog itu (contoh: "web developer" -> "Web Frontend" atau "Backend"; "CV" atau
"pengolahan citra" -> "Computer Vision").
Skill yang disebut tetapi tidak ada padanannya di KATALOG JANGAN dibuang dan JANGAN ditanyakan balik:
tulis di unknown_skills. Jika brief menyebut skill, needs_clarification harus false.
Teks setelah "Jawaban klarifikasi:" adalah jawaban dosen atas pertanyaanmu; gabungkan dengan permintaan awal.
Pertanyaan klarifikasi ditulis dalam bahasa sehari-hari untuk dosen; jangan menyebut JSON, skema, katalog, atau nama field.
Jawab hanya dengan JSON, tanpa teks lain.

SKEMA: {
  "needs_clarification": boolean,
  "question": string | null,
  "topic": string,
  "required_skills": string[],
  "nice_skills": string[],
  "min_semester": number | null,
  "count": number,
  "unknown_skills": string[]
}`;

/** Mock deterministik: skill dicari dari katalog alias di teks brief. */
function mockParse(brief: string): string {
  const skills = findSkillsInText(brief);
  const unknown = findOutOfCatalogInText(brief);
  if (skills.length === 0 && unknown.length === 0) {
    return JSON.stringify({
      needs_clarification: true,
      question: "Topik riset atau skill apa yang Bapak/Ibu butuhkan?",
      topic: "",
      required_skills: [],
      nice_skills: [],
      min_semester: null,
      count: 3,
    });
  }
  const count = Number(/(\d+)\s*(?:orang\s*)?mahasiswa/i.exec(brief)?.[1] ?? 3);
  const sem = /semester\s*(?:minimal\s*|>=?\s*)?(\d+)/i.exec(brief)?.[1];
  return JSON.stringify({
    needs_clarification: false,
    question: null,
    topic: brief.replace(/\s+/g, " ").trim().slice(0, 120),
    required_skills: skills,
    nice_skills: [],
    min_semester: sem ? Number(sem) : null,
    count,
    unknown_skills: unknown,
  });
}

export async function parseBrief(runId: number, brief: string): Promise<CallLLMResult<Criteria>> {
  return callLLM({
    runId,
    step: "parse",
    model: process.env.CBN_MODEL_PARSE || "qwen3.8-flash",
    messages: [
      { role: "system", content: `${SYSTEM}\n\nKATALOG: ${catalogForPrompt()}` },
      { role: "user", content: brief },
    ],
    schema: CriteriaSchema,
    mock: () => mockParse(brief),
  });
}
