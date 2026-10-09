import { handle } from "@/lib/http";
import { getWorkers } from "@/lib/service";

export async function GET() {
  return handle(async () => Response.json(await getWorkers()));
}
