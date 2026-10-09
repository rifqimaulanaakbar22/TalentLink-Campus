import { handle, readJson, runIdFrom } from "@/lib/http";
import { approveRun } from "@/lib/service";

export async function POST(req: Request, ctx: RouteContext<"/api/runs/[id]/approve">) {
  // Jejak audit: keputusan dicatat atas nama pengguna yang login.
  return handle(async (user) =>
    Response.json(approveRun(await runIdFrom(ctx.params), await readJson(req), `${user.name} (${user.roleLabel})`)),
  );
}
