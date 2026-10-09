import { handle, runIdFrom } from "@/lib/http";
import { getRunDetail } from "@/lib/service";

export async function GET(_req: Request, ctx: RouteContext<"/api/runs/[id]">) {
  return handle(async () => Response.json(getRunDetail(await runIdFrom(ctx.params))));
}
