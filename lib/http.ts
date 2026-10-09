// Helper Route Handler: balasan error seragam { error }, cek login, dan pipeline di background lewat after().
import { after } from "next/server";
import { AUTH_MSG, type AuthUser } from "./auth-types";
import { ApiError, RunIdSchema, firstIssue } from "./service";
import { getCurrentUser } from "./session";
import { runWorker } from "./worker/dispatch";

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

async function respond(fn: () => Response | Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) return Response.json({ error: err.message }, { status: err.status });
    console.error("[api] error tak terduga:", (err as Error).message);
    return Response.json({ error: "Terjadi kesalahan di server. Coba lagi sebentar." }, { status: 500 });
  }
}

/**
 * Jalankan handler yang butuh login. Tanpa sesi valid: 401.
 * ApiError jadi status + pesan, error lain jadi 500 tanpa membocorkan detail.
 */
export async function handle(fn: (user: AuthUser) => Response | Promise<Response>): Promise<Response> {
  return respond(async () => {
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, AUTH_MSG.needLogin);
    return fn(user);
  });
}

/** Handler tanpa cek login (hanya untuk login dan logout). */
export async function handlePublic(fn: () => Response | Promise<Response>): Promise<Response> {
  return respond(fn);
}

/** Pipeline jalan setelah respons terkirim; error sudah ditangani run.ts sebagai langkah failed. */
export function runInBackground(runId: number): void {
  after(async () => {
    const status = await runWorker(runId);
    console.log(`[run ${runId}] selesai: ${status}`);
  });
}
