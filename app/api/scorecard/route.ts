import { handle } from "@/lib/http";
import { getScorecard } from "@/lib/service";

export async function GET() {
  return handle(() => Response.json(getScorecard()));
}
