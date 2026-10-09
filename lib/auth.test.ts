import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Database di memori; tabel dibuat otomatis oleh lib/db.ts.
vi.hoisted(() => {
  process.env.DATABASE_PATH = ":memory:";
  process.env.LLM_MOCK = "true";
});

import { getSqlite } from "./db";
import { seedDatabase } from "./seed";
import { ApiError } from "./service";
import {
  AUTH_MSG,
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  SESSION_TTL_MS,
  authenticate,
  deleteSession,
  ensureDemoUsers,
  getUserBySessionToken,
  hashPassword,
  verifyPassword,
} from "./auth";

const db = () => getSqlite();
const rina = DEMO_ACCOUNTS[0];

async function expectApiError(p: Promise<unknown>, status: number, message?: string) {
  try {
    await p;
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(status);
    if (message) expect((err as ApiError).message).toBe(message);
    return;
  }
  throw new Error(`Seharusnya melempar ApiError ${status}`);
}

beforeEach(async () => {
  db().prepare("DELETE FROM sessions").run();
  db().prepare("DELETE FROM users").run();
  await ensureDemoUsers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("hash kata sandi", () => {
  it("salt acak: kata sandi sama menghasilkan hash berbeda, keduanya terverifikasi", async () => {
    const a = await hashPassword("rahasia-123");
    const b = await hashPassword("rahasia-123");
    expect(a).not.toBe(b);
    expect(a).not.toContain("rahasia-123");
    expect(await verifyPassword("rahasia-123", a)).toBe(true);
    expect(await verifyPassword("rahasia-123", b)).toBe(true);
  });

  it("kata sandi salah atau hash rusak ditolak tanpa melempar error", async () => {
    const h = await hashPassword("rahasia-123");
    expect(await verifyPassword("salah", h)).toBe(false);
    expect(await verifyPassword("rahasia-123", "bukan-hash")).toBe(false);
    expect(await verifyPassword("rahasia-123", "")).toBe(false);
  });
});

describe("akun demo", () => {
  it("dibuat sekali walau dipanggil berulang", async () => {
    await ensureDemoUsers();
    await ensureDemoUsers();
    const n = (db().prepare("SELECT count(*) AS n FROM users").get() as { n: number }).n;
    expect(n).toBe(DEMO_ACCOUNTS.length);
  });

  it("kata sandi tersimpan sebagai hash, bukan teks asli", () => {
    const row = db().prepare("SELECT password_hash FROM users WHERE email = ?").get(rina.email) as { password_hash: string };
    expect(row.password_hash).not.toContain(DEMO_PASSWORD);
  });
});

describe("login", () => {
  it("berhasil dengan email (tanpa peka huruf besar dan spasi) dan kata sandi benar", async () => {
    const res = await authenticate({ email: `  ${rina.email.toUpperCase()} `, password: DEMO_PASSWORD });
    expect(res.user).toMatchObject({ email: rina.email, name: rina.name, role: rina.role });
    expect(res.user).not.toHaveProperty("password_hash");
    expect(res.token.length).toBeGreaterThanOrEqual(40);
    expect(res.expiresAt.getTime() - Date.now()).toBeGreaterThan(SESSION_TTL_MS - 5_000);
  });

  it("token sesi disimpan sebagai hash di database", async () => {
    const { token } = await authenticate({ email: rina.email, password: DEMO_PASSWORD });
    const ids = (db().prepare("SELECT id FROM sessions").all() as { id: string }[]).map((r) => r.id);
    expect(ids).toHaveLength(1);
    expect(ids[0]).not.toBe(token);
  });

  it("kata sandi salah dan email tidak terdaftar memberi pesan yang sama (401)", async () => {
    await expectApiError(authenticate({ email: rina.email, password: "salah-sekali" }), 401, AUTH_MSG.invalid);
    await expectApiError(authenticate({ email: "tidak.ada@kampus.test", password: DEMO_PASSWORD }), 401, AUTH_MSG.invalid);
  });

  it("format email salah atau kata sandi kosong ditolak (400)", async () => {
    await expectApiError(authenticate({ email: "bukan-email", password: DEMO_PASSWORD }), 400);
    await expectApiError(authenticate({ email: rina.email, password: "" }), 400);
    await expectApiError(authenticate(null), 400);
  });
});

describe("sesi", () => {
  it("token valid mengembalikan pengguna; token asing atau kosong tidak", async () => {
    const { token } = await authenticate({ email: rina.email, password: DEMO_PASSWORD });
    expect(getUserBySessionToken(token)).toMatchObject({ email: rina.email });
    expect(getUserBySessionToken("token-palsu")).toBeNull();
    expect(getUserBySessionToken(undefined)).toBeNull();
    expect(getUserBySessionToken("")).toBeNull();
  });

  it("sesi kedaluwarsa ditolak dan dihapus", async () => {
    const { token } = await authenticate({ email: rina.email, password: DEMO_PASSWORD });
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + SESSION_TTL_MS + 1_000);
    expect(getUserBySessionToken(token)).toBeNull();
    expect((db().prepare("SELECT count(*) AS n FROM sessions").get() as { n: number }).n).toBe(0);
  });

  it("logout menghapus sesi sehingga token tidak berlaku lagi", async () => {
    const { token } = await authenticate({ email: rina.email, password: DEMO_PASSWORD });
    deleteSession(token);
    expect(getUserBySessionToken(token)).toBeNull();
    expect(() => deleteSession(undefined)).not.toThrow();
  });

  it("seed ulang data tidak menghapus akun dan sesi", async () => {
    const { token } = await authenticate({ email: rina.email, password: DEMO_PASSWORD });
    seedDatabase(db());
    expect(getUserBySessionToken(token)).toMatchObject({ email: rina.email });
  });
});
