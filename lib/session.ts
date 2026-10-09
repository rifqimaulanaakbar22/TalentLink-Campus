// Lapisan cookie sesi untuk Next.js (Server Component, Route Handler).
// Validasi sesi yang sebenarnya selalu ke database lewat lib/auth.ts;
// proxy.ts hanya melakukan pengecekan cepat keberadaan cookie.
import { cache } from "react";
import { cookies } from "next/headers";
import type { AuthUser } from "./auth-types";
import { SESSION_COOKIE, getUserBySessionToken } from "./auth";

/** Pengguna yang sedang login untuk request ini, atau null. Di-cache per request. */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getUserBySessionToken(token);
});

/** Hanya boleh dipanggil di Route Handler atau Server Function. */
export async function setSessionCookie(token: string, expiresAt: Date, secure: boolean): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: expiresAt,
  });
}

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
