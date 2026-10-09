import { handle, readJson, runIdFrom } from "@/lib/http";
import { approveRun } from "@/lib/service";

export async function POST(req: Request, ctx: RouteContext<"/api/runs/[id]/approve">) {
  return handle(async () => Response.json(approveRun(await runIdFrom(ctx.params), await readJson(req))));
}
