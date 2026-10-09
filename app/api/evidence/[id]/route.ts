import { handle } from "@/lib/http";
import { ApiError, EvidenceIdSchema, getEvidence } from "@/lib/service";

export async function GET(_req: Request, ctx: RouteContext<"/api/evidence/[id]">) {
  return handle(async () => {
    const parsed = EvidenceIdSchema.safeParse((await ctx.params).id);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0].message);
    return Response.json(getEvidence(parsed.data));
  });
}
