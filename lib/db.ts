import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

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
`;

export const DATABASE_PATH = process.env.DATABASE_PATH || "data/talentlink.db";

function open(): Database.Database {
  if (DATABASE_PATH !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(/*turbopackIgnore: true*/ DATABASE_PATH)), { recursive: true });
  }
  const conn = new Database(DATABASE_PATH);
  // Mode jurnal DELETE, bukan WAL: server dev, CLI, dan seed sering membuka file yang sama.
  // Di mode WAL, proses yang menutup koneksi bisa menghapus -wal/-shm yang masih dipakai server
  // sehingga server gagal dengan "database disk image is malformed". Untuk skala MVP tidak ada beda kinerja.
  conn.pragma("journal_mode = DELETE");
  conn.pragma("foreign_keys = ON");
  conn.pragma("busy_timeout = 5000");
  conn.exec(DDL);
  return conn;
}

// Satu koneksi per proses; disimpan di globalThis agar hot reload Next tidak membuka koneksi baru.
const g = globalThis as unknown as { __tlSqlite?: Database.Database; __tlDb?: BetterSQLite3Database<typeof schema> };

export function getSqlite(): Database.Database {
  if (!g.__tlSqlite) g.__tlSqlite = open();
  return g.__tlSqlite;
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!g.__tlDb) g.__tlDb = drizzle(getSqlite(), { schema });
  return g.__tlDb;
}

export function nowIso(): string {
  return new Date().toISOString();
}
