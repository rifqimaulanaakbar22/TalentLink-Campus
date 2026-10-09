import { authenticate } from "@/lib/auth";
import type { LoginResponse } from "@/lib/auth-types";
import { handlePublic, readJson } from "@/lib/http";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  return handlePublic(async () => {
    const { user, token, expiresAt } = await authenticate(await readJson(req));
    await setSessionCookie(token, expiresAt, new URL(req.url).protocol === "https:");
    return Response.json({ user } satisfies LoginResponse);
  });
}
