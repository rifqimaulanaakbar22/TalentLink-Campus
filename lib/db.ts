// Akses database lewat @libsql/client. Lokal memakai file SQLite (data/talentlink.db);
// jika TURSO_DATABASE_URL diisi (misalnya di Vercel), memakai Turso. SQL-nya sama karena Turso = SQLite.
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";

// DDL disimpan di sini agar tabel dibuat otomatis saat database pertama kali dibuka,
// tanpa langkah migrasi terpisah. Harus selaras dengan lib/schema.ts.
const DDL = `
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  prodi TEXT NOT NULL,
  semester INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('aktif','cuti','lulus')),
  active_commitments INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_students_status_semester ON students(status, semester);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  aliases TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  type TEXT NOT NULL CHECK (type IN ('course','project','certificate','award','assistant','research')),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  grade TEXT CHECK (grade IN ('A','B','C')),
  year INTEGER NOT NULL,
  source_label TEXT NOT NULL DEFAULT 'Sintetis'
);
CREATE INDEX IF NOT EXISTS idx_evidence_student ON evidence(student_id);

CREATE TABLE IF NOT EXISTS evidence_skills (
  evidence_id TEXT NOT NULL REFERENCES evidence(id),
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  strength INTEGER NOT NULL CHECK (strength BETWEEN 1 AND 3),
  PRIMARY KEY (evidence_id, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_evidence_skills_skill ON evidence_skills(skill_id, evidence_id);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY,
  worker_id TEXT NOT NULL,
  skill TEXT NOT NULL,
  mode TEXT NOT NULL,
  brief_text TEXT NOT NULL,
  criteria_json TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  result_json TEXT,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_created ON runs(created_at);

CREATE TABLE IF NOT EXISTS run_steps (
  id INTEGER PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES runs(id),
  step TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running','done','failed','skipped')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_run_steps_run ON run_steps(run_id, id);

CREATE TABLE IF NOT EXISTS token_ledger (
  id INTEGER PRIMARY KEY,
  run_id INTEGER REFERENCES runs(id),
  step TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  is_estimate INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_token_ledger_run ON token_ledger(run_id);

CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES runs(id),
  candidate_ids TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL,
  message_draft TEXT,
  sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_approvals_run ON approvals(run_id, id);

-- Autentikasi (fitur login). Tidak disentuh seed, sehingga akun dan sesi bertahan saat seed ulang.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('dosen','kemahasiswaan')),
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`;

export const DATABASE_PATH = process.env.DATABASE_PATH || "data/talentlink.db";

function databaseUrl(): string {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  if (DATABASE_PATH === ":memory:") return ":memory:";
  const file = path.resolve(/*turbopackIgnore: true*/ DATABASE_PATH);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return `file:${file}`;
}

export type Arg = string | number | bigint | boolean | null;
export type Row = Record<string, unknown>;
export interface Statement {
  sql: string;
  args?: Arg[];
}
export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

/** Antarmuka kecil di atas libSQL. Semua method async karena Turso diakses lewat jaringan. */
export interface Db {
  get<T = Row>(sql: string, ...args: Arg[]): Promise<T | undefined>;
  all<T = Row>(sql: string, ...args: Arg[]): Promise<T[]>;
  run(sql: string, ...args: Arg[]): Promise<RunResult>;
  /** Beberapa statement dalam satu transaksi tulis (satu kali jalan ke server Turso). */
  batch(statements: Statement[]): Promise<{ changes: number; rows: Row[] }[]>;
}

/** Baris libSQL diubah menjadi objek biasa {kolom: nilai}. */
function plainRows(columns: string[], rows: ArrayLike<unknown>[]): Row[] {
  return rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]])));
}

function wrap(client: Client): Db {
  return {
    async get<T>(sql: string, ...args: Arg[]) {
      const r = await client.execute({ sql, args });
      return plainRows(r.columns, r.rows)[0] as T | undefined;
    },
    async all<T>(sql: string, ...args: Arg[]) {
      const r = await client.execute({ sql, args });
      return plainRows(r.columns, r.rows) as T[];
    },
    async run(sql: string, ...args: Arg[]) {
      const r = await client.execute({ sql, args });
      return { changes: r.rowsAffected, lastInsertRowid: Number(r.lastInsertRowid ?? 0) };
    },
    async batch(statements: Statement[]) {
      const rs = await client.batch(
        statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
        "write",
      );
      return rs.map((r) => ({ changes: r.rowsAffected, rows: plainRows(r.columns, r.rows) }));
    },
  };
}

async function open(): Promise<Db> {
  const client = createClient({ url: databaseUrl(), authToken: process.env.TURSO_AUTH_TOKEN });
  // Untuk file lokal: tegakkan foreign key (ON DELETE CASCADE di sessions). Turso mengaturnya sendiri.
  if (!process.env.TURSO_DATABASE_URL) await client.execute("PRAGMA foreign_keys = ON");
  await client.executeMultiple(DDL);
  return wrap(client);
}

// Satu klien per proses; disimpan di globalThis agar hot reload Next tidak membuka koneksi baru.
const g = globalThis as unknown as { __tlDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  g.__tlDb ??= open().catch((err) => {
    g.__tlDb = undefined; // jangan simpan kegagalan; coba lagi di panggilan berikutnya
    throw err;
  });
  return g.__tlDb;
}

/** Hanya untuk test: tutup dan lupakan koneksi agar database berikutnya dibuka ulang. */
export function resetDbForTests(): void {
  g.__tlDb = undefined;
}

export function nowIso(): string {
  return new Date().toISOString();
}
