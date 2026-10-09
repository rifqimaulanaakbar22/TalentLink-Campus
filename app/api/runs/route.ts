import { handle, readJson, runInBackground } from "@/lib/http";
import { createRunFromBody, listRuns } from "@/lib/service";

export async function GET() {
  return handle(() => Response.json(listRuns()));
}

export async function POST(req: Request) {
  return handle(async () => {
    const res = createRunFromBody(await readJson(req));
    runInBackground(res.runId);
    return Response.json(res, { status: 201 });
  });
}
