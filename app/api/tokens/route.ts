import { handle } from "@/lib/http";
import { getTokenReport } from "@/lib/tokens";

export async function GET() {
  return handle(() => Response.json(getTokenReport()));
}
