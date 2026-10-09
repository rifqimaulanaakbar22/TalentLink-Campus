import { handle, readJson, runIdFrom, runInBackground } from "@/lib/http";
import { clarifyRun } from "@/lib/service";

export async function POST(req: Request, ctx: RouteContext<"/api/runs/[id]/clarify">) {
  return handle(async () => {
    const res = await clarifyRun(await runIdFrom(ctx.params), await readJson(req));
    runInBackground(res.runId);
    return Response.json(res);
  });
}
