import { handle } from "@/lib/http";
import { getWorkers } from "@/lib/service";

export async function GET() {
  return handle(() => Response.json(getWorkers()));
}
