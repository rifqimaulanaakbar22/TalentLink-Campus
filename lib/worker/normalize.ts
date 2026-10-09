import { getSqlite } from "../db";
import type { Criteria, NormalizedCriteria, Skill } from "../types";

interface Catalog {
  skills: Skill[];
  byKey: Map<string, number>;
  names: Record<number, string>;
}

// Katalog skill hampir tidak pernah berubah; cache di memori sekali per proses.
let cache: Catalog | null = null;

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]/g, "");

export function getSkillCatalog(): Catalog {
  if (cache) return cache;
  const rows = getSqlite().prepare("SELECT id, name, aliases FROM skills ORDER BY id").all() as {
    id: number;
    name: string;
    aliases: string;
  }[];
  const skills = rows.map((r) => ({ id: r.id, name: r.name, aliases: JSON.parse(r.aliases) as string[] }));
  const byKey = new Map<string, number>();
  for (const s of skills) for (const a of [s.name, ...s.aliases]) byKey.set(key(a), s.id);
  cache = { skills, byKey, names: Object.fromEntries(skills.map((s) => [s.id, s.name])) };
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
  // Skill yang sudah wajib tidak dihitung dua kali sebagai tambahan.
  const niceSkillIds = resolve(c.nice_skills).filter((id) => !requiredSkillIds.includes(id));
  return { ...c, requiredSkillIds, niceSkillIds, unknownSkills };
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
