import { handle, runIdFrom } from "@/lib/http";
import { sendInvitation } from "@/lib/service";

// Pengiriman SIMULASI: hanya mengisi sent_at, tidak ada email/WA sungguhan.
export async function POST(_req: Request, ctx: RouteContext<"/api/runs/[id]/send">) {
  return handle(async () => Response.json(sendInvitation(await runIdFrom(ctx.params))));
}
