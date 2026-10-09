import { handle, runIdFrom, runInBackground } from "@/lib/http";
import { retryRun } from "@/lib/service";

export async function POST(_req: Request, ctx: RouteContext<"/api/runs/[id]/retry">) {
  return handle(async () => {
    const res = await retryRun(await runIdFrom(ctx.params));
    runInBackground(res.runId);
    return Response.json(res);
  });
}
