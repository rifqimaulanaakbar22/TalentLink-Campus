// Autentikasi email + kata sandi dengan sesi di database.
// Tanpa dependensi baru: hash memakai scrypt bawaan Node, token sesi 32 byte acak.
// Berkas ini tidak bergantung pada Next.js supaya bisa diuji langsung (lib/auth.test.ts);
// lapisan cookie ada di lib/session.ts.
import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { z } from "zod";
import { AUTH_MSG, ROLE_LABEL, SESSION_COOKIE, type AuthUser, type UserRole } from "./auth-types";
import { getSqlite, nowIso } from "./db";
import { ApiError, firstIssue } from "./service";

export { AUTH_MSG, SESSION_COOKIE };
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // satu hari kerja

// ---------- Akun demo (data sintetis) ----------

/** Kata sandi akun demo. Hanya untuk prototipe di localhost; di produksi akun dibuat admin kampus. */
export const DEMO_PASSWORD = "talentlink2026";

export const DEMO_ACCOUNTS: readonly { email: string; name: string; role: UserRole }[] = [
  { email: "rina@kampus.test", name: "Bu Rina", role: "dosen" },
  { email: "andi@kampus.test", name: "Pak Andi", role: "kemahasiswaan" },
];

// ---------- Kata sandi ----------

const SCRYPT = { N: 16_384, r: 8, p: 1, keylen: 64 } as const;

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** Format: scrypt$N$r$p$saltBase64$hashBase64 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const { N, r, p, keylen } = SCRYPT;
  const key = await scryptAsync(password, salt, keylen, { N, r, p });
  return ["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  if (expected.length === 0) return false;
  try {
    const key = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

// Hash pembanding agar email tak terdaftar butuh waktu yang sama dengan kata sandi salah.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("tidak-dipakai-untuk-login"));

// ---------- Pengguna ----------

type UserRow = { id: number; email: string; name: string; role: UserRole; password_hash: string };

const toAuthUser = (u: Pick<UserRow, "id" | "email" | "name" | "role">): AuthUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  roleLabel: ROLE_LABEL[u.role],
});

let demoReady: Promise<void> | null = null;

/** Buat akun demo jika belum ada. Aman dipanggil berulang. */
export function ensureDemoUsers(): Promise<void> {
  const db = getSqlite();
  const missing = DEMO_ACCOUNTS.filter((a) => !db.prepare("SELECT 1 FROM users WHERE email = ?").get(a.email));
  if (missing.length === 0) return Promise.resolve();
  demoReady ??= (async () => {
    const insert = db.prepare(
      "INSERT OR IGNORE INTO users (email, name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
    );
    for (const a of missing) insert.run(a.email, a.name, a.role, await hashPassword(DEMO_PASSWORD), nowIso());
  })().finally(() => {
    demoReady = null;
  });
  return demoReady;
}

// ---------- Login ----------

export const LoginSchema = z.object(
  {
    email: z
      .string({ error: "Email wajib diisi." })
      .trim()
      .toLowerCase()
      .pipe(z.email({ error: "Format email belum benar, contoh: nama@kampus.test." })),
    password: z
      .string({ error: "Kata sandi wajib diisi." })
      .min(1, { error: "Kata sandi wajib diisi." })
      .max(200, { error: "Kata sandi terlalu panjang." }),
  },
  { error: "Isi email dan kata sandi." },
);

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Periksa kredensial lalu buat sesi. Token mentah hanya dikembalikan untuk cookie, di DB disimpan hash-nya. */
export async function authenticate(body: unknown): Promise<{ user: AuthUser; token: string; expiresAt: Date }> {
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, firstIssue(parsed.error));
  const { email, password } = parsed.data;

  await ensureDemoUsers();
  const db = getSqlite();
  const row = db
    .prepare("SELECT id, email, name, role, password_hash FROM users WHERE email = ?")
    .get(email) as UserRow | undefined;

  const ok = await verifyPassword(password, row?.password_hash ?? (await getDummyHash()));
  if (!row || !ok) throw new ApiError(401, AUTH_MSG.invalid);

  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS);
  db.prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
    hashToken(token),
    row.id,
    new Date(now).toISOString(),
    expiresAt.toISOString(),
  );
  db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(new Date(now).toISOString(), row.id);
  // Bersihkan sesi kedaluwarsa milik siapa pun; tabelnya kecil.
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date(now).toISOString());

  return { user: toAuthUser(row), token, expiresAt };
}

// ---------- Sesi ----------

/** Pengguna pemilik token, atau null jika token kosong, tidak dikenal, atau kedaluwarsa. */
export function getUserBySessionToken(token: string | undefined | null): AuthUser | null {
  if (!token) return null;
  const db = getSqlite();
  const id = hashToken(token);
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
    )
    .get(id) as (Omit<UserRow, "password_hash"> & { expires_at: string }) | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    return null;
  }
  return toAuthUser(row);
}

/** Logout: hapus sesi di database. Aman dipanggil tanpa token. */
export function deleteSession(token: string | undefined | null): void {
  if (!token) return;
  getSqlite().prepare("DELETE FROM sessions WHERE id = ?").run(hashToken(token));
}
