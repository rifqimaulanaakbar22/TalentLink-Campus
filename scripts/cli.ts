// npm run cli -- "brief" [--mode v1|v2]
// npm run cli -- --worker jaya --file guidebook.txt   (atau --sample ai-nasional | iot-smart-campus)
import fs from "node:fs";
import { getSqlite } from "../lib/db";
import { getTokenUsage, isMock } from "../lib/llm";
import type { RunMode, RunResult } from "../lib/types";
import { createRun } from "../lib/worker/run";
import { runWorker } from "../lib/worker/dispatch";
import { SAMPLE_GUIDEBOOKS } from "../lib/worker/competition/guidebooks";

function parseArgs(argv: string[]): { brief: string; mode: RunMode; worker: "netra" | "jaya" } {
  let mode: RunMode = "v2";
  let worker: "netra" | "jaya" = "netra";
  let fromFile: string | null = null;
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mode") mode = argv[++i] as RunMode;
    else if (a.startsWith("--mode=")) mode = a.slice(7) as RunMode;
    else if (a === "--worker") worker = argv[++i] as "netra" | "jaya";
    else if (a === "--file") fromFile = fs.readFileSync(argv[++i], "utf8");
    else if (a === "--sample") {
      const id = argv[++i];
      const sample = SAMPLE_GUIDEBOOKS.find((g) => g.id === id);
      if (!sample) throw new Error(`Contoh guidebook tidak dikenal: ${id}. Pilihan: ${SAMPLE_GUIDEBOOKS.map((g) => g.id).join(", ")}`);
      fromFile = sample.text;
      worker = "jaya";
    } else rest.push(a);
  }
  if (mode !== "v1" && mode !== "v2") throw new Error('Mode harus "v1" atau "v2"');
  if (worker !== "netra" && worker !== "jaya") throw new Error('Worker harus "netra" atau "jaya"');
  return { brief: (fromFile ?? rest.join(" ")).trim(), mode, worker };
}

const pad = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s.padEnd(n));

async function main() {
  const { brief, mode, worker } = parseArgs(process.argv.slice(2));
  if (brief.length < 15) {
    console.error('Brief minimal 15 karakter. Contoh: npm run cli -- "Butuh 2 mahasiswa Python dan Computer Vision" --mode v2');
    process.exit(1);
  }

  const db = getSqlite();
  const runId = createRun({ workerId: worker, brief, mode });
  console.log(`Run #${runId} · ${worker} · mode ${worker === "jaya" ? "v2" : mode}${isMock() ? " · LLM_MOCK" : ""}`);
  console.log(`Brief: ${brief.length > 300 ? `${brief.slice(0, 300)}…` : brief}\n`);

  const t0 = Date.now();
  const status = await runWorker(runId);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const steps = db
    .prepare("SELECT step, status, started_at, ended_at, detail FROM run_steps WHERE run_id = ? ORDER BY id")
    .all(runId) as { step: string; status: string; started_at: string; ended_at: string | null; detail: string }[];
  const tokens = db
    .prepare(
      "SELECT step, model, input_tokens AS i, output_tokens AS o, latency_ms AS ms, is_estimate AS est FROM token_ledger WHERE run_id = ? ORDER BY id",
    )
    .all(runId) as { step: string; model: string; i: number; o: number; ms: number; est: number }[];

  console.log("Run Timeline");
  for (const s of steps) {
    const ms = s.ended_at ? new Date(s.ended_at).getTime() - new Date(s.started_at).getTime() : 0;
    console.log(`  [${pad(s.status, 7)}] ${pad(s.step, 9)} ${String(ms).padStart(6)} ms  ${s.detail ?? ""}`);
  }

  const run = db.prepare("SELECT status, result_json, error_message, criteria_json FROM runs WHERE id = ?").get(runId) as {
    status: string;
    result_json: string | null;
    error_message: string | null;
    criteria_json: string | null;
  };

  console.log(`\nStatus: ${status} (${elapsed} detik)`);
  if (status === "failed") console.log(`Error: ${run.error_message}`);
  if (status === "needs_clarification") {
    console.log(`Pertanyaan ${worker === "jaya" ? "Jaya" : "Netra"}: ${JSON.parse(run.criteria_json ?? "{}").question}`);
  }

  if (run.result_json) {
    const r = JSON.parse(run.result_json) as RunResult;
    console.log(`Topik: ${r.topic} · wajib: ${r.requiredSkills.join(", ")}${r.niceSkills.length ? ` · tambahan: ${r.niceSkills.join(", ")}` : ""}`);
    if (r.unknownSkills.length) console.log(`Skill tak dikenal: ${r.unknownSkills.join(", ")}`);
    if (r.competition) {
      const c = r.competition;
      console.log(`Lomba: ${c.competitionName} · tim ${c.teamSize} orang × ${c.teamCount}`);
      console.log(`Syarat: ${c.rules.join(" · ")}`);
      console.log(`Eligibility Check: ${c.eligibleCount} dari ${c.screenedCount} memenuhi syarat; ${c.excluded.length} tersaring`);
      for (const e of c.excluded.slice(0, 6)) console.log(`  ✗ ${e.code}: ${e.reasons.join("; ")}`);
      if (c.excluded.length > 6) console.log(`  … ${c.excluded.length - 6} lainnya`);
      for (const t of c.teams) {
        console.log(`Tim ${t.team}: ${t.members.map((m) => `${m.code} (${m.role}, ${m.roleScore})`).join(", ") || "-"}`);
        if (t.missingRoles.length) console.log(`  Peran belum terisi: ${t.missingRoles.join(", ")}`);
      }
      console.log(`Konflik: ${c.conflicts.length ? "" : "tidak ada"}`);
      for (const k of c.conflicts) console.log(`  ⚠ ${k.message}`);
    } else if (r.noMatch) console.log("Tidak ada kandidat dengan skor ≥ 50 — kandidat terdekat:");
    console.log(`\n  #  ${pad("Kode", 6)} ${pad("Skor", 6)} ${pad("Badge", 30)} Alasan [ID bukti]`);
    r.candidates.forEach((c, i) => {
      const badges = [c.role && `T${c.team} ${c.role}`, c.hiddenTalent && "Hidden Talent", c.fairExposure && "Fair Exposure", c.reasonSource === "template" && "template"]
        .filter(Boolean)
        .join(", ");
      const score = c.score === null ? "-" : c.score.toFixed(1);
      c.reasons.forEach((reason, j) => {
        const lead =
          j === 0 ? `  ${String(i + 1).padStart(1)}  ${pad(c.code, 6)} ${pad(score, 6)} ${pad(badges, 30)}` : " ".repeat(48);
        const ids = reason.evidence_ids.filter((id) => !reason.text.includes(id));
        console.log(`${lead} ${reason.text}${ids.length ? ` [${ids.join(", ")}]` : ""}`);
      });
      if (c.reasons.length === 0) console.log(`  ${i + 1}  ${pad(c.code, 6)} ${pad(score, 6)} ${pad(badges, 30)} -`);
      if (c.missingSkills.length) console.log(`${" ".repeat(48)} Skill kurang: ${c.missingSkills.join(", ")}`);
    });
    console.log(`\nDraf undangan:\n${r.invitationDraft}`);
  }

  const runTotal = tokens.reduce((n, t) => n + t.i + t.o, 0);
  console.log("\nToken Ledger");
  for (const t of tokens) {
    console.log(`  ${pad(t.step, 8)} ${pad(t.model, 18)} in ${t.i}  out ${t.o}  ${t.ms} ms${t.est ? "  (estimasi)" : ""}`);
  }
  const usage = getTokenUsage();
  console.log(`  Total run ini: ${runTotal} token · ${tokens.length} panggilan LLM`);
  console.log(`  Total aplikasi: ${usage.total.toLocaleString("id-ID")} / ${usage.budget.toLocaleString("id-ID")} (${usage.percent}%)${usage.warn ? " — PERINGATAN budget" : ""}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
