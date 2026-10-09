import type { MeResponse } from "@/lib/auth-types";
import { handle } from "@/lib/http";

export async function GET() {
  return handle((user) => Response.json({ user } satisfies MeResponse));
}
