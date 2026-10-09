import { deleteSession } from "@/lib/auth";
import { handlePublic } from "@/lib/http";
import { clearSessionCookie, readSessionToken } from "@/lib/session";

/** Selalu berhasil: sesi di database dihapus (jika ada) dan cookie dibersihkan. */
export async function POST() {
  return handlePublic(async () => {
    await deleteSession(await readSessionToken());
    await clearSessionCookie();
    return Response.json({ ok: true });
  });
}
