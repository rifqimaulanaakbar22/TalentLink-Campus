// Pilih pipeline sesuai worker pemilik run.
import { getDb } from "../db";
import type { RunStatus } from "../types";
import { runResearchMatching } from "./run";
import { runCompetitionMatching } from "./competition/run";

export async function runWorker(runId: number): Promise<RunStatus> {
  const row = await (await getDb()).get<{ worker_id: string }>("SELECT worker_id FROM runs WHERE id = ?", runId);
  return row?.worker_id === "jaya" ? runCompetitionMatching(runId) : runResearchMatching(runId);
}
