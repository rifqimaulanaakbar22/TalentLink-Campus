import { getDb } from "../db";
import type { Criteria, NormalizedCriteria, Skill } from "../types";

interface Catalog {
  skills: Skill[];
  byKey: Map<string, number>;
  names: Record<number, string>;
}

// Katalog skill hampir tidak pernah berubah; cache di memori sekali per proses.
let cache: Catalog | null = null;

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]/g, "");

/** Muat katalog ke memori (sekali per proses). Panggil sebelum fungsi katalog lain di bawah. */
export async function loadSkillCatalog(): Promise<Catalog> {
  if (cache) return cache;
  const rows = await (await getDb()).all<{ id: number; name: string; aliases: string }>(
    "SELECT id, name, aliases FROM skills ORDER BY id",
  );
  const skills = rows.map((r) => ({ id: r.id, name: r.name, aliases: JSON.parse(r.aliases) as string[] }));
  const byKey = new Map<string, number>();
  for (const s of skills) for (const a of [s.name, ...s.aliases]) byKey.set(key(a), s.id);
  cache = { skills, byKey, names: Object.fromEntries(skills.map((s) => [s.id, s.name])) };
  return cache;
}

/** Katalog dari memori. Pipeline memanggil loadSkillCatalog() di awal, jadi di sini tinggal dibaca. */
export function getSkillCatalog(): Catalog {
  if (!cache) throw new Error("Katalog skill belum dimuat; panggil loadSkillCatalog() lebih dulu.");
  return cache;
}

/** Dipakai seed/test agar katalog dibaca ulang setelah database diisi ulang. */
export function resetSkillCache(): void {
  cache = null;
}

/** Nama skill -> skill_id (case-insensitive). Cocok persis dulu, lalu frasa yang memuat alias (≥ 4 huruf). */
export function resolveSkill(name: string): number | null {
  const { byKey, skills } = getSkillCatalog();
  const k = key(name);
  if (!k) return null;
  const exact = byKey.get(k);
  if (exact) return exact;
  // Contoh: "Python programming" -> Python, "pengolahan citra digital" -> Computer Vision.
  let best: { id: number; len: number } | null = null;
  for (const s of skills) {
    for (const a of [s.name, ...s.aliases]) {
      const ak = key(a);
      if (ak.length >= 4 && k.includes(ak) && (!best || ak.length > best.len)) best = { id: s.id, len: ak.length };
    }
  }
  return best?.id ?? null;
}

export function normalizeCriteria(c: Criteria): NormalizedCriteria {
  const unknownSkills: string[] = [];
  const resolve = (names: string[]) => {
    const ids: number[] = [];
    for (const n of names) {
      const id = resolveSkill(n);
      if (id === null) unknownSkills.push(n);
      else if (!ids.includes(id)) ids.push(id);
    }
    return ids;
  };
  const requiredSkillIds = resolve(c.required_skills);
  const unknownRequired = [...unknownSkills];
  // Skill yang sudah wajib tidak dihitung dua kali sebagai tambahan.
  const niceSkillIds = resolve(c.nice_skills).filter((id) => !requiredSkillIds.includes(id));
  // Skill di luar katalog yang dilaporkan parse dianggap wajib: dosen menyebutnya secara eksplisit.
  for (const s of c.unknown_skills ?? []) {
    if (resolveSkill(s) !== null) continue;
    if (!unknownRequired.some((u) => u.toLowerCase() === s.toLowerCase())) unknownRequired.push(s);
    if (!unknownSkills.some((u) => u.toLowerCase() === s.toLowerCase())) unknownSkills.push(s);
  }
  return { ...c, requiredSkillIds, niceSkillIds, unknownSkills, unknownRequired };
}

/** Baris katalog untuk prompt: nama skill beserta alias, agar singkatan seperti "CV" dikenali. */
export function catalogForPrompt(): string {
  return getSkillCatalog()
    .skills.map((s) => (s.aliases.length ? `${s.name} (${s.aliases.slice(0, 4).join(", ")})` : s.name))
    .join("; ");
}

// Hanya untuk mock (LLM_MOCK=true): contoh skill yang sengaja tidak ada di katalog.
const MOCK_OUT_OF_CATALOG = ["blockchain", "smart contract", "quantum computing", "solidity", "kriptografi kuantum"];

/** Mock parse: skill di luar katalog yang disebut di teks. LLM asli melaporkannya lewat unknown_skills. */
export function findOutOfCatalogInText(text: string): string[] {
  const lower = text.toLowerCase();
  return MOCK_OUT_OF_CATALOG.filter((s) => lower.includes(s));
}

/** Skill dari katalog yang disebut di teks bebas (dipakai mock parse). */
export function findSkillsInText(text: string): string[] {
  const { skills } = getSkillCatalog();
  const lower = ` ${text.toLowerCase().replace(/[^a-z0-9+#/ ]/g, " ")} `;
  const found: string[] = [];
  for (const s of skills) {
    const hit = [s.name, ...s.aliases].some((a) => {
      const al = a.toLowerCase().replace(/[^a-z0-9+#/ ]/g, " ").trim();
      return al.length >= 2 && lower.includes(` ${al} `);
    });
    if (hit) found.push(s.name);
  }
  return found;
}
