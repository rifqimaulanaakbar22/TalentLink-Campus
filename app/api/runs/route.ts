import { handle, readJson, runInBackground } from "@/lib/http";
import { createRunFromBody, listRuns } from "@/lib/service";

export async function GET() {
  return handle(async () => Response.json(await listRuns()));
}

export async function POST(req: Request) {
  return handle(async () => {
    const res = await createRunFromBody(await readJson(req));
    runInBackground(res.runId);
    return Response.json(res, { status: 201 });
  });
}
