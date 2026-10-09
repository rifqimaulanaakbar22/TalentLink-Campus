// Pilih pipeline sesuai worker pemilik run.
import { getSqlite } from "../db";
import type { RunStatus } from "../types";
import { runResearchMatching } from "./run";
import { runCompetitionMatching } from "./competition/run";

export async function runWorker(runId: number): Promise<RunStatus> {
  const row = getSqlite().prepare("SELECT worker_id FROM runs WHERE id = ?").get(runId) as { worker_id: string } | undefined;
  return row?.worker_id === "jaya" ? runCompetitionMatching(runId) : runResearchMatching(runId);
}
