// Helper Route Handler: balasan error seragam { error } dan pipeline di background lewat after().
import { after } from "next/server";
import { ApiError, RunIdSchema, firstIssue } from "./service";
import { runResearchMatching } from "./worker/run";

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "Body permintaan harus berupa JSON yang valid.");
  }
}

export async function runIdFrom(params: Promise<{ id: string }>): Promise<number> {
  const parsed = RunIdSchema.safeParse((await params).id);
  if (!parsed.success) throw new ApiError(400, firstIssue(parsed.error));
  return parsed.data;
}

/** Jalankan handler; ApiError jadi status + pesan, error lain jadi 500 tanpa membocorkan detail. */
export async function handle(fn: () => Response | Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) return Response.json({ error: err.message }, { status: err.status });
    console.error("[api] error tak terduga:", (err as Error).message);
    return Response.json({ error: "Terjadi kesalahan di server. Coba lagi sebentar." }, { status: 500 });
  }
}

/** Pipeline jalan setelah respons terkirim; error sudah ditangani run.ts sebagai langkah failed. */
export function runInBackground(runId: number): void {
  after(async () => {
    const status = await runResearchMatching(runId);
    console.log(`[run ${runId}] selesai: ${status}`);
  });
}
